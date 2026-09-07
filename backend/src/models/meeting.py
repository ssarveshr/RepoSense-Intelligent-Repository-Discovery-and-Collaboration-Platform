from datetime import datetime, timezone
from enum import Enum
import hashlib
import random
import secrets
import string
import uuid
from typing import Optional, List

from pydantic import BaseModel
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from src.db import Base


class MeetingStatus(str, Enum):
    scheduled = "scheduled"
    active = "active"
    ended = "ended"


class ParticipantRole(str, Enum):
    host = "host"
    participant = "participant"


def generate_short_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=8))


def normalize_meeting_id_input(cleaned: str) -> str:
    if not cleaned:
        return ""
    return cleaned.replace("-", "").strip().upper()


def generate_participant_token() -> str:
    return secrets.token_hex(32)


def hash_participant_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_participant_token(token: str | None, token_hash: str | None) -> bool:
    if not token or not token_hash:
        return False
    return hash_participant_token(token) == token_hash


# SQLAlchemy ORM Models
class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    short_code = Column(String(16), unique=True, index=True, default=generate_short_code)
    title = Column(String(256), nullable=False)
    host_display_name = Column(String(128), nullable=False)
    host_clerk_user_id = Column(String(64), nullable=True, index=True)
    passcode_hash = Column(String(256), nullable=True)
    max_participants = Column(Integer, default=0)
    status = Column(String(32), default=MeetingStatus.scheduled.value, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    empty_since = Column(DateTime(timezone=True), nullable=True)
    repository_owner = Column(String(128), nullable=True)
    repository_name = Column(String(128), nullable=True)
    repository_url = Column(String(512), nullable=True)

    participants = relationship("Participant", back_populates="meeting", cascade="all, delete-orphan")


class Participant(Base):
    __tablename__ = "participants"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String(64), ForeignKey("meetings.id"), nullable=False, index=True)
    display_name = Column(String(128), nullable=False)
    role = Column(String(32), default=ParticipantRole.participant.value)
    joined_at = Column(DateTime(timezone=True), nullable=True)
    left_at = Column(DateTime(timezone=True), nullable=True)
    leave_token_hash = Column(String(256), nullable=True)

    meeting = relationship("Meeting", back_populates="participants")


# Pydantic Response / Request Schemas
class ParticipantResponse(BaseModel):
    id: str
    meeting_id: str
    display_name: str
    role: str
    joined_at: Optional[datetime] = None
    left_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MeetingResponse(BaseModel):
    id: str
    short_code: str
    title: str
    host_display_name: str
    host_clerk_user_id: Optional[str] = None
    status: str
    created_at: datetime
    ended_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    max_participants: int = 0
    repository_owner: Optional[str] = None
    repository_name: Optional[str] = None
    repository_url: Optional[str] = None
    participants: List[ParticipantResponse] = []

    class Config:
        from_attributes = True


class MeetingCreate(BaseModel):
    title: str
    host_display_name: Optional[str] = None
    passcode: Optional[str] = None
    max_participants: int = 0
    expires_in_minutes: Optional[int] = None
    repository_owner: Optional[str] = None
    repository_name: Optional[str] = None
    repository_url: Optional[str] = None


class MeetingJoinRequest(BaseModel):
    display_name: str
    passcode: Optional[str] = None


class MeetingJoinResponse(BaseModel):
    participant_id: str
    meeting_id: str
    livekit_token: str
    livekit_url: Optional[str] = None
    role: str
    participant_token: Optional[str] = None


class MeetingLeaveRequest(BaseModel):
    participant_id: str
    participant_token: Optional[str] = None


class MeetingLeaveResponse(BaseModel):
    participant_id: str
    meeting_id: str
    status: str = "left"


class MeetingPublicResolveResponse(BaseModel):
    meeting_id: str
    short_code: str
    title: str
    host_display_name: str
    requires_passcode: bool = False
    status: str


class MeetingRecipientInput(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    login: Optional[str] = None


class MeetingInvitationsRequest(BaseModel):
    host_name: str
    host_email: str
    repo_name: str
    recipients: List[MeetingRecipientInput] = []
    custom_message: Optional[str] = None
    external_meeting_url: Optional[str] = None


class MeetingInvitationResultRecipient(BaseModel):
    recipient_name: str
    recipient_email: str
    status: str
    timestamp: Optional[str] = None


class MeetingInvitationsResponse(BaseModel):
    status: str
    meeting_id: str
    short_code: Optional[str] = None
    total_sent: int = 0
    recipients: List[MeetingInvitationResultRecipient] = []
    broadcast_message: Optional[str] = None


class ProfileStatsResponse(BaseModel):
    meetings_hosted: int = 0
    active_meetings: int = 0
    total_participants: int = 0


class ProfileActivityItem(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    timestamp: Optional[datetime] = None
    kind: str = "created"


class ProfileActivityResponse(BaseModel):
    items: List[ProfileActivityItem] = []
