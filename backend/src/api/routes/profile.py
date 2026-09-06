from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps.clerk_auth import ClerkUser, require_clerk_user
from src.db import get_session
from src.models.meeting import ProfileActivityResponse
from src.models.user_profile import UserProfileResponse, UserProfileUpdate
from src.services.profile_service import ProfileService
from src.services.user_profile_service import UserProfileService

router = APIRouter(prefix="/api/profile", tags=["profile"])


async def get_profile_service(
    session: AsyncSession = Depends(get_session),
) -> ProfileService:
    return ProfileService(session)


async def get_user_profile_service(
    session: AsyncSession = Depends(get_session),
) -> UserProfileService:
    return UserProfileService(session)


@router.get("", response_model=UserProfileResponse)
async def get_profile(
    clerk_user: ClerkUser = Depends(require_clerk_user),
    service: UserProfileService = Depends(get_user_profile_service),
) -> UserProfileResponse:
    return await service.get_profile(clerk_user.user_id)


@router.patch("", response_model=UserProfileResponse)
async def update_profile(
    payload: UserProfileUpdate,
    clerk_user: ClerkUser = Depends(require_clerk_user),
    service: UserProfileService = Depends(get_user_profile_service),
) -> UserProfileResponse:
    return await service.update_profile(clerk_user.user_id, payload)


@router.get("/activity", response_model=ProfileActivityResponse)
async def get_profile_activity(
    clerk_user: ClerkUser = Depends(require_clerk_user),
    service: ProfileService = Depends(get_profile_service),
) -> ProfileActivityResponse:
    return await service.get_activity(clerk_user.user_id)
