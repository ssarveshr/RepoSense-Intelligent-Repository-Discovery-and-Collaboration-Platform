from fastapi import APIRouter, Depends, HTTPException, Request

from sqlalchemy.ext.asyncio import AsyncSession



from src.api.deps.clerk_auth import ClerkUser, get_optional_clerk_user, require_clerk_user

from src.api.deps.rate_limit import limiter

from src.db import get_session

from src.models.meeting import (

    MeetingCreate,

    MeetingInvitationsRequest,

    MeetingInvitationsResponse,

    MeetingJoinRequest,

    MeetingJoinResponse,

    MeetingLeaveRequest,

    MeetingLeaveResponse,

    MeetingResponse,

    ParticipantResponse,

)

from src.services.meeting_invitation_service import (
    MeetingInvitationService,
    normalize_email,
    validate_external_url,
)

from src.services.meeting_service import MeetingJoinError, MeetingService

from src.services.participant_service import ParticipantLeaveError, ParticipantService



router = APIRouter(prefix="/api/meetings", tags=["meetings"])





async def get_meeting_service(

    session: AsyncSession = Depends(get_session),

) -> MeetingService:

    return MeetingService(session)





async def get_participant_service(

    session: AsyncSession = Depends(get_session),

) -> ParticipantService:

    return ParticipantService(session)





@router.post("", response_model=MeetingResponse, status_code=201)

@limiter.limit("20/minute")

async def create_meeting(

    request: Request,

    payload: MeetingCreate,

    service: MeetingService = Depends(get_meeting_service),

    clerk_user: ClerkUser = Depends(require_clerk_user),

) -> MeetingResponse:

    host_display_name = payload.host_display_name or clerk_user.display_name or "Host"

    return await service.create_meeting(

        payload,

        host_clerk_user_id=clerk_user.user_id,

        host_display_name=host_display_name,

    )





@router.get("", response_model=list[MeetingResponse])

async def list_meetings(

    service: MeetingService = Depends(get_meeting_service),

    clerk_user: ClerkUser = Depends(require_clerk_user),

) -> list[MeetingResponse]:

    return await service.list_active_meetings_for_host(clerk_user.user_id)





@router.get("/resolve/{identifier}", response_model=MeetingResponse)

async def resolve_meeting(

    identifier: str,

    service: MeetingService = Depends(get_meeting_service),

) -> MeetingResponse:

    """Resolve a meeting by UUID or short code (with or without dashes/spaces)."""

    meeting = await service.resolve_meeting(identifier)

    if meeting is None:

        raise HTTPException(status_code=404, detail="Meeting not found")

    return meeting





@router.get("/{meeting_id}", response_model=MeetingResponse)

async def get_meeting(

    meeting_id: str,

    service: MeetingService = Depends(get_meeting_service),

) -> MeetingResponse:

    meeting = await service.get_meeting(meeting_id)

    if meeting is None:

        raise HTTPException(status_code=404, detail="Meeting not found")

    return meeting





@router.get("/{meeting_id}/participants", response_model=list[ParticipantResponse])

async def list_meeting_participants(

    meeting_id: str,

    service: MeetingService = Depends(get_meeting_service),

    participant_service: ParticipantService = Depends(get_participant_service),

) -> list[ParticipantResponse]:

    meeting = await service.get_meeting(meeting_id)

    if meeting is None:

        raise HTTPException(status_code=404, detail="Meeting not found")

    return await participant_service.list_roster(meeting_id)





@router.post("/{meeting_id}/end", response_model=MeetingResponse)

async def end_meeting(

    meeting_id: str,

    service: MeetingService = Depends(get_meeting_service),

    clerk_user: ClerkUser = Depends(require_clerk_user),

) -> MeetingResponse:

    try:

        meeting = await service.end_meeting(meeting_id, host_clerk_user_id=clerk_user.user_id)

    except MeetingJoinError as exc:

        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc



    if meeting is None:

        raise HTTPException(status_code=404, detail="Meeting not found")

    return meeting





@router.post("/{meeting_id}/join", response_model=MeetingJoinResponse)

@limiter.limit("60/minute")

async def join_meeting(

    request: Request,

    meeting_id: str,

    payload: MeetingJoinRequest,

    service: MeetingService = Depends(get_meeting_service),

    clerk_user: ClerkUser | None = Depends(get_optional_clerk_user),

) -> MeetingJoinResponse:

    try:

        return await service.join_meeting(

            meeting_id,

            payload.display_name,

            payload.passcode,

            clerk_user_id=clerk_user.user_id if clerk_user else None,

        )

    except MeetingJoinError as exc:

        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc





@router.post("/{meeting_id}/invitations", response_model=MeetingInvitationsResponse)

@limiter.limit("10/minute")

async def send_meeting_invitations(

    request: Request,

    meeting_id: str,

    payload: MeetingInvitationsRequest,

    service: MeetingService = Depends(get_meeting_service),

    clerk_user: ClerkUser = Depends(require_clerk_user),

) -> MeetingInvitationsResponse:

    meeting = await service.get_meeting(meeting_id)

    if meeting is None:

        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.host_clerk_user_id != clerk_user.user_id:

        raise HTTPException(status_code=403, detail="Not authorized to send invitations for this meeting")

    if not normalize_email(payload.host_email):

        raise HTTPException(status_code=400, detail="Invalid host email address")

    try:

        external_url = validate_external_url(payload.external_meeting_url)

    except ValueError as exc:

        raise HTTPException(status_code=400, detail=str(exc)) from exc

    invitation_service = MeetingInvitationService()

    recipient_payload = [r.model_dump() for r in payload.recipients]

    result = invitation_service.send_invitations(

        meeting_id=meeting.id,

        short_code=meeting.short_code,

        meeting_title=meeting.title,

        host_name=payload.host_name,

        host_email=payload.host_email,

        repo_name=payload.repo_name,

        recipients=recipient_payload,

        custom_message=payload.custom_message,

        external_meeting_url=external_url,

        meeting_created_at=meeting.created_at,

    )

    return MeetingInvitationsResponse.model_validate(result)





@router.post("/{meeting_id}/leave", response_model=MeetingLeaveResponse)

async def leave_meeting(

    meeting_id: str,

    payload: MeetingLeaveRequest,

    service: MeetingService = Depends(get_meeting_service),

) -> MeetingLeaveResponse:

    try:

        return await service.leave_meeting(

            meeting_id,

            payload.participant_id,

            payload.participant_token,

        )

    except ParticipantLeaveError as exc:

        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

