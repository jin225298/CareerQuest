from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.achievement import AchievementService
from app.schemas.achievement import (
    AchievementListResponse,
    AchievementStatsResponse,
    AchievementUnlockResponse,
)

router = APIRouter(prefix="/achievements", tags=["achievements"])

DEFAULT_USER_ID = "default_user"


@router.get("", response_model=AchievementListResponse)
async def get_achievements(db: AsyncSession = Depends(get_db)):
    service = AchievementService(db)
    return await service.get_achievements(DEFAULT_USER_ID)


@router.get("/pending", response_model=list[AchievementUnlockResponse])
async def get_pending_achievements(db: AsyncSession = Depends(get_db)):
    service = AchievementService(db)
    return await service.get_pending_achievements(DEFAULT_USER_ID)


@router.post("/{achievement_id}/notify")
async def mark_achievement_notified(
    achievement_id: int, db: AsyncSession = Depends(get_db)
):
    service = AchievementService(db)
    success = await service.mark_as_notified(DEFAULT_USER_ID, achievement_id)

    if not success:
        raise HTTPException(status_code=404, detail="Achievement not found")

    return {"success": True}
