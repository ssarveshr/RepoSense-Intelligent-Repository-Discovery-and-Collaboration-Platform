import json
import logging

from src.config.settings import settings

logger = logging.getLogger("reposense.github")


def github_diagnostics_enabled() -> bool:
    return bool(settings.github_diagnostics)


def _emit_diagnostic(payload: dict) -> None:
    safe_payload = {key: value for key, value in payload.items() if value is not None}
    message = json.dumps(safe_payload, sort_keys=True)
    logger.warning("[GitHub Diagnostics] %s", message)


def log_github_diagnostic(payload: dict) -> None:
    if not github_diagnostics_enabled():
        return
    _emit_diagnostic(payload)


def log_github_precheck_denied(
    *,
    clerk_user_id: str | None = None,
    github_login: str | None = None,
    repository: str,
    denial_code: str,
    denial_message: str,
    oauth_scopes: list[str] | None = None,
    repository_owner_type: str | None = None,
    repository_visibility: str | None = None,
    repository_permission: str | None = None,
) -> None:
    if not github_diagnostics_enabled():
        return
    _emit_diagnostic(
        {
            "denial_source": "PRECHECK DENIED",
            "clerk_user": clerk_user_id,
            "github_login": github_login,
            "repository": repository,
            "denial_code": denial_code,
            "denial_message": denial_message,
            "oauth_scopes": oauth_scopes,
            "repository_owner_type": repository_owner_type,
            "repository_visibility": repository_visibility,
            "repository_permission": repository_permission,
        }
    )


def log_github_api_denied(payload: dict) -> None:
    if not github_diagnostics_enabled():
        return
    _emit_diagnostic({"denial_source": "GITHUB API DENIED", **payload})
