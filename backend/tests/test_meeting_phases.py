import pytest
from datetime import datetime, timedelta, timezone

from src.models.meeting import MeetingCreate
from src.services.meeting_service import INVALID_MEETING_OR_PASSCODE, MeetingJoinError, MeetingService
from src.services.participant_service import ParticipantLeaveError, ParticipantService


class FakeTokenService:
    livekit_url = "wss://test.livekit.cloud"

    def mint_join_token(self, *, room_name, participant_id, participant_display_name):
        return f"fake-token:{room_name}:{participant_id}:{participant_display_name}"


@pytest.mark.asyncio
async def test_join_meeting_expired(async_session):
    service = MeetingService(async_session)
    created = await service.create_meeting(
        MeetingCreate(
            title="Expired",
            host_display_name="Host",
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        ),
        host_display_name="Host",
    )

    with pytest.raises(MeetingJoinError) as exc_info:
        await service.join_meeting(created.id, "Guest", token_service=FakeTokenService())

    assert exc_info.value.status_code == 410


@pytest.mark.asyncio
async def test_participant_leave_and_roster(async_session):
    meeting_service = MeetingService(async_session)
    participant_service = ParticipantService(async_session)

    created = await meeting_service.create_meeting(
        MeetingCreate(title="Roster", host_display_name="Alice", max_participants=5),
        host_display_name="Alice",
    )
    join_a = await meeting_service.join_meeting(
        created.id, "Alice", token_service=FakeTokenService()
    )
    join_b = await meeting_service.join_meeting(
        created.id, "Bob", token_service=FakeTokenService()
    )

    roster = await participant_service.list_roster(created.id)
    assert len(roster) == 2

    left = await meeting_service.leave_meeting(
        created.id,
        join_b.participant_id,
        join_b.participant_token,
    )
    assert left.participant is not None
    assert left.participant.left_at is not None

    roster_after = await participant_service.list_roster(created.id)
    assert len(roster_after) == 1
    assert roster_after[0].display_name == "Alice"


@pytest.mark.asyncio
async def test_leave_without_valid_token_returns_403(async_session):
    meeting_service = MeetingService(async_session)
    participant_service = ParticipantService(async_session)

    created = await meeting_service.create_meeting(
        MeetingCreate(title="Leave auth", host_display_name="Host"),
        host_display_name="Host",
    )
    joined = await meeting_service.join_meeting(
        created.id, "Guest", token_service=FakeTokenService()
    )

    with pytest.raises(ParticipantLeaveError) as exc_info:
        await meeting_service.leave_meeting(
            created.id,
            joined.participant_id,
            "invalid-token",
        )

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_leave_meeting_idempotent(async_session):
    meeting_service = MeetingService(async_session)
    participant_service = ParticipantService(async_session)

    created = await meeting_service.create_meeting(
        MeetingCreate(title="Idempotent leave", host_display_name="Host"),
        host_display_name="Host",
    )
    joined = await meeting_service.join_meeting(
        created.id, "Guest", token_service=FakeTokenService()
    )

    first = await meeting_service.leave_meeting(
        created.id,
        joined.participant_id,
        joined.participant_token,
    )
    second = await meeting_service.leave_meeting(
        created.id,
        joined.participant_id,
        joined.participant_token,
    )

    assert first.participant.left_at is not None
    assert second.participant.left_at is not None


@pytest.mark.asyncio
async def test_join_enumeration_passcode_protected_same_error(async_session):
    service = MeetingService(async_session)
    created = await service.create_meeting(
        MeetingCreate(
            title="Secure",
            host_display_name="Host",
            passcode="correct-pass",
        ),
        host_display_name="Host",
    )

    with pytest.raises(MeetingJoinError) as wrong_id:
        await service.join_meeting(
            "00000000-0000-0000-0000-000000000000",
            "Guest",
            passcode="probe",
            token_service=FakeTokenService(),
        )

    with pytest.raises(MeetingJoinError) as wrong_pass:
        await service.join_meeting(
            created.id,
            "Guest",
            passcode="wrong-pass",
            token_service=FakeTokenService(),
        )

    assert wrong_id.value.status_code == 400
    assert wrong_pass.value.status_code == 400
    assert wrong_id.value.message == INVALID_MEETING_OR_PASSCODE
    assert wrong_pass.value.message == INVALID_MEETING_OR_PASSCODE


@pytest.mark.asyncio
async def test_join_enumeration_no_passcode_supplied_same_error(async_session):
    service = MeetingService(async_session)
    created = await service.create_meeting(
        MeetingCreate(
            title="Secure",
            host_display_name="Host",
            passcode="correct-pass",
        ),
        host_display_name="Host",
    )

    with pytest.raises(MeetingJoinError) as wrong_id:
        await service.join_meeting(
            "00000000-0000-0000-0000-000000000000",
            "Guest",
            token_service=FakeTokenService(),
        )

    with pytest.raises(MeetingJoinError) as missing_pass:
        await service.join_meeting(
            created.id,
            "Guest",
            token_service=FakeTokenService(),
        )

    assert wrong_id.value.status_code == 400
    assert missing_pass.value.status_code == 400
    assert wrong_id.value.message == INVALID_MEETING_OR_PASSCODE
    assert missing_pass.value.message == INVALID_MEETING_OR_PASSCODE


@pytest.mark.asyncio
async def test_join_respects_max_participants(async_session):
    service = MeetingService(async_session)
    created = await service.create_meeting(
        MeetingCreate(title="Small room", host_display_name="Host", max_participants=2),
        host_display_name="Host",
    )
    await service.join_meeting(created.id, "Host", token_service=FakeTokenService())
    await service.join_meeting(created.id, "Guest", token_service=FakeTokenService())

    with pytest.raises(MeetingJoinError) as exc_info:
        await service.join_meeting(created.id, "Extra", token_service=FakeTokenService())

    assert exc_info.value.status_code == 409
