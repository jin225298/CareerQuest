import logging
from typing import List, Dict, Optional
from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.models import User
from app.models.checkin import CheckIn, CheckInStreak

logger = logging.getLogger(__name__)

POWER_BASE = 10
MOOD_BASE = 5

STREAK_BONUS = {
    1: 1.0,
    2: 1.2,
    3: 1.4,
    4: 1.6,
    5: 1.8,
    6: 2.0,
    7: 2.5,
}


class CheckInService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_in(
        self, user_id: str, check_type: str = "daily", notes: Optional[str] = None
    ) -> Dict:
        today = date.today()

        existing = await self.db.scalar(
            select(CheckIn).where(
                and_(CheckIn.user_id == user_id, CheckIn.check_date == today)
            )
        )

        if existing:
            raise ValueError("Already checked in today")

        streak = await self._get_or_create_streak(user_id)
        multiplier = STREAK_BONUS.get(min(streak.current_streak + 1, 7), 2.5)

        power_gained = int(POWER_BASE * multiplier)
        mood_gained = int(MOOD_BASE * multiplier)

        check_in = CheckIn(
            user_id=user_id,
            check_date=today,
            check_type=check_type,
            notes=notes,
            power_gained=power_gained,
            mood_gained=mood_gained,
        )
        self.db.add(check_in)

        await self._update_streak(user_id, streak)

        user = await self.db.scalar(select(User).where(User.user_id == user_id))
        if user:
            user.power = min(100, user.power + power_gained)
            user.mood = min(100, user.mood + mood_gained)

        await self.db.commit()
        await self.db.refresh(check_in)

        return {
            "id": check_in.id,
            "user_id": check_in.user_id,
            "check_date": check_in.check_date,
            "check_type": check_in.check_type,
            "notes": check_in.notes,
            "power_gained": power_gained,
            "mood_gained": mood_gained,
            "created_at": check_in.created_at,
            "streak": streak.current_streak,
            "multiplier": multiplier,
        }

    async def get_today_status(self, user_id: str) -> Dict:
        today = date.today()

        check_in = await self.db.scalar(
            select(CheckIn).where(
                and_(CheckIn.user_id == user_id, CheckIn.check_date == today)
            )
        )

        return {
            "checked_in": check_in is not None,
            "check_in": check_in,
        }

    async def get_streak(self, user_id: str) -> Dict:
        streak = await self.db.scalar(
            select(CheckInStreak).where(CheckInStreak.user_id == user_id)
        )

        today = date.today()
        today_checked_in = False

        if streak:
            today_check = await self.db.scalar(
                select(CheckIn).where(
                    and_(CheckIn.user_id == user_id, CheckIn.check_date == today)
                )
            )
            today_checked_in = today_check is not None

        return {
            "current_streak": streak.current_streak if streak else 0,
            "longest_streak": streak.longest_streak if streak else 0,
            "total_check_ins": streak.total_check_ins if streak else 0,
            "last_check_date": streak.last_check_date if streak else None,
            "today_checked_in": today_checked_in,
        }

    async def get_calendar(self, user_id: str, year: int, month: int) -> Dict:
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)

        result = await self.db.execute(
            select(CheckIn.check_date).where(
                and_(
                    CheckIn.user_id == user_id,
                    CheckIn.check_date >= start_date,
                    CheckIn.check_date <= end_date,
                )
            )
        )

        checked_dates = [row[0].day for row in result.fetchall()]

        return {
            "year": year,
            "month": month,
            "checked_dates": sorted(checked_dates),
        }

    async def get_leaderboard(self, limit: int = 10) -> List[Dict]:
        result = await self.db.execute(
            select(CheckInStreak)
            .where(CheckInStreak.current_streak > 0)
            .order_by(CheckInStreak.current_streak.desc())
            .limit(limit)
        )
        streaks = result.scalars().all()

        leaderboard = []
        for rank, streak in enumerate(streaks, 1):
            user = await self.db.scalar(
                select(User).where(User.user_id == streak.user_id)
            )

            leaderboard.append(
                {
                    "user_id": streak.user_id,
                    "nickname": user.nickname if user else "未知用户",
                    "current_streak": streak.current_streak,
                    "total_check_ins": streak.total_check_ins,
                    "rank": rank,
                }
            )

        return leaderboard

    async def _get_or_create_streak(self, user_id: str) -> CheckInStreak:
        streak = await self.db.scalar(
            select(CheckInStreak).where(CheckInStreak.user_id == user_id)
        )

        if not streak:
            streak = CheckInStreak(user_id=user_id)
            self.db.add(streak)
            await self.db.flush()

        return streak

    async def _update_streak(self, user_id: str, streak: CheckInStreak):
        today = date.today()

        if streak.last_check_date:
            yesterday = today - timedelta(days=1)
            if streak.last_check_date == yesterday:
                streak.current_streak += 1
            elif streak.last_check_date < yesterday:
                streak.current_streak = 1
        else:
            streak.current_streak = 1

        if streak.current_streak > streak.longest_streak:
            streak.longest_streak = streak.current_streak

        streak.last_check_date = today
        streak.total_check_ins += 1
        streak.updated_at = datetime.utcnow()

        await self.db.flush()
