from fastapi import Header, HTTPException

from src.config.settings import settings


async def require_meeting_create_key(
    x_meeting_api_key: str | None = Header(default=None, alias="X-Meeting-Api-Key"),
) -> None:
    """Optional API key gate for meeting creation (Phase 9)."""
    if not settings.meeting_create_api_key:
        return
    if x_meeting_api_key != settings.meeting_create_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing meeting API key")
