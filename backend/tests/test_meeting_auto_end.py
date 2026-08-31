import pytest

from src.models.meeting import MeetingCreate, MeetingStatus
from src.services.meeting_service import MeetingJoinError, MeetingService
from src.services.participant_service import ParticipantLeaveError, ParticipantService


class FakeTokenService:
    livekit_url = "wss://test.livekit.cloud"

    def mint_join_token(self, *, room_name, participant_id, participant_display_name):
        return f"fake-token:{room_name}:{participant_id}:{participant_display_name}"


@pytest.mark.asyncio
async def test_single_participant_leave_auto_ends_meeting(async_session):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Solo", host_display_name="Host"),
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

    assert result.participant.left_at is not None
    assert result.meeting_status == MeetingStatus.ended.value
    assert result.auto_ended is True

    meeting = await service.get_meeting(created.id)
    assert meeting.status == MeetingStatus.ended.value
    assert meeting.ended_at is not None


@pytest.mark.asyncio
async def test_two_participants_one_leaves_meeting_stays_active(async_session):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Pair", host_display_name="Host", max_participants=5),
        host_display_name="Host",
    )
    host_join = await service.join_meeting(
        created.id,
        "Host",
        token_service=FakeTokenService(),
    )
    guest_join = await service.join_meeting(
        created.id,
        "Guest",
        token_service=FakeTokenService(),
    )

    result = await service.leave_meeting(
        created.id,
        guest_join.participant_id,
        guest_join.participant_token,
    )

    assert result.auto_ended is False
    assert result.meeting_status == MeetingStatus.active.value

    meeting = await service.get_meeting(created.id)
    assert meeting.status == MeetingStatus.active.value

    roster = ParticipantService(async_session)
    active = await roster.list_roster(created.id)
    assert len(active) == 1
    assert active[0].display_name == "Host"
    assert host_join.participant_id == active[0].id


@pytest.mark.asyncio
async def test_last_participant_leave_auto_ends_meeting(async_session):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Pair", host_display_name="Host", max_participants=5),
        host_display_name="Host",
    )
    host_join = await service.join_meeting(
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

    result = await service.leave_meeting(
        created.id,
        host_join.participant_id,
        host_join.participant_token,
    )

    assert result.auto_ended is True
    assert result.meeting_status == MeetingStatus.ended.value

    meeting = await service.get_meeting(created.id)
    assert meeting.status == MeetingStatus.ended.value


@pytest.mark.asyncio
async def test_host_leaves_guest_remains_meeting_stays_active(async_session):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Host leaves", host_display_name="Host", max_participants=5),
        host_display_name="Host",
        host_clerk_user_id="user_host",
    )
    host_join = await service.join_meeting(
        created.id,
        "Host",
        clerk_user_id="user_host",
        token_service=FakeTokenService(),
    )
    guest_join = await service.join_meeting(
        created.id,
        "Guest",
        token_service=FakeTokenService(),
    )

    result = await service.leave_meeting(
        created.id,
        host_join.participant_id,
        host_join.participant_token,
    )

    assert result.auto_ended is False

    meeting = await service.get_meeting(created.id)
    assert meeting.status == MeetingStatus.active.value

    roster = ParticipantService(async_session)
    active = await roster.list_roster(created.id)
    assert len(active) == 1
    assert active[0].display_name == "Guest"


@pytest.mark.asyncio
async def test_auto_ended_meeting_cannot_be_joined(async_session):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Ended", host_display_name="Host"),
        host_display_name="Host",
    )
    joined = await service.join_meeting(
        created.id,
        "Host",
        token_service=FakeTokenService(),
    )

    await service.leave_meeting(
        created.id,
        joined.participant_id,
        joined.participant_token,
    )

    with pytest.raises(MeetingJoinError) as exc_info:
        await service.join_meeting(
            created.id,
            "Guest",
            token_service=FakeTokenService(),
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.message == "Meeting has ended"


@pytest.mark.asyncio
async def test_leave_is_idempotent(async_session):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Idempotent", host_display_name="Host"),
        host_display_name="Host",
    )
    joined = await service.join_meeting(
        created.id,
        "Host",
        token_service=FakeTokenService(),
    )

    first = await service.leave_meeting(
        created.id,
        joined.participant_id,
        joined.participant_token,
    )
    second = await service.leave_meeting(
        created.id,
        joined.participant_id,
        joined.participant_token,
    )

    assert first.participant.left_at is not None
    assert second.participant.left_at is not None
    assert second.auto_ended is False

    meeting = await service.get_meeting(created.id)
    assert meeting.status == MeetingStatus.ended.value


@pytest.mark.asyncio
async def test_manual_end_still_works(async_session):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Manual end", host_display_name="Host"),
        host_display_name="Host",
        host_clerk_user_id="user_host",
    )
    await service.join_meeting(
        created.id,
        "Host",
        clerk_user_id="user_host",
        token_service=FakeTokenService(),
    )
    await service.join_meeting(
        created.id,
        "Guest",
        token_service=FakeTokenService(),
    )

    ended = await service.end_meeting(created.id, host_clerk_user_id="user_host")

    assert ended.status == MeetingStatus.ended.value


@pytest.mark.asyncio
async def test_leave_without_valid_token_returns_403(async_session):
    service = MeetingService(async_session)

    created = await service.create_meeting(
        MeetingCreate(title="Leave auth", host_display_name="Host"),
        host_display_name="Host",
    )
    joined = await service.join_meeting(
        created.id,
        "Guest",
        token_service=FakeTokenService(),
    )

    with pytest.raises(ParticipantLeaveError) as exc_info:
        await service.leave_meeting(
            created.id,
            joined.participant_id,
            "invalid-token",
        )

    assert exc_info.value.status_code == 403
