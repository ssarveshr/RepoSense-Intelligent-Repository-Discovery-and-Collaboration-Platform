import json
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user_profile import UserProfile


class UserProfileRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_clerk_user_id(self, clerk_user_id: str) -> Optional[UserProfile]:
        stmt = select(UserProfile).where(UserProfile.clerk_user_id == clerk_user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert(self, clerk_user_id: str, *, bio: Optional[str], skills: list[str]) -> UserProfile:
        profile = await self.get_by_clerk_user_id(clerk_user_id)
        cleaned_skills = [skill.strip() for skill in skills if skill and skill.strip()]
        skills_json = json.dumps(cleaned_skills) if cleaned_skills else None
        normalized_bio = bio.strip() if bio and bio.strip() else None

        if profile is None:
            profile = UserProfile(
                clerk_user_id=clerk_user_id,
                bio=normalized_bio,
                skills_json=skills_json,
            )
            self.session.add(profile)
        else:
            profile.bio = normalized_bio
            profile.skills_json = skills_json

        await self.session.flush()
        return profile
