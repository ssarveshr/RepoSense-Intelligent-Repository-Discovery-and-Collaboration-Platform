import pytest

from src.services.meeting_service import MeetingService


@pytest.mark.asyncio
async def test_resolve_meeting_by_short_code(async_session):
    from src.models.meeting import MeetingCreate

    service = MeetingService(async_session)
    created = await service.create_meeting(
        MeetingCreate(title="Resolve Test", host_display_name="Host"),
        host_clerk_user_id="user_resolve",
    )

    resolved = await service.resolve_meeting(created.short_code.replace("-", ""))
    assert resolved is not None
    assert resolved.id == created.id

    resolved_spaced = await service.resolve_meeting(created.short_code)
    assert resolved_spaced is not None
    assert resolved_spaced.id == created.id
