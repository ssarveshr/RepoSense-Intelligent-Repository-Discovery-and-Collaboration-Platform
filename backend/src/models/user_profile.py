import uuid
from typing import Optional, List
from pydantic import BaseModel
from sqlalchemy import Column, String
from src.db import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    clerk_user_id = Column(String(64), unique=True, index=True, nullable=False)
    bio = Column(String(512), nullable=True)
    skills_json = Column(String(1024), nullable=True)


class UserProfileUpdate(BaseModel):
    bio: Optional[str] = None
    skills: List[str] = []


class UserProfileResponse(BaseModel):
    clerk_user_id: str
    bio: Optional[str] = None
    skills: List[str] = []
