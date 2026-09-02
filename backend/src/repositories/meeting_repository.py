from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.meeting import Meeting, MeetingStatus, Participant, ParticipantRole, normalize_meeting_id_input


class MeetingRepository:
    """Async data access for Meeting and Participant records."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_meeting(
        self,
        *,
        title: str,
        host_display_name: str,
        host_clerk_user_id: Optional[str] = None,
        passcode_hash: Optional[str] = None,
        max_participants: int = 0,
        expires_at: Optional[datetime] = None,
        repository_owner: Optional[str] = None,
        repository_name: Optional[str] = None,
        repository_url: Optional[str] = None,
    ) -> Meeting:
        meeting = Meeting(
            title=title,
            host_display_name=host_display_name,
            host_clerk_user_id=host_clerk_user_id,
            passcode_hash=passcode_hash,
            max_participants=max_participants,
            expires_at=expires_at,
            repository_owner=repository_owner,
            repository_name=repository_name,
            repository_url=repository_url,
            status=MeetingStatus.scheduled.value,
        )
        host_participant = Participant(
            meeting=meeting,
            display_name=host_display_name,
            role=ParticipantRole.host.value,
            joined_at=None,
        )
        self.session.add(meeting)
        self.session.add(host_participant)
        await self.session.flush()
        await self.session.refresh(meeting, attribute_names=["participants"])
        return meeting

    async def get_meeting_by_id(self, meeting_id: str) -> Optional[Meeting]:
        stmt = (
            select(Meeting)
            .where(Meeting.id == meeting_id)
            .options(selectinload(Meeting.participants))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_meeting_by_short_code(self, short_code: str) -> Optional[Meeting]:
        stmt = (
            select(Meeting)
            .where(Meeting.short_code == short_code)
            .options(selectinload(Meeting.participants))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_meeting_by_id_light(self, meeting_id: str) -> Optional[Meeting]:
        stmt = select(Meeting).where(Meeting.id == meeting_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_meeting_by_short_code_light(self, short_code: str) -> Optional[Meeting]:
        stmt = select(Meeting).where(Meeting.short_code == short_code)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def resolve_meeting_row(self, identifier: str) -> Optional[Meeting]:
        cleaned = identifier.strip()
        if not cleaned:
            return None

        meeting = await self.get_meeting_by_id_light(cleaned)
        if meeting is not None:
            return meeting

        normalized_code = normalize_meeting_id_input(cleaned)
        return await self.get_meeting_by_short_code_light(normalized_code)

    async def list_active_meetings(self) -> list[Meeting]:
        active_statuses = (MeetingStatus.scheduled.value, MeetingStatus.active.value)
        stmt = (
            select(Meeting)
            .where(Meeting.status.in_(active_statuses))
            .options(selectinload(Meeting.participants))
            .order_by(Meeting.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_meetings_by_host_clerk_user_id(self, host_clerk_user_id: str) -> list[Meeting]:
        stmt = (
            select(Meeting)
            .where(Meeting.host_clerk_user_id == host_clerk_user_id)
            .options(selectinload(Meeting.participants))
            .order_by(Meeting.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_active_meetings_by_host_clerk_user_id(self, host_clerk_user_id: str) -> list[Meeting]:
        active_statuses = (MeetingStatus.scheduled.value, MeetingStatus.active.value)
        stmt = (
            select(Meeting)
            .where(
                Meeting.host_clerk_user_id == host_clerk_user_id,
                Meeting.status.in_(active_statuses),
            )
            .options(selectinload(Meeting.participants))
            .order_by(Meeting.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def end_meeting(self, meeting_id: str) -> Optional[Meeting]:
        meeting = await self.get_meeting_by_id(meeting_id)
        if meeting is None:
            return None
        meeting.status = MeetingStatus.ended.value
        meeting.ended_at = datetime.now(timezone.utc)
        await self.session.flush()
        await self.session.refresh(meeting, attribute_names=["participants"])
        return meeting

    async def count_active_participants(self, meeting_id: str) -> int:
        stmt = (
            select(func.count())
            .select_from(Participant)
            .where(
                Participant.meeting_id == meeting_id,
                Participant.left_at.is_(None),
                Participant.joined_at.is_not(None),
            )
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def add_participant(
        self,
        meeting_id: str,
        display_name: str,
        role: str = ParticipantRole.participant.value,
        leave_token_hash: Optional[str] = None,
    ) -> Participant:
        participant = Participant(
            meeting_id=meeting_id,
            display_name=display_name,
            role=role,
            joined_at=datetime.now(timezone.utc),
            leave_token_hash=leave_token_hash,
        )
        self.session.add(participant)
        await self.session.flush()
        return participant

    async def activate_host_participant(
        self,
        participant_id: str,
        display_name: str,
        leave_token_hash: Optional[str] = None,
    ) -> Participant:
        stmt = select(Participant).where(Participant.id == participant_id)
        result = await self.session.execute(stmt)
        participant = result.scalar_one()
        participant.display_name = display_name
        participant.joined_at = datetime.now(timezone.utc)
        participant.leave_token_hash = leave_token_hash
        await self.session.flush()
        return participant

    async def mark_meeting_active(self, meeting_id: str) -> None:
        meeting = await self.get_meeting_by_id(meeting_id)
        if meeting is None:
            return
        if meeting.status == MeetingStatus.scheduled.value:
            meeting.status = MeetingStatus.active.value
            await self.session.flush()

    async def get_participant_by_id(self, participant_id: str) -> Optional[Participant]:
        stmt = select(Participant).where(Participant.id == participant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def leave_participant(self, participant_id: str) -> Optional[Participant]:
        participant = await self.get_participant_by_id(participant_id)
        if participant is None or participant.left_at is not None:
            return participant
        participant.left_at = datetime.now(timezone.utc)
        await self.session.flush()
        return participant

    async def list_active_participant_rows(self, meeting_id: str) -> list[Participant]:
        stmt = (
            select(Participant)
            .where(
                Participant.meeting_id == meeting_id,
                Participant.left_at.is_(None),
                Participant.joined_at.is_not(None),
            )
            .order_by(Participant.joined_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
