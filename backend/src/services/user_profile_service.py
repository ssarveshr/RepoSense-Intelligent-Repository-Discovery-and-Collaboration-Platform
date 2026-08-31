from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user_profile import UserProfileResponse, UserProfileUpdate
from src.repositories.user_profile_repository import UserProfileRepository


class UserProfileService:
    def __init__(self, session: AsyncSession):
        self.repository = UserProfileRepository(session)

    async def get_profile(self, clerk_user_id: str) -> UserProfileResponse:
        profile = await self.repository.get_by_clerk_user_id(clerk_user_id)
        if profile is None:
            return UserProfileResponse(clerk_user_id=clerk_user_id)
        return UserProfileResponse(
            clerk_user_id=profile.clerk_user_id,
            bio=profile.bio,
            skills=profile.skills,
        )

    async def update_profile(self, clerk_user_id: str, payload: UserProfileUpdate) -> UserProfileResponse:
        bio = payload.bio if payload.bio is not None else None
        skills = payload.skills if payload.skills is not None else []
        profile = await self.repository.upsert(clerk_user_id, bio=bio, skills=skills)
        return UserProfileResponse(
            clerk_user_id=profile.clerk_user_id,
            bio=profile.bio,
            skills=profile.skills,
        )
