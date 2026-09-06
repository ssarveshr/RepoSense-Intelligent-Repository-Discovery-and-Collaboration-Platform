from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.github_http_errors import raise_github_http_error
from src.api.deps.clerk_auth import ClerkUser, require_clerk_user
from src.config.settings import settings
from src.db import get_session
from src.integrations.github import GitHubApiError
from src.models.github_connection import GitHubConnectionResponse
from src.services.github_connection_service import (
    GitHubConnectionExpiredError,
    GitHubConnectionService,
    GitHubNotConnectedError,
)
from src.integrations.github_errors import GITHUB_OAUTH_SCOPES
from src.services.github_oauth_service import GitHubOAuthError, GitHubOAuthService
from src.utils.github_collaborator_utils import annotate_collaborators_with_host
from src.utils.github_diagnostics import log_github_precheck_denied, log_github_repositories_request
from src.utils.github_oauth_diagnostics import log_github_oauth_stage

router = APIRouter(prefix="/api/github", tags=["github"])


async def get_github_connection_service(
    session: AsyncSession = Depends(get_session),
) -> GitHubConnectionService:
    return GitHubConnectionService(session)


async def get_github_oauth_service(
    connection_service: GitHubConnectionService = Depends(get_github_connection_service),
) -> GitHubOAuthService:
    return GitHubOAuthService(connection_service)


def _handle_github_errors(exc: Exception) -> HTTPException:
    return raise_github_http_error(exc)


@router.get("/oauth/authorize")
async def github_oauth_authorize(
    clerk_user: ClerkUser = Depends(require_clerk_user),
    oauth_service: GitHubOAuthService = Depends(get_github_oauth_service),
) -> dict:
    try:
        authorization_url = await oauth_service.create_authorization_url(clerk_user.user_id)
    except GitHubOAuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return {"authorization_url": authorization_url, "scope": GITHUB_OAUTH_SCOPES}


@router.get("/oauth/callback")
async def github_oauth_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    oauth_service: GitHubOAuthService = Depends(get_github_oauth_service),
):
    success_url = f"{settings.frontend_base_url.rstrip('/')}/zoom-meeting?github_oauth=success"
    error_url = f"{settings.frontend_base_url.rstrip('/')}/zoom-meeting?github_oauth=error"
    try:
        connection = await oauth_service.handle_callback(code=code, state=state, error=error)
        if not connection.connected or connection.github_user is None:
            log_github_oauth_stage("callback_failed", failure_reason="connection_not_verified_after_save")
            return RedirectResponse(error_url, status_code=302)
    except GitHubOAuthError as exc:
        log_github_oauth_stage("callback_failed", failure_reason="github_oauth_error", error_message=exc.message)
        return RedirectResponse(error_url, status_code=302)
    except Exception as exc:
        log_github_oauth_stage("callback_failed", failure_reason="unexpected_error", error_type=type(exc).__name__)
        return RedirectResponse(error_url, status_code=302)
    return RedirectResponse(success_url, status_code=302)


@router.get("/connection", response_model=GitHubConnectionResponse)
async def get_github_connection(
    clerk_user: ClerkUser = Depends(require_clerk_user),
    connection_service: GitHubConnectionService = Depends(get_github_connection_service),
) -> GitHubConnectionResponse:
    return await connection_service.get_connection_response(clerk_user.user_id)


@router.delete("/connection")
async def disconnect_github_connection(
    clerk_user: ClerkUser = Depends(require_clerk_user),
    connection_service: GitHubConnectionService = Depends(get_github_connection_service),
) -> dict:
    await connection_service.disconnect(clerk_user.user_id)
    return {"connected": False}


@router.get("/repositories")
async def list_github_repositories(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=30, ge=1, le=100),
    clerk_user: ClerkUser = Depends(require_clerk_user),
    connection_service: GitHubConnectionService = Depends(get_github_connection_service),
) -> dict:
    try:
        repositories, has_more = await connection_service.run_with_analyzer(
            clerk_user.user_id,
            lambda analyzer: analyzer.list_authenticated_user_repositories(page=page, per_page=per_page),
        )
    except GitHubNotConnectedError as exc:
        log_github_repositories_request(
            clerk_user_id=clerk_user.user_id,
            outcome="not_connected",
        )
        raise _handle_github_errors(exc) from exc
    except GitHubConnectionExpiredError as exc:
        log_github_repositories_request(
            clerk_user_id=clerk_user.user_id,
            outcome="connection_expired",
        )
        raise _handle_github_errors(exc) from exc
    except GitHubApiError as exc:
        log_github_repositories_request(
            clerk_user_id=clerk_user.user_id,
            outcome="github_api_error",
            github_status=exc.status_code,
            github_code=exc.code,
        )
        raise _handle_github_errors(exc) from exc
    except Exception as exc:
        log_github_repositories_request(
            clerk_user_id=clerk_user.user_id,
            outcome="unexpected_error",
            error_type=type(exc).__name__,
        )
        raise HTTPException(status_code=502, detail="Unable to load GitHub repositories.") from exc

    log_github_repositories_request(
        clerk_user_id=clerk_user.user_id,
        outcome="success",
        repository_count=len(repositories),
    )
    return {
        "repositories": repositories,
        "page": page,
        "per_page": per_page,
        "has_more": has_more,
    }


@router.get("/repositories/{owner}/{repo}/collaborators")
async def get_repository_collaborators(
    owner: str,
    repo: str,
    clerk_user: ClerkUser = Depends(require_clerk_user),
    connection_service: GitHubConnectionService = Depends(get_github_connection_service),
) -> dict:
    owner_clean = owner.strip()
    repo_clean = repo.strip().removesuffix(".git")
    if not owner_clean or not repo_clean:
        raise HTTPException(status_code=400, detail="Invalid repository path.")

    def _fetch(analyzer):
        repository = analyzer.get_repository(owner_clean, repo_clean)
        collaborators = analyzer.list_collaborators_for_repo(owner_clean, repo_clean)
        return repository, collaborators

    try:
        repository, collaborators = await connection_service.run_with_analyzer(clerk_user.user_id, _fetch)
    except GitHubNotConnectedError as exc:
        log_github_precheck_denied(
            clerk_user_id=clerk_user.user_id,
            repository=f"{owner_clean}/{repo_clean}",
            denial_code="GITHUB_NOT_CONNECTED",
            denial_message=exc.message,
        )
        raise _handle_github_errors(exc) from exc
    except (GitHubConnectionExpiredError, GitHubApiError) as exc:
        raise _handle_github_errors(exc) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
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
        "repository": repository,
        "collaborators": annotated_collaborators,
        "count": len(annotated_collaborators),
        "inviteable_count": inviteable_count,
        "github_url": repository["url"],
    }


@router.get("/user")
async def get_authenticated_github_profile(
    clerk_user: ClerkUser = Depends(require_clerk_user),
    connection_service: GitHubConnectionService = Depends(get_github_connection_service),
) -> dict:
    connection = await connection_service.get_connection_response(clerk_user.user_id)
    if not connection.connected or connection.github_user is None:
        return {"connected": False}

    github_login = connection.github_user.login

    def _fetch(analyzer):
        profile = analyzer.get_user_profile(github_login)
        repositories = analyzer.list_user_repositories(github_login, limit=8)
        activity = analyzer.list_user_public_events(github_login, limit=10)
        languages = analyzer.summarize_languages_from_repositories(repositories)
        return profile, repositories, activity, languages

    try:
        profile, repositories, activity, languages = await connection_service.run_with_analyzer(
            clerk_user.user_id,
            _fetch,
        )
    except (GitHubConnectionExpiredError, GitHubApiError) as exc:
        raise _handle_github_errors(exc) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Unable to load GitHub data.") from exc

    return {
        "connected": True,
        "github_username": github_login,
        "profile": profile,
        "repositories": repositories,
        "activity": activity,
        "languages": languages,
        "total_repositories": profile.get("publicRepos", len(repositories)),
    }
