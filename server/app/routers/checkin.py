from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.schemas.checkin import (
    CheckInCreate,
    CheckInResponse,
    StreakResponse,
    CalendarResponse,
    LeaderboardItem,
)
from app.services.checkin_service import CheckInService

router = APIRouter(prefix="/checkin")


@router.post("", response_model=CheckInResponse)
async def check_in(
    data: CheckInCreate,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    service = CheckInService(db)

    try:
        result = await service.check_in(
            user_id=uid,
            check_type=data.check_type,
            notes=data.notes,
        )
        return CheckInResponse(
            id=result["id"],
            user_id=result["user_id"],
            check_date=result["check_date"],
            check_type=result["check_type"],
            notes=result["notes"],
            power_gained=result["power_gained"],
            mood_gained=result["mood_gained"],
            created_at=result["created_at"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/today")
async def get_today_status(
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    service = CheckInService(db)

    result = await service.get_today_status(uid)
    return result


@router.get("/streak", response_model=StreakResponse)
async def get_streak(
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    service = CheckInService(db)

    result = await service.get_streak(uid)
    return StreakResponse(**result)


@router.get("/calendar", response_model=CalendarResponse)
async def get_calendar(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    service = CheckInService(db)

    result = await service.get_calendar(uid, year, month)
    return CalendarResponse(**result)


@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    service = CheckInService(db)

    result = await service.get_leaderboard(limit)
    return [LeaderboardItem(**item) for item in result]
