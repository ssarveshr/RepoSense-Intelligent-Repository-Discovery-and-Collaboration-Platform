from fastapi import HTTPException

from src.integrations.github import GitHubApiError
from src.services.github_connection_service import GitHubConnectionExpiredError, GitHubNotConnectedError


def structured_github_detail(exc: GitHubApiError) -> dict:
    detail = {
        "code": exc.code or "GITHUB_API_ERROR",
        "message": exc.message,
    }
    if exc.code in {"GITHUB_SCOPE_REQUIRED", "GITHUB_CONNECTION_EXPIRED"}:
        detail["reconnect_required"] = True
    return detail


def raise_github_http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, GitHubNotConnectedError):
        return HTTPException(
            status_code=exc.status_code,
            detail={
                "code": "GITHUB_NOT_CONNECTED",
                "message": exc.message,
                "reconnect_required": True,
            },
        )
    if isinstance(exc, GitHubConnectionExpiredError):
        return HTTPException(
            status_code=exc.status_code,
            detail={
                "code": "GITHUB_CONNECTION_EXPIRED",
                "message": exc.message,
                "reconnect_required": True,
            },
        )
    if isinstance(exc, GitHubApiError):
        return HTTPException(status_code=exc.status_code, detail=structured_github_detail(exc))
    return HTTPException(status_code=502, detail={"code": "GITHUB_API_ERROR", "message": "Unable to reach GitHub."})
