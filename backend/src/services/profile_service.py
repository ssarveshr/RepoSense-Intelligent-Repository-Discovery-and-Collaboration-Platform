from sqlalchemy.ext.asyncio import AsyncSession

from src.models.meeting import (
    MeetingStatus,
    ProfileActivityItem,
    ProfileActivityResponse,
    ProfileStatsResponse,
)
from src.repositories.meeting_repository import MeetingRepository


class ProfileService:
    def __init__(self, session: AsyncSession):
        self.repository = MeetingRepository(session)

    async def get_stats(self, host_clerk_user_id: str) -> ProfileStatsResponse:
        meetings = await self.repository.list_meetings_by_host_clerk_user_id(host_clerk_user_id)
        active_statuses = {MeetingStatus.scheduled.value, MeetingStatus.active.value}

        return ProfileStatsResponse(
            meetings_hosted=len(meetings),
            active_meetings=sum(1 for meeting in meetings if meeting.status in active_statuses),
            total_participants=sum(
                len([p for p in meeting.participants if p.joined_at is not None])
                for meeting in meetings
            ),
        )

    async def get_activity(self, host_clerk_user_id: str) -> ProfileActivityResponse:
        meetings = await self.repository.list_meetings_by_host_clerk_user_id(host_clerk_user_id)
        items = [
            ProfileActivityItem(
                id=meeting.id,
                title=meeting.title,
                description=meeting.title,
                timestamp=meeting.created_at,
                kind="completed" if meeting.status == MeetingStatus.ended.value else "created",
            )
            for meeting in meetings[:8]
        ]
        return ProfileActivityResponse(items=items)
