import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import requests

from src.config.settings import settings
from src.integrations.github_errors import GITHUB_OAUTH_SCOPES
from src.models.github_connection import GitHubConnectionResponse
from src.services.github_connection_service import GitHubConnectionService
from src.utils.github_oauth_diagnostics import log_github_oauth_callback_summary, log_github_oauth_stage
from src.utils.token_crypto import TokenEncryptionError


class GitHubOAuthError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class GitHubOAuthService:
    AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
    TOKEN_URL = "https://github.com/login/oauth/access_token"
    USER_URL = "https://api.github.com/user"

    def __init__(self, connection_service: GitHubConnectionService):
        self.connection_service = connection_service
        self.repository = connection_service.repository

    def _ensure_oauth_configured(self) -> None:
        if not settings.github_client_id or not settings.github_client_secret:
            raise GitHubOAuthError("GitHub OAuth is not configured on the server.", 503)
        if not settings.github_oauth_redirect_uri:
            raise GitHubOAuthError("GitHub OAuth redirect URI is not configured.", 503)
        if not settings.github_token_encryption_key:
            raise GitHubOAuthError("GitHub token encryption is not configured.", 503)

    async def create_authorization_url(self, clerk_user_id: str) -> str:
        self._ensure_oauth_configured()
        state = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        await self.repository.create_oauth_state(state=state, clerk_user_id=clerk_user_id, expires_at=expires_at)

        params = {
            "client_id": settings.github_client_id,
            "redirect_uri": settings.github_oauth_redirect_uri,
            "scope": GITHUB_OAUTH_SCOPES,
            "state": state,
            "allow_signup": "true",
        }
        return f"{self.AUTHORIZE_URL}?{urlencode(params)}"

    async def handle_callback(
        self,
        *,
        code: str | None,
        state: str | None,
        error: str | None,
    ) -> GitHubConnectionResponse:
        log_github_oauth_stage("callback_started")
        self._ensure_oauth_configured()

        if error:
            log_github_oauth_stage("callback_failed", failure_reason="github_authorization_denied")
            raise GitHubOAuthError("GitHub authorization was denied.", 403)
        if not code or not state:
            log_github_oauth_stage(
                "callback_failed",
                failure_reason="missing_callback_parameters",
                oauth_code_present=bool(code),
                oauth_state_present=bool(state),
            )
            raise GitHubOAuthError("Missing GitHub OAuth callback parameters.", 400)

        oauth_state = await self.repository.consume_oauth_state(state)
        if oauth_state is None:
            log_github_oauth_stage("callback_failed", failure_reason="invalid_or_expired_state", state_validated=False)
            raise GitHubOAuthError("Invalid or expired GitHub OAuth state.", 400)

        clerk_user_id = oauth_state.clerk_user_id
        log_github_oauth_stage(
            "state_validated",
            state_validated=True,
            clerk_user_present=bool(clerk_user_id),
            clerk_user_id=clerk_user_id,
        )

        token_payload = self._exchange_code_for_token(code)
        access_token = token_payload.get("access_token")
        if not access_token:
            log_github_oauth_stage("callback_failed", failure_reason="missing_access_token", token_exchange_succeeded=False)
            raise GitHubOAuthError("GitHub did not return an access token.", 502)
        log_github_oauth_stage("token_exchange_succeeded", token_exchange_succeeded=True)

        github_user = self._fetch_github_user(access_token)
        login = github_user.get("login")
        github_user_id = github_user.get("id")
        if not login or github_user_id is None:
            log_github_oauth_stage("callback_failed", failure_reason="missing_github_login", github_user_succeeded=False)
            raise GitHubOAuthError("GitHub user profile is missing a login.", 502)
        log_github_oauth_stage(
            "github_user_succeeded",
            github_user_succeeded=True,
            github_login=login,
            github_user_id=str(github_user_id),
        )

        try:
            saved = await self.connection_service.save_connection(
                clerk_user_id=clerk_user_id,
                github_user_id=str(github_user_id),
                github_login=login,
                github_name=github_user.get("name"),
                github_avatar_url=github_user.get("avatar_url"),
                access_token=access_token,
                token_type=token_payload.get("token_type") or "bearer",
                scope=token_payload.get("scope"),
            )
        except TokenEncryptionError as exc:
            log_github_oauth_stage(
                "callback_failed",
                failure_reason="token_encryption_failed",
                token_encryption_succeeded=False,
                github_login=login,
            )
            raise GitHubOAuthError("GitHub token encryption failed.", 503) from exc
        except RuntimeError as exc:
            log_github_oauth_stage(
                "callback_failed",
                failure_reason="database_save_failed",
                database_write_succeeded=False,
                github_login=login,
            )
            raise GitHubOAuthError("Failed to persist GitHub connection.", 500) from exc

        log_github_oauth_stage(
            "database_write_succeeded",
            token_encryption_succeeded=True,
            database_write_succeeded=True,
            github_login=login,
            connection_id=saved.github_user.id if saved.github_user else None,
        )

        verified = await self.connection_service.verify_persisted_connection(clerk_user_id)
        if not verified.connected or verified.github_user is None:
            log_github_oauth_stage(
                "callback_failed",
                failure_reason="persistence_verification_failed",
                database_commit_succeeded=False,
                github_login=login,
            )
            raise GitHubOAuthError("Failed to persist GitHub connection.", 500)

        log_github_oauth_callback_summary(
            state_valid=True,
            clerk_user_present=True,
            token_exchange=True,
            github_user=True,
            token_encryption=True,
            database_write=True,
            database_commit=True,
            github_login=verified.github_user.login,
            clerk_user_id=clerk_user_id,
            redirecting_to_frontend=True,
        )
        return verified

    def _exchange_code_for_token(self, code: str) -> dict:
        response = requests.post(
            self.TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": settings.github_oauth_redirect_uri,
            },
            timeout=15,
        )
        if response.status_code != 200:
            log_github_oauth_stage(
                "callback_failed",
                failure_reason="token_exchange_http_error",
                token_exchange_succeeded=False,
                http_status=response.status_code,
            )
            raise GitHubOAuthError("Failed to exchange GitHub authorization code.", 502)
        payload = response.json()
        if payload.get("error"):
            log_github_oauth_stage(
                "callback_failed",
                failure_reason="token_exchange_error_response",
                token_exchange_succeeded=False,
            )
            raise GitHubOAuthError("GitHub authorization failed.", 403)
        return payload

    def _fetch_github_user(self, access_token: str) -> dict:
        response = requests.get(
            self.USER_URL,
            headers={
                "Accept": "application/vnd.github+json",
                "User-Agent": "RepoSense-OAuth",
                "Authorization": f"Bearer {access_token}",
            },
            timeout=15,
        )
        if response.status_code != 200:
            log_github_oauth_stage(
                "callback_failed",
                failure_reason="github_user_http_error",
                github_user_succeeded=False,
                http_status=response.status_code,
            )
            raise GitHubOAuthError("Unable to load GitHub user profile.", 502)
        return response.json()
