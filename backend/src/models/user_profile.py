import json
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    clerk_user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    skills_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    @property
    def skills(self) -> list[str]:
        if not self.skills_json:
            return []
        try:
            parsed = json.loads(self.skills_json)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        except json.JSONDecodeError:
            pass
        return []


class UserProfileResponse(BaseModel):
    clerk_user_id: str
    bio: Optional[str] = None
    skills: list[str] = Field(default_factory=list)


class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bio: Optional[str] = Field(default=None, max_length=2000)
    skills: Optional[list[str]] = Field(default=None, max_length=50)
