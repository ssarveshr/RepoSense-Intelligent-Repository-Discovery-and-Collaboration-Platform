from fastapi import APIRouter, Depends, HTTPException, Query

from src.api.deps.clerk_auth import ClerkUser, require_clerk_user
from src.config.settings import settings
from src.integrations.github import GitHubAnalyzer

router = APIRouter(prefix="/api/collaboration", tags=["collaboration"])


@router.get("/collaborators")
async def list_repository_collaborators(
    github_url: str = Query(..., min_length=10, description="Full GitHub repository URL"),
    _clerk_user: ClerkUser = Depends(require_clerk_user),
) -> dict:
    """Return GitHub collaborators for the configured repository (emails when publicly available)."""
    if "github.com/" not in github_url:
        raise HTTPException(status_code=400, detail="Invalid GitHub repository URL")

    analyzer = GitHubAnalyzer(github_token=settings.github_token)
    try:
        collaborators = analyzer.list_collaborators(github_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Unable to reach GitHub.") from exc

    return {
        "github_url": github_url,
        "count": len(collaborators),
        "collaborators": collaborators,
    }
