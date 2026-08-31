import pytest

from src.models.meeting import MeetingStatus
from src.repositories.meeting_repository import MeetingRepository


@pytest.mark.asyncio
async def test_create_meeting_persists_host_participant(async_session):
    repo = MeetingRepository(async_session)
    meeting = await repo.create_meeting(
        title="Pair Programming",
        host_display_name="Alex",
        passcode_hash="hashed",
        max_participants=8,
    )

    assert meeting.id
    assert meeting.short_code
    assert meeting.title == "Pair Programming"
    assert meeting.status == MeetingStatus.scheduled.value
    assert len(meeting.participants) == 1
    assert meeting.participants[0].role == "host"
    assert meeting.participants[0].display_name == "Alex"


@pytest.mark.asyncio
async def test_get_meeting_by_id(async_session):
    repo = MeetingRepository(async_session)
    created = await repo.create_meeting(title="Sprint Review", host_display_name="Sam")

    fetched = await repo.get_meeting_by_id(created.id)
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.short_code == created.short_code


@pytest.mark.asyncio
async def test_get_meeting_by_short_code(async_session):
    repo = MeetingRepository(async_session)
    created = await repo.create_meeting(title="Design Sync", host_display_name="Jordan")

    fetched = await repo.get_meeting_by_short_code(created.short_code)
    assert fetched is not None
    assert fetched.id == created.id


@pytest.mark.asyncio
async def test_list_active_meetings_excludes_ended(async_session):
    repo = MeetingRepository(async_session)
    active = await repo.create_meeting(title="Active Room", host_display_name="Host")
    ended = await repo.create_meeting(title="Ended Room", host_display_name="Host")
    await repo.end_meeting(ended.id)

    active_meetings = await repo.list_active_meetings()
    active_ids = {m.id for m in active_meetings}

    assert active.id in active_ids
    assert ended.id not in active_ids


@pytest.mark.asyncio
async def test_end_meeting_sets_status_and_timestamp(async_session):
    repo = MeetingRepository(async_session)
    created = await repo.create_meeting(title="Wrap Up", host_display_name="Host")

    ended = await repo.end_meeting(created.id)
    assert ended is not None
    assert ended.status == MeetingStatus.ended.value
    assert ended.ended_at is not None

    refetched = await repo.get_meeting_by_id(created.id)
    assert refetched.status == MeetingStatus.ended.value
