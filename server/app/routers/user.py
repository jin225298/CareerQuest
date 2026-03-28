from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.schemas.user import (
    UserResponse,
    UserStats,
    UserProfileResponse,
    UserProfileUpdate,
    UserStatusResponse,
)
from app.schemas.survey import UserProfile, UserTagResponse
from app.database import get_db
from app.models import User
from app.services.tag_service import get_user_tags
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/users")


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    result = await db.execute(select(User).where(User.user_id == uid))
    user = result.scalar_one_or_none()

    if not user:
        user = User(user_id=uid, nickname="测试用户")
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return UserResponse(
        id=user.user_id,
        nickname=user.nickname,
        power=user.power,
        mood=user.mood,
        hp=user.hp,
        wins=user.wins,
        created_at=user.created_at,
    )


@router.get("/me/stats", response_model=UserStats)
async def get_user_stats():
    return UserStats(
        total_interviews=0, avg_score=0.0, highest_score=0.0, streak_days=0
    )


@router.get("/me/profile", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    result = await db.execute(select(User).where(User.user_id == uid))
    user = result.scalar_one_or_none()

    if not user:
        user = User(user_id=uid, nickname="测试用户")
        db.add(user)
        await db.commit()
        await db.refresh(user)

    from app.schemas.user import UserProfileData

    profile = UserProfileData(
        career=user.career,
        experience=user.experience,
        target_position=user.target_position,
        industry=user.industry,
        company_type=user.company_type,
        salary_range=user.salary_range,
        job_search_status=user.job_search_status,
        preparation_time=user.preparation_time,
        goals=user.goals or [],
        weakness=user.weakness or [],
        style_preference=user.style_preference,
    )

    tags = await get_user_tags(db, uid)
    tag_list = [
        {"tag_key": t.tag_key, "tag_value": t.tag_value, "tag_type": t.tag_type}
        for t in tags
    ]

    return UserProfileResponse(
        user_id=user.user_id,
        nickname=user.nickname,
        profile=profile,
        is_profile_completed=user.is_profile_completed or False,
        profile_completed_at=user.profile_completed_at,
        tags=tag_list,
    )


@router.put("/me/profile", response_model=UserProfileResponse)
async def update_user_profile(
    update_data: UserProfileUpdate,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    result = await db.execute(select(User).where(User.user_id == uid))
    user = result.scalar_one_or_none()

    if not user:
        user = User(user_id=uid, nickname="测试用户")
        db.add(user)
        await db.flush()

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if hasattr(user, key):
            setattr(user, key, value)

    await db.commit()
    await db.refresh(user)

    from app.schemas.user import UserProfileData

    profile = UserProfileData(
        career=user.career,
        experience=user.experience,
        target_position=user.target_position,
        industry=user.industry,
        company_type=user.company_type,
        salary_range=user.salary_range,
        job_search_status=user.job_search_status,
        preparation_time=user.preparation_time,
        goals=user.goals or [],
        weakness=user.weakness or [],
        style_preference=user.style_preference,
    )

    tags = await get_user_tags(db, uid)
    tag_list = [
        {"tag_key": t.tag_key, "tag_value": t.tag_value, "tag_type": t.tag_type}
        for t in tags
    ]

    return UserProfileResponse(
        user_id=user.user_id,
        nickname=user.nickname,
        profile=profile,
        is_profile_completed=user.is_profile_completed or False,
        profile_completed_at=user.profile_completed_at,
        tags=tag_list,
    )


@router.get("/me/status", response_model=UserStatusResponse)
async def get_user_status(
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    result = await db.execute(select(User).where(User.user_id == uid))
    user = result.scalar_one_or_none()

    is_new_user = user is None or not user.is_profile_completed
    is_profile_completed = user.is_profile_completed if user else False

    recommended_action = (
        "complete_profile" if not is_profile_completed else "start_interview"
    )

    return UserStatusResponse(
        is_new_user=is_new_user,
        is_profile_completed=is_profile_completed,
        recommended_action=recommended_action,
    )
