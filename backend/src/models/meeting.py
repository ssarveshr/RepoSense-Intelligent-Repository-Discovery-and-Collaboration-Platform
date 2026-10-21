import enum
import hashlib
import secrets
import string
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db import Base


class MeetingStatus(str, enum.Enum):
    scheduled = "scheduled"
    active = "active"
    ended = "ended"


class ParticipantRole(str, enum.Enum):
    host = "host"
    co_host = "co_host"
    participant = "participant"


def _generate_short_code() -> str:
    """Human-readable RepoSense Meeting ID (e.g. RS-7K4P92)."""
    alphabet = string.ascii_uppercase + string.digits
    for char in "O0I1":
        alphabet = alphabet.replace(char, "")
    segment = "".join(secrets.choice(alphabet) for _ in range(6))
    return f"RS-{segment}"


def normalize_meeting_id_input(identifier: str) -> str:
    """Normalize user-entered meeting IDs for lookup (case-insensitive)."""
    cleaned = identifier.strip().upper().replace(" ", "")
    if cleaned.startswith("RS-"):
        return cleaned
    if cleaned.startswith("RS") and len(cleaned) > 2:
        return f"RS-{cleaned[2:].lstrip('-')}"
    if len(cleaned.replace("-", "")) == 8 and "-" in cleaned:
        return cleaned
    if len(cleaned.replace("-", "")) == 8:
        return f"{cleaned[:4]}-{cleaned[4:]}"
    return cleaned


def generate_participant_token() -> str:
    return secrets.token_urlsafe(32)


def hash_participant_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_participant_token(token: str | None, token_hash: str | None) -> bool:
    if not token or not token_hash:
        return False
    return hash_participant_token(token) == token_hash


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    short_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, default=_generate_short_code)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    host_display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    host_clerk_user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    passcode_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default=MeetingStatus.scheduled.value)
    max_participants: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    empty_since: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    repository_owner: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    repository_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    repository_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)

    participants: Mapped[list["Participant"]] = relationship(
        "Participant",
        back_populates="meeting",
        cascade="all, delete-orphan",
    )


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
    )
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default=ParticipantRole.participant.value)
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    left_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    leave_token_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="participants")


class MeetingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=255)
    host_display_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    passcode: Optional[str] = Field(default=None, min_length=4, max_length=64)
    max_participants: int = Field(default=0, ge=0, le=100)
    expires_at: Optional[datetime] = None
    repository_owner: Optional[str] = None
    repository_name: Optional[str] = None
    repository_url: Optional[str] = None


class ParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    meeting_id: str
    display_name: str
    role: str
    joined_at: Optional[datetime] = None
    left_at: Optional[datetime] = None


class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    short_code: str
    title: str
    host_display_name: str
    host_clerk_user_id: Optional[str] = None
    status: str
    max_participants: int
    created_at: datetime
    expires_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    repository_owner: Optional[str] = None
    repository_name: Optional[str] = None
    repository_url: Optional[str] = None
    participants: list[ParticipantResponse] = Field(default_factory=list)


class MeetingJoinRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(..., min_length=1, max_length=255)
    passcode: Optional[str] = None


class MeetingJoinResponse(BaseModel):
    token: str
    livekit_url: str
    room_name: str
    participant_id: str
    participant_token: str
    is_host: bool = False


class MeetingLeaveRequest(BaseModel):
    participant_id: str
    participant_token: str


class MeetingLeaveResponse(BaseModel):
    participant: ParticipantResponse
    meeting_status: str
    auto_ended: bool = False


class MeetingPublicResolveResponse(BaseModel):
    id: str
    short_code: str
    title: str
    status: str
    passcode_required: bool = False
    is_joinable: bool = True


class MeetingRecipientInput(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: Optional[str] = None
    email: Optional[str] = None
    github_login: Optional[str] = None
    github_user_id: Optional[str] = None


class MeetingInvitationsRequest(BaseModel):
    host_name: str
    host_email: str
    repo_name: str
    recipients: list[MeetingRecipientInput] = Field(default_factory=list)
    custom_message: Optional[str] = None
    external_meeting_url: Optional[str] = None


class MeetingInvitationResultRecipient(BaseModel):
    model_config = ConfigDict(extra="allow")

    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    status: str
    timestamp: Optional[str] = None


class MeetingInvitationsResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    meeting_id: str
    short_code: Optional[str] = None
    recipients: list[MeetingInvitationResultRecipient] = Field(default_factory=list)


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
    items: list[ProfileActivityItem] = Field(default_factory=list)
