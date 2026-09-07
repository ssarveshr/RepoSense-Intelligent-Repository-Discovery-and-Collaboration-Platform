from datetime import datetime, timezone
import uuid
from typing import Optional, List
from pydantic import BaseModel
from sqlalchemy import Column, DateTime, String

from src.db import Base


# Pydantic Schemas
class GitHubUserPublic(BaseModel):
    id: Optional[str] = None
    login: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class GitHubConnectionResponse(BaseModel):
    connected: bool = False
    github_user: Optional[GitHubUserPublic] = None
    scope: Optional[str] = None
    scopes: List[str] = []
    permissions_status: Optional[str] = None


# SQLAlchemy ORM Models
class GitHubConnection(Base):
    __tablename__ = "github_connections"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    clerk_user_id = Column(String(64), unique=True, index=True, nullable=False)
    github_user_id = Column(String(64), nullable=False)
    github_login = Column(String(128), nullable=False)
    github_name = Column(String(128), nullable=True)
    github_avatar_url = Column(String(512), nullable=True)
    access_token_encrypted = Column(String(512), nullable=False)
    token_type = Column(String(32), default="bearer")
    scope = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime(timezone=True), nullable=True)


class GitHubOAuthState(Base):
    __tablename__ = "github_oauth_states"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    state = Column(String(128), unique=True, index=True, nullable=False)
    clerk_user_id = Column(String(64), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    used_at = Column(DateTime(timezone=True), nullable=True)
