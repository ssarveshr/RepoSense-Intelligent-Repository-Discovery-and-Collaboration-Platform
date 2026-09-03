from datetime import datetime, timedelta, timezone
from typing import Optional

from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import settings

from src.models.meeting import (
    MeetingCreate,
    MeetingJoinResponse,
    MeetingLeaveResponse,
    MeetingResponse,
    MeetingStatus,
    ParticipantResponse,
    ParticipantRole,
    generate_participant_token,
    hash_participant_token,
    verify_participant_token,
)
from src.services.participant_service import ParticipantLeaveError
from src.repositories.meeting_repository import MeetingRepository
from src.services.livekit_token_service import (
    LiveKitConfigurationError,
    LiveKitTokenService,
    room_name_from_short_code,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

INVALID_MEETING_OR_PASSCODE = "Invalid meeting or passcode"


class MeetingJoinError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _ensure_meeting_joinable(meeting) -> None:
    if meeting.status == MeetingStatus.ended.value:
        raise MeetingJoinError("Meeting has ended", status_code=409)

    if meeting.expires_at is not None:
        expires_at = meeting.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            raise MeetingJoinError("Meeting has expired", status_code=410)


def _meeting_is_joinable(meeting) -> bool:
    if meeting.status == MeetingStatus.ended.value:
        return False
    if meeting.expires_at is not None:
        expires_at = meeting.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            return False
    return True


def meeting_to_public_resolve(meeting) -> "MeetingPublicResolveResponse":
    from src.models.meeting import MeetingPublicResolveResponse

    return MeetingPublicResolveResponse(
        id=meeting.id,
        short_code=meeting.short_code,
        title=meeting.title,
        status=meeting.status,
        passcode_required=bool(meeting.passcode_hash),
        is_joinable=_meeting_is_joinable(meeting),
    )


class MeetingService:
    """Business logic for persisted RepoSense meetings."""

    def __init__(self, session: AsyncSession):
        self.repository = MeetingRepository(session)

    @staticmethod
    def hash_passcode(passcode: str) -> str:
        return pwd_context.hash(passcode)

    @staticmethod
    def verify_passcode(passcode: str, passcode_hash: str) -> bool:
        return pwd_context.verify(passcode, passcode_hash)

    async def create_meeting(
        self,
        payload: MeetingCreate,
        *,
        host_clerk_user_id: str | None = None,
        host_display_name: str | None = None,
    ) -> MeetingResponse:
        passcode_hash = None
        if payload.passcode:
            passcode_hash = self.hash_passcode(payload.passcode)

        display_name = host_display_name or payload.host_display_name or "Host"

        meeting = await self.repository.create_meeting(
            title=payload.title,
            host_display_name=display_name,
            host_clerk_user_id=host_clerk_user_id,
            passcode_hash=passcode_hash,
            max_participants=payload.max_participants,
            expires_at=payload.expires_at,
            repository_owner=payload.repository_owner,
            repository_name=payload.repository_name,
            repository_url=payload.repository_url,
        )
        return MeetingResponse.model_validate(meeting)

    async def get_meeting(self, meeting_id: str) -> Optional[MeetingResponse]:
        meeting = await self.repository.get_meeting_by_id(meeting_id)
        if meeting is None:
            return None
        return MeetingResponse.model_validate(meeting)

    async def get_meeting_by_short_code(self, short_code: str) -> Optional[MeetingResponse]:
        meeting = await self.repository.get_meeting_by_short_code(short_code)
        if meeting is None:
            return None
        return MeetingResponse.model_validate(meeting)

    async def resolve_meeting(self, identifier: str) -> Optional[MeetingResponse]:
        """Find meeting by UUID or normalized short code (full host metadata)."""
        meeting = await self.repository.resolve_meeting_row(identifier)
        if meeting is None:
            return None
        return MeetingResponse.model_validate(
            await self.repository.get_meeting_by_id(meeting.id)
        )

    async def resolve_meeting_public(self, identifier: str):
        """Find meeting by UUID or normalized short code; return public-safe fields only."""
        from src.models.meeting import MeetingPublicResolveResponse

        meeting = await self.repository.resolve_meeting_row(identifier)
        if meeting is None:
            return None
        return meeting_to_public_resolve(meeting)

    async def list_active_meetings(self) -> list[MeetingResponse]:
        meetings = await self.repository.list_active_meetings()
        return [MeetingResponse.model_validate(m) for m in meetings]

    async def list_active_meetings_for_host(self, host_clerk_user_id: str) -> list[MeetingResponse]:
        meetings = await self.repository.list_active_meetings_by_host_clerk_user_id(host_clerk_user_id)
        return [MeetingResponse.model_validate(m) for m in meetings]

    async def end_meeting(
        self,
        meeting_id: str,
        *,
        host_clerk_user_id: str | None = None,
    ) -> Optional[MeetingResponse]:
        meeting = await self.repository.get_meeting_by_id(meeting_id)
        if meeting is None:
            return None

        if host_clerk_user_id is not None:
            if meeting.host_clerk_user_id != host_clerk_user_id:
                raise MeetingJoinError("Not authorized to end this meeting", status_code=403)

        if meeting.status == MeetingStatus.ended.value:
            return MeetingResponse.model_validate(meeting)

        ended = await self.repository.end_meeting(meeting_id)
        if ended is None:
            return None
        return MeetingResponse.model_validate(ended)

    async def join_meeting(
        self,
        meeting_id: str,
        display_name: str,
        passcode: Optional[str] = None,
        *,
        clerk_user_id: Optional[str] = None,
        token_service: Optional[LiveKitTokenService] = None,
    ) -> MeetingJoinResponse:
        meeting = await self.repository.get_meeting_by_id(meeting_id)

        if meeting is None:
            raise MeetingJoinError(INVALID_MEETING_OR_PASSCODE, status_code=400)

        _ensure_meeting_joinable(meeting)

        if meeting.passcode_hash:
            if not passcode or not self.verify_passcode(passcode, meeting.passcode_hash):
                raise MeetingJoinError(INVALID_MEETING_OR_PASSCODE, status_code=400)

        active_count = await self.repository.count_active_participants(meeting_id)
        if meeting.max_participants > 0 and active_count >= meeting.max_participants:
            raise MeetingJoinError("Meeting is full", status_code=409)

        participant_token = generate_participant_token()
        leave_token_hash = hash_participant_token(participant_token)

        pending_host = next(
            (
                p
                for p in meeting.participants
                if p.role == ParticipantRole.host.value and p.joined_at is None
            ),
            None,
        )
        is_authenticated_host = (
            pending_host
            and meeting.host_clerk_user_id
            and clerk_user_id
            and clerk_user_id == meeting.host_clerk_user_id
        )
        is_legacy_host = (
            pending_host
            and not meeting.host_clerk_user_id
            and display_name == meeting.host_display_name
        )
        if is_authenticated_host or is_legacy_host:
            participant = await self.repository.activate_host_participant(
                pending_host.id,
                display_name,
                leave_token_hash=leave_token_hash,
            )
        else:
            participant = await self.repository.add_participant(
                meeting_id=meeting_id,
                display_name=display_name,
                leave_token_hash=leave_token_hash,
            )
        await self.repository.clear_meeting_empty(meeting_id)
        await self.repository.mark_meeting_active(meeting_id)

        try:
            livekit = token_service or LiveKitTokenService()
        except LiveKitConfigurationError as exc:
            raise MeetingJoinError(str(exc), status_code=503) from exc

        room_name = room_name_from_short_code(meeting.short_code)
        token = livekit.mint_join_token(
            room_name=room_name,
            participant_id=participant.id,
            participant_display_name=display_name,
        )

        return MeetingJoinResponse(
            token=token,
            livekit_url=livekit.livekit_url,
            room_name=room_name,
            participant_id=participant.id,
            participant_token=participant_token,
            is_host=participant.role == ParticipantRole.host.value,
        )

    async def leave_meeting(
        self,
        meeting_id: str,
        participant_id: str,
        participant_token: str,
    ) -> MeetingLeaveResponse:
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

        auto_ended = False
        meeting_status = meeting.status

        if meeting.status != MeetingStatus.ended.value:
            active_count = await self.repository.count_active_participants(meeting_id)
            if active_count == 0:
                await self.repository.mark_meeting_empty(meeting_id)
                auto_ended = await self._try_end_empty_meeting_after_grace(meeting_id)
                if auto_ended:
                    meeting_status = MeetingStatus.ended.value

        return MeetingLeaveResponse(
            participant=ParticipantResponse.model_validate(updated),
            meeting_status=meeting_status,
            auto_ended=auto_ended,
        )

    def _empty_reference_time(self, meeting) -> datetime | None:
        if meeting.empty_since is not None:
            empty_since = meeting.empty_since
            if empty_since.tzinfo is None:
                empty_since = empty_since.replace(tzinfo=timezone.utc)
            return empty_since

        ever_joined = any(p.joined_at is not None for p in meeting.participants)
        if ever_joined:
            return None

        created_at = meeting.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        return created_at

    def _meeting_empty_past_grace(self, meeting) -> bool:
        reference = self._empty_reference_time(meeting)
        if reference is None:
            return False
        grace = max(0, settings.empty_meeting_grace_seconds)
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=grace)
        return reference <= cutoff

    async def _try_end_empty_meeting_after_grace(self, meeting_id: str) -> bool:
        meeting = await self.repository.get_meeting_by_id(meeting_id)
        if meeting is None or meeting.status == MeetingStatus.ended.value:
            return False

        active_count = await self.repository.count_active_participants(meeting_id)
        if active_count > 0:
            await self.repository.clear_meeting_empty(meeting_id)
            return False

        if not self._meeting_empty_past_grace(meeting):
            return False

        ended = await self.repository.end_meeting(meeting_id)
        return ended is not None

    async def cleanup_empty_meetings(self) -> int:
        """End joinable meetings that have been empty beyond the configured grace period."""
        ended_count = 0
        candidates = await self.repository.list_joinable_meetings()

        for meeting in candidates:
            active_count = await self.repository.count_active_participants(meeting.id)
            if active_count > 0:
                if meeting.empty_since is not None:
                    await self.repository.clear_meeting_empty(meeting.id)
                continue

            if meeting.empty_since is None:
                await self.repository.mark_meeting_empty(meeting.id)
                meeting = await self.repository.get_meeting_by_id(meeting.id)
                if meeting is None:
                    continue

            if not self._meeting_empty_past_grace(meeting):
                continue

            if await self._try_end_empty_meeting_after_grace(meeting.id):
                ended_count += 1

        return ended_count
