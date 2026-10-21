import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class GitHubConnection(Base):
    __tablename__ = "github_connections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    clerk_user_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    github_user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    github_login: Mapped[str] = mapped_column(String(255), nullable=False)
    github_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    github_avatar_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    access_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    token_type: Mapped[str] = mapped_column(String(32), nullable=False, default="bearer")
    scope: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class GitHubOAuthState(Base):
    __tablename__ = "github_oauth_states"

    state: Mapped[str] = mapped_column(String(128), primary_key=True)
    clerk_user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class GitHubConnectionStatus(str, enum.Enum):
    connected = "connected"
    disconnected = "disconnected"
    expired = "expired"


class GitHubUserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    login: str
    name: str | None = None
    avatar_url: str | None = None


class GitHubConnectionResponse(BaseModel):
    connected: bool = False
    github_user: GitHubUserPublic | None = None
    scope: str | None = None
    scopes: list[str] = Field(default_factory=list)
    permissions_status: str | None = None
