import pytest

from src.models.meeting import MeetingCreate
from src.services.meeting_service import MeetingService


@pytest.mark.asyncio
async def test_create_meeting_stores_repository(async_session):
    service = MeetingService(async_session)
    created = await service.create_meeting(
        MeetingCreate(
            title="Repo Meeting",
            host_display_name="Host",
            repository_owner="octocat",
            repository_name="Hello-World",
            repository_url="https://github.com/octocat/Hello-World",
        ),
        host_clerk_user_id="user_repo",
    )

    assert created.repository_owner == "octocat"
    assert created.repository_name == "Hello-World"
    assert created.repository_url == "https://github.com/octocat/Hello-World"
