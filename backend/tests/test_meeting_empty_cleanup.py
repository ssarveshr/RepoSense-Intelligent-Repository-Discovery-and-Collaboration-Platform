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

    deleted = await service.cleanup_empty_meetings()
    assert deleted == 0

    meeting = await service.get_meeting(created.id)
    assert meeting is not None
    assert meeting.status != MeetingStatus.ended.value


@pytest.mark.asyncio
async def test_never_joined_meeting_deleted_after_grace(async_session, zero_empty_grace):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Stale lobby", host_display_name="Host"),
        host_display_name="Host",
    )

    deleted = await service.cleanup_empty_meetings()
    assert deleted == 1

    assert await service.get_meeting(created.id) is None


@pytest.mark.asyncio
async def test_host_joined_meeting_not_deleted(async_session, zero_empty_grace):
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

    deleted = await service.cleanup_empty_meetings()
    assert deleted == 0

    meeting = await service.get_meeting(created.id)
    assert meeting is not None
    assert meeting.status == MeetingStatus.active.value


@pytest.mark.asyncio
async def test_participant_leaves_host_remains(async_session, zero_empty_grace):
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

    deleted = await service.cleanup_empty_meetings()
    assert deleted == 0

    meeting = await service.get_meeting(created.id)
    assert meeting is not None
    assert meeting.status == MeetingStatus.active.value


@pytest.mark.asyncio
async def test_three_participants_leave_one_at_a_time(async_session, zero_empty_grace):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Trio", host_display_name="Host", max_participants=5),
        host_display_name="Host",
    )
    host_join = await service.join_meeting(
        created.id,
        "Host",
        token_service=FakeTokenService(),
    )
    guest_a = await service.join_meeting(
        created.id,
        "Guest A",
        token_service=FakeTokenService(),
    )
    guest_b = await service.join_meeting(
        created.id,
        "Guest B",
        token_service=FakeTokenService(),
    )

    await service.leave_meeting(created.id, guest_a.participant_id, guest_a.participant_token)
    assert await service.get_meeting(created.id) is not None

    await service.leave_meeting(created.id, guest_b.participant_id, guest_b.participant_token)
    assert await service.get_meeting(created.id) is not None

    await service.leave_meeting(created.id, host_join.participant_id, host_join.participant_token)
    assert await service.get_meeting(created.id) is None


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
    assert await service.get_meeting(created.id) is None


@pytest.mark.asyncio
async def test_leave_defers_cleanup_until_grace(async_session, monkeypatch):
    monkeypatch.setattr(settings, "empty_meeting_grace_seconds", 30)
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Deferred cleanup", host_display_name="Host"),
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
    assert await service.get_meeting(created.id) is not None

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
async def test_deleted_meeting_cannot_be_rejoined(async_session, zero_empty_grace):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Deleted empty", host_display_name="Host"),
        host_display_name="Host",
    )

    await service.cleanup_empty_meetings()

    with pytest.raises(MeetingJoinError) as exc_info:
        await service.join_meeting(
            created.id,
            "Guest",
            token_service=FakeTokenService(),
        )

    assert exc_info.value.status_code == 400


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
    assert await service.get_meeting(created.id) is None


@pytest.mark.asyncio
async def test_cleanup_does_not_delete_when_participant_rejoins(async_session, monkeypatch):
    monkeypatch.setattr(settings, "empty_meeting_grace_seconds", 30)
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Rejoin race", host_display_name="Host"),
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

    await service.join_meeting(
        created.id,
        "Guest",
        token_service=FakeTokenService(),
    )

    monkeypatch.setattr(settings, "empty_meeting_grace_seconds", 0)
    deleted = await service.cleanup_empty_meetings()

    assert deleted == 0
    assert await service.get_meeting(created.id) is not None


@pytest.mark.asyncio
async def test_deleted_meeting_not_in_active_list(async_session, zero_empty_grace):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="List removal", host_display_name="Host"),
        host_display_name="Host",
        host_clerk_user_id="user_host",
    )
    joined = await service.join_meeting(
        created.id,
        "Host",
        clerk_user_id="user_host",
        token_service=FakeTokenService(),
    )

    active_before = await service.list_active_meetings_for_host("user_host")
    assert any(m.id == created.id for m in active_before)

    await service.leave_meeting(
        created.id,
        joined.participant_id,
        joined.participant_token,
    )

    active_after = await service.list_active_meetings_for_host("user_host")
    assert not any(m.id == created.id for m in active_after)
