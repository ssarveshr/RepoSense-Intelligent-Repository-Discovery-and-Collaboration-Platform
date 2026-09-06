import pytest

from src.models.meeting import MeetingCreate, MeetingStatus
from src.services.meeting_service import MeetingService


@pytest.mark.asyncio
async def test_meeting_service_create_and_fetch(async_session):
    service = MeetingService(async_session)
    payload = MeetingCreate(
        title="Architecture Review",
        host_display_name="Taylor",
        passcode="secret123",
        max_participants=6,
    )

    created = await service.create_meeting(
        payload,
        host_clerk_user_id="user_test_host",
        host_display_name="Taylor",
    )
    assert created.id
    assert created.short_code
    assert created.title == "Architecture Review"
    assert created.status == MeetingStatus.scheduled.value
    assert len(created.participants) == 1

    by_id = await service.get_meeting(created.id)
    assert by_id is not None
    assert by_id.id == created.id

    by_code = await service.get_meeting_by_short_code(created.short_code)
    assert by_code is not None
    assert by_code.id == created.id


@pytest.mark.asyncio
async def test_meeting_service_passcode_hashing(async_session):
    service = MeetingService(async_session)
    created = await service.create_meeting(
        MeetingCreate(title="Secure Room", host_display_name="Host", passcode="room-pass"),
        host_clerk_user_id="user_test_host",
        host_display_name="Host",
    )

    meeting_row = await service.repository.get_meeting_by_id(created.id)
    assert meeting_row.passcode_hash is not None
    assert meeting_row.passcode_hash != "room-pass"
    assert service.verify_passcode("room-pass", meeting_row.passcode_hash)
    assert not service.verify_passcode("wrong-pass", meeting_row.passcode_hash)


@pytest.mark.asyncio
async def test_meeting_service_end_meeting(async_session):
    service = MeetingService(async_session)
    created = await service.create_meeting(
        MeetingCreate(title="Daily Standup", host_display_name="Host"),
        host_clerk_user_id="user_test_host",
        host_display_name="Host",
    )

    ended = await service.end_meeting(created.id, host_clerk_user_id="user_test_host")
    assert ended is not None
    assert ended.status == MeetingStatus.ended.value
    assert ended.ended_at is not None

    active = await service.list_active_meetings()
    assert all(m.id != created.id for m in active)


@pytest.mark.asyncio
async def test_meeting_service_get_missing_returns_none(async_session):
    service = MeetingService(async_session)
    assert await service.get_meeting("non-existent-id") is None
    assert await service.end_meeting("non-existent-id", host_clerk_user_id="user_test_host") is None
