from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.meeting import ParticipantResponse, verify_participant_token
from src.repositories.meeting_repository import MeetingRepository


class ParticipantLeaveError(Exception):
    def __init__(self, message: str, status_code: int = 403):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class ParticipantService:
    """Join/leave records and roster for active meetings (Phase 5)."""

    def __init__(self, session: AsyncSession):
        self.repository = MeetingRepository(session)

    async def list_roster(self, meeting_id: str) -> list[ParticipantResponse]:
        meeting = await self.repository.get_meeting_by_id(meeting_id)
        if meeting is None:
            return []
        rows = await self.repository.list_active_participant_rows(meeting_id)
        return [ParticipantResponse.model_validate(row) for row in rows]

    async def leave_meeting(
        self,
        meeting_id: str,
        participant_id: str,
        participant_token: str,
    ) -> ParticipantResponse:
        meeting = await self.repository.get_meeting_by_id(meeting_id)
        if meeting is None:
            raise ParticipantLeaveError("Participant not found", status_code=404)

        participant = await self.repository.get_participant_by_id(participant_id)
        if participant is None or participant.meeting_id != meeting_id:
            raise ParticipantLeaveError("Participant not found", status_code=404)

        if not verify_participant_token(participant_token, participant.leave_token_hash):
            raise ParticipantLeaveError("Invalid participant token", status_code=403)

        updated = await self.repository.leave_participant(participant_id)
        if updated is None:
            raise ParticipantLeaveError("Participant not found", status_code=404)
        return ParticipantResponse.model_validate(updated)
