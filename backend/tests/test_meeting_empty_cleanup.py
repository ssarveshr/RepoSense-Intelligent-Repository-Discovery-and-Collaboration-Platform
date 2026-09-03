import pytest

from src.config import settings
from src.models.meeting import MeetingCreate, MeetingStatus
from src.repositories.meeting_repository import MeetingRepository
from src.services.meeting_service import MeetingJoinError, MeetingService


class FakeTokenService:
    livekit_url = "wss://test.livekit.cloud"

    def mint_join_token(self, *, room_name, participant_id, participant_display_name):
        return f"fake-token:{room_name}:{participant_id}:{participant_display_name}"


@pytest.mark.asyncio
async def test_never_joined_meeting_not_deleted_immediately(async_session, monkeypatch):
    monkeypatch.setattr(settings, "empty_meeting_grace_seconds", 30)
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Empty lobby", host_display_name="Host"),
        host_display_name="Host",
    )

    meeting = await service.get_meeting(created.id)
    assert meeting.status in (MeetingStatus.scheduled.value, MeetingStatus.active.value)

    ended = await service.cleanup_empty_meetings()
    assert ended == 0

    meeting = await service.get_meeting(created.id)
    assert meeting.status != MeetingStatus.ended.value


@pytest.mark.asyncio
async def test_never_joined_meeting_cleaned_after_grace(async_session, zero_empty_grace):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Stale lobby", host_display_name="Host"),
        host_display_name="Host",
    )

    ended = await service.cleanup_empty_meetings()
    assert ended == 1

    meeting = await service.get_meeting(created.id)
    assert meeting.status == MeetingStatus.ended.value


@pytest.mark.asyncio
async def test_host_joined_meeting_not_treated_as_empty(async_session, zero_empty_grace):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Solo host", host_display_name="Host"),
        host_display_name="Host",
    )
    await service.join_meeting(
        created.id,
        "Host",
        token_service=FakeTokenService(),
    )

    ended = await service.cleanup_empty_meetings()
    assert ended == 0

    meeting = await service.get_meeting(created.id)
    assert meeting.status != MeetingStatus.ended.value


@pytest.mark.asyncio
async def test_active_participant_prevents_cleanup(async_session, zero_empty_grace):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Pair", host_display_name="Host", max_participants=5),
        host_display_name="Host",
    )
    await service.join_meeting(
        created.id,
        "Host",
        token_service=FakeTokenService(),
    )
    guest_join = await service.join_meeting(
        created.id,
        "Guest",
        token_service=FakeTokenService(),
    )

    await service.leave_meeting(
        created.id,
        guest_join.participant_id,
        guest_join.participant_token,
    )

    ended = await service.cleanup_empty_meetings()
    assert ended == 0

    meeting = await service.get_meeting(created.id)
    assert meeting.status == MeetingStatus.active.value


@pytest.mark.asyncio
async def test_cleanup_is_idempotent(async_session, zero_empty_grace):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Idempotent cleanup", host_display_name="Host"),
        host_display_name="Host",
    )

    first = await service.cleanup_empty_meetings()
    second = await service.cleanup_empty_meetings()

    assert first == 1
    assert second == 0

    meeting = await service.get_meeting(created.id)
    assert meeting.status == MeetingStatus.ended.value


@pytest.mark.asyncio
async def test_leave_defers_auto_end_until_grace(async_session, monkeypatch):
    monkeypatch.setattr(settings, "empty_meeting_grace_seconds", 30)
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Deferred end", host_display_name="Host"),
        host_display_name="Host",
    )
    joined = await service.join_meeting(
        created.id,
        "Host",
        token_service=FakeTokenService(),
    )

    result = await service.leave_meeting(
        created.id,
        joined.participant_id,
        joined.participant_token,
    )

    assert result.auto_ended is False
    assert result.meeting_status != MeetingStatus.ended.value

    meeting = await service.get_meeting(created.id)
    assert meeting.status != MeetingStatus.ended.value
    repo = MeetingRepository(async_session)
    row = await repo.get_meeting_by_id(created.id)
    assert row.empty_since is not None


@pytest.mark.asyncio
async def test_join_clears_pending_empty_state(async_session, monkeypatch):
    monkeypatch.setattr(settings, "empty_meeting_grace_seconds", 30)
    service = MeetingService(async_session)
    repo = MeetingRepository(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Rescue", host_display_name="Host"),
        host_display_name="Host",
    )
    host_join = await service.join_meeting(
        created.id,
        "Host",
        token_service=FakeTokenService(),
    )
    await service.leave_meeting(
        created.id,
        host_join.participant_id,
        host_join.participant_token,
    )

    row = await repo.get_meeting_by_id(created.id)
    assert row.empty_since is not None

    await service.join_meeting(
        created.id,
        "Guest",
        token_service=FakeTokenService(),
    )

    row = await repo.get_meeting_by_id(created.id)
    assert row.empty_since is None
    assert row.status == MeetingStatus.active.value


@pytest.mark.asyncio
async def test_ended_meeting_cannot_be_rejoined_after_cleanup(async_session, zero_empty_grace):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Ended empty", host_display_name="Host"),
        host_display_name="Host",
    )

    await service.cleanup_empty_meetings()

    with pytest.raises(MeetingJoinError) as exc_info:
        await service.join_meeting(
            created.id,
            "Guest",
            token_service=FakeTokenService(),
        )

    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_last_participant_leave_then_cleanup(async_session, zero_empty_grace):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Final leave", host_display_name="Host"),
        host_display_name="Host",
    )
    joined = await service.join_meeting(
        created.id,
        "Host",
        token_service=FakeTokenService(),
    )

    leave_result = await service.leave_meeting(
        created.id,
        joined.participant_id,
        joined.participant_token,
    )

    assert leave_result.auto_ended is True

    meeting = await service.get_meeting(created.id)
    assert meeting.status == MeetingStatus.ended.value
