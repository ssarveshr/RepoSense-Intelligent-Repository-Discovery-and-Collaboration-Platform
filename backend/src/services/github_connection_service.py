from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import settings
from src.integrations.github import GitHubAnalyzer, GitHubApiError
from src.models.github_connection import GitHubConnectionResponse, GitHubUserPublic
from src.integrations.github_errors import evaluate_permissions_status, parse_scope_header
from src.repositories.github_connection_repository import GitHubConnectionRepository
from src.utils.token_crypto import TokenEncryptionError, decrypt_github_token, encrypt_github_token


class GitHubNotConnectedError(Exception):
    def __init__(self, message: str = "Connect your GitHub account to access repositories."):
        self.message = message
        self.status_code = 403
        super().__init__(message)


class GitHubConnectionExpiredError(Exception):
    def __init__(self, message: str = "Your GitHub connection has expired. Please reconnect GitHub."):
        self.message = message
        self.status_code = 401
        super().__init__(message)


class GitHubConnectionService:
    def __init__(self, session: AsyncSession):
        self.repository = GitHubConnectionRepository(session)

    def _connection_response_from_row(self, connection) -> GitHubConnectionResponse:
        scopes = parse_scope_header(connection.scope)
        return GitHubConnectionResponse(
            connected=True,
            github_user=GitHubUserPublic(
                id=connection.github_user_id,
                login=connection.github_login,
                name=connection.github_name,
                avatar_url=connection.github_avatar_url,
            ),
            scope=connection.scope,
            scopes=scopes,
            permissions_status=evaluate_permissions_status(scopes),
        )

    async def get_connection_response(self, clerk_user_id: str) -> GitHubConnectionResponse:
        connection = await self.repository.get_by_clerk_user_id(clerk_user_id)
        if connection is None:
            return GitHubConnectionResponse(connected=False)
        return self._connection_response_from_row(connection)

    async def verify_persisted_connection(self, clerk_user_id: str) -> GitHubConnectionResponse:
        connection = await self.repository.get_by_clerk_user_id(clerk_user_id)
        if connection is None:
            return GitHubConnectionResponse(connected=False)
        if not connection.access_token_encrypted or not connection.github_login:
            return GitHubConnectionResponse(connected=False)
        return self._connection_response_from_row(connection)

    async def get_github_login(self, clerk_user_id: str) -> str | None:
        connection = await self.repository.get_by_clerk_user_id(clerk_user_id)
        if connection is None:
            return None
        return connection.github_login

    async def disconnect(self, clerk_user_id: str) -> None:
        await self.repository.delete_by_clerk_user_id(clerk_user_id)

    async def save_connection(
        self,
        *,
        clerk_user_id: str,
        github_user_id: str,
        github_login: str,
        github_name: str | None,
        github_avatar_url: str | None,
        access_token: str,
        token_type: str,
        scope: str | None,
    ) -> GitHubConnectionResponse:
        if not settings.github_token_encryption_key:
            raise RuntimeError("GitHub token encryption is not configured.")

        encrypted = encrypt_github_token(access_token, settings.github_token_encryption_key)
        connection = await self.repository.upsert_connection(
            clerk_user_id=clerk_user_id,
            github_user_id=str(github_user_id),
            github_login=github_login,
            github_name=github_name,
            github_avatar_url=github_avatar_url,
            access_token_encrypted=encrypted,
            token_type=token_type or "bearer",
            scope=scope,
        )
        return self._connection_response_from_row(connection)

    async def get_access_token(self, clerk_user_id: str) -> str:
        connection = await self.repository.get_by_clerk_user_id(clerk_user_id)
        if connection is None:
            raise GitHubNotConnectedError()

        if not settings.github_token_encryption_key:
            raise RuntimeError("GitHub token encryption is not configured.")

        try:
            return decrypt_github_token(connection.access_token_encrypted, settings.github_token_encryption_key)
        except TokenEncryptionError as exc:
            await self.repository.delete_by_clerk_user_id(clerk_user_id)
            raise GitHubConnectionExpiredError() from exc

    async def get_analyzer(self, clerk_user_id: str) -> GitHubAnalyzer:
        connection = await self.repository.get_by_clerk_user_id(clerk_user_id)
        if connection is None:
            raise GitHubNotConnectedError()

        token = await self.get_access_token(clerk_user_id)
        await self.repository.touch_last_used(clerk_user_id)
        return GitHubAnalyzer(
            github_token=token,
            github_login=connection.github_login,
            granted_scopes=parse_scope_header(connection.scope),
        )

    async def run_with_analyzer(self, clerk_user_id: str, operation):
        try:
            analyzer = await self.get_analyzer(clerk_user_id)
            return operation(analyzer)
        except GitHubApiError as exc:
            if exc.status_code == 401:
                await self.repository.delete_by_clerk_user_id(clerk_user_id)
                raise GitHubConnectionExpiredError() from exc
            raise
