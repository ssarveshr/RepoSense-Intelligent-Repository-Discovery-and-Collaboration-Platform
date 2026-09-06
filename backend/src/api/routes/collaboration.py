import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps.clerk_auth import ClerkUser, require_clerk_user
from src.api.github_http_errors import raise_github_http_error
from src.db import get_session
from src.integrations.github import GitHubAnalyzer, GitHubApiError
from src.services.github_connection_service import (
    GitHubConnectionExpiredError,
    GitHubConnectionService,
    GitHubNotConnectedError,
)
from src.utils.github_collaborator_utils import annotate_collaborators_with_host
from src.utils.github_diagnostics import log_github_diagnostic, log_github_precheck_denied

logger = logging.getLogger("reposense.collaboration")

router = APIRouter(prefix="/api/collaboration", tags=["collaboration"])


async def get_github_connection_service(
    session: AsyncSession = Depends(get_session),
) -> GitHubConnectionService:
    return GitHubConnectionService(session)


def _parse_github_repository_url(github_url: str) -> tuple[str, str]:
    analyzer = GitHubAnalyzer()
    try:
        owner, repo = analyzer.extract_repo_info(github_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return owner, repo


def _log_collaborators_request(
    *,
    clerk_user_id: str,
    owner: str,
    repo: str,
    github_connection_exists: bool,
    github_token_exists: bool,
    github_login: str | None,
) -> None:
    safe_payload = {
        "operation": "collaboration_collaborators",
        "clerk_user_id": clerk_user_id,
        "parsed_owner": owner,
        "parsed_repo": repo,
        "repository": f"{owner}/{repo}",
        "github_connection_exists": github_connection_exists,
        "github_token_exists": github_token_exists,
        "github_login": github_login,
    }
    logger.info("[Collaboration] collaborators request %s", safe_payload)
    log_github_diagnostic(safe_payload)


def _log_collaborators_failure(
    *,
    clerk_user_id: str,
    owner: str,
    repo: str,
    failure_type: str,
    failure_message: str,
    upstream_status: int | None = None,
) -> None:
    safe_payload = {
        "operation": "collaboration_collaborators",
        "clerk_user_id": clerk_user_id,
        "parsed_owner": owner,
        "parsed_repo": repo,
        "repository": f"{owner}/{repo}",
        "failure_type": failure_type,
        "failure_message": failure_message,
        "upstream_github_status": upstream_status,
    }
    logger.warning("[Collaboration] collaborators failed %s", safe_payload)
    log_github_diagnostic(safe_payload)


@router.get("/collaborators")
async def list_repository_collaborators(
    github_url: str = Query(..., min_length=10, description="Full GitHub repository URL"),
    clerk_user: ClerkUser = Depends(require_clerk_user),
    connection_service: GitHubConnectionService = Depends(get_github_connection_service),
) -> dict:
    """Return GitHub collaborators for a repository using the authenticated user's GitHub OAuth token."""
    if "github.com/" not in github_url:
        raise HTTPException(status_code=400, detail="Invalid GitHub repository URL")

    owner, repo = _parse_github_repository_url(github_url)
    repository_slug = f"{owner}/{repo}"

    connection = await connection_service.get_connection_response(clerk_user.user_id)
    github_login = connection.github_user.login if connection.github_user else None
    _log_collaborators_request(
        clerk_user_id=clerk_user.user_id,
        owner=owner,
        repo=repo,
        github_connection_exists=connection.connected,
        github_token_exists=connection.connected,
        github_login=github_login,
    )

    def _fetch(analyzer):
        repository = analyzer.get_repository(owner, repo)
        collaborators = analyzer.list_collaborators_for_repo(owner, repo)
        return repository, collaborators

    try:
        repository, collaborators = await connection_service.run_with_analyzer(clerk_user.user_id, _fetch)
    except GitHubNotConnectedError as exc:
        _log_collaborators_failure(
            clerk_user_id=clerk_user.user_id,
            owner=owner,
            repo=repo,
            failure_type="GITHUB_NOT_CONNECTED",
            failure_message=exc.message,
        )
        log_github_precheck_denied(
            clerk_user_id=clerk_user.user_id,
            repository=repository_slug,
            denial_code="GITHUB_NOT_CONNECTED",
            denial_message=exc.message,
        )
        raise raise_github_http_error(exc) from exc
    except GitHubConnectionExpiredError as exc:
        _log_collaborators_failure(
            clerk_user_id=clerk_user.user_id,
            owner=owner,
            repo=repo,
            failure_type="GITHUB_CONNECTION_EXPIRED",
            failure_message=exc.message,
        )
        raise raise_github_http_error(exc) from exc
    except GitHubApiError as exc:
        _log_collaborators_failure(
            clerk_user_id=clerk_user.user_id,
            owner=owner,
            repo=repo,
            failure_type=exc.code or "GITHUB_API_ERROR",
            failure_message=exc.message,
            upstream_status=exc.status_code,
        )
        raise raise_github_http_error(exc) from exc
    except ValueError as exc:
        _log_collaborators_failure(
            clerk_user_id=clerk_user.user_id,
            owner=owner,
            repo=repo,
            failure_type="VALIDATION_ERROR",
            failure_message=str(exc),
        )
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        _log_collaborators_failure(
            clerk_user_id=clerk_user.user_id,
            owner=owner,
            repo=repo,
            failure_type="UNEXPECTED_ERROR",
            failure_message=type(exc).__name__,
        )
        raise HTTPException(status_code=502, detail="Unable to reach GitHub.") from exc

    connection = await connection_service.get_connection_response(clerk_user.user_id)
    host_github_user_id = connection.github_user.id if connection.github_user else None
    host_github_login = connection.github_user.login if connection.github_user else None
    annotated_collaborators = annotate_collaborators_with_host(
        collaborators,
        host_github_user_id=host_github_user_id,
        host_github_login=host_github_login,
    )
    inviteable_count = sum(1 for item in annotated_collaborators if not item.get("is_current_user"))

    return {
        "github_url": repository.get("url") or github_url,
        "repository": repository,
        "collaborators": annotated_collaborators,
        "count": len(annotated_collaborators),
        "inviteable_count": inviteable_count,
    }
