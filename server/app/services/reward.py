import logging
from typing import Dict, Optional
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models import User, DailyTask
from app.models.achievement import UserStreak

logger = logging.getLogger(__name__)

STREAK_BONUS = {
    1: 1.0,
    2: 1.1,
    3: 1.2,
    4: 1.3,
    5: 1.5,
    6: 1.7,
    7: 2.0,
}


class RewardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate_task_reward(
        self,
        user_id: str,
        base_power: int,
        base_mood: int,
        task_type: str = "general",
    ) -> Dict:
        streak = await self._get_task_streak(user_id)
        multiplier = STREAK_BONUS.get(min(streak, 7), 2.0)

        final_power = int(base_power * multiplier)
        final_mood = int(base_mood * multiplier)

        return {
            "base_power": base_power,
            "base_mood": base_mood,
            "streak": streak,
            "multiplier": multiplier,
            "final_power": final_power,
            "final_mood": final_mood,
        }

    async def apply_task_reward(
        self,
        user: User,
        power: int,
        mood: int,
        task_id: Optional[int] = None,
    ) -> Dict:
        streak_multiplier = await self._get_streak_multiplier(user.user_id)

        final_power = int(power * streak_multiplier)
        final_mood = int(mood * streak_multiplier)

        user.power = min(100, user.power + final_power)
        user.mood = min(100, user.mood + final_mood)

        await self._update_task_streak(user.user_id)

        if task_id:
            await self._mark_task_completed(task_id)

        await self.db.commit()

        return {
            "power_gained": final_power,
            "mood_gained": final_mood,
            "current_power": user.power,
            "current_mood": user.mood,
            "streak_multiplier": streak_multiplier,
        }

    async def get_user_stats(self, user_id: str) -> Dict:
        today = date.today().isoformat()

        completed_today = await self.db.scalar(
            select(DailyTask).where(
                and_(
                    DailyTask.user_id == user_id,
                    DailyTask.task_date == today,
                    DailyTask.is_completed == True,
                )
            )
        )

        streak = await self._get_task_streak(user_id)

        total_tasks = await self.db.scalar(
            select(DailyTask).where(DailyTask.user_id == user_id)
        )

        return {
            "task_streak": streak,
            "tasks_completed_today": completed_today or 0,
            "total_tasks_completed": total_tasks or 0,
            "current_multiplier": STREAK_BONUS.get(min(streak, 7), 2.0),
        }

    async def _get_task_streak(self, user_id: str) -> int:
        streak = await self.db.scalar(
            select(UserStreak).where(UserStreak.user_id == user_id)
        )

        if not streak:
            return 0

        last_date = streak.last_high_score_date
        if not last_date:
            return streak.high_score_streak or 0

        today = date.today()
        last_task_date = (
            last_date.date() if isinstance(last_date, datetime) else last_date
        )

        days_diff = (today - last_task_date).days

        if days_diff > 1:
            return 0

        return streak.high_score_streak or 0

    async def _get_streak_multiplier(self, user_id: str) -> float:
        streak = await self._get_task_streak(user_id)
        return STREAK_BONUS.get(min(streak, 7), 2.0)

    async def _update_task_streak(self, user_id: str):
        streak = await self.db.scalar(
            select(UserStreak).where(UserStreak.user_id == user_id)
        )

        if not streak:
            streak = UserStreak(user_id=user_id)
            self.db.add(streak)

        today = date.today()
        last_date = streak.last_high_score_date

        if last_date:
            last_task_date = (
                last_date.date() if isinstance(last_date, datetime) else last_date
            )
            days_diff = (today - last_task_date).days

            if days_diff == 1:
                streak.high_score_streak = (streak.high_score_streak or 0) + 1
            elif days_diff > 1:
                streak.high_score_streak = 1
        else:
            streak.high_score_streak = 1

        streak.last_high_score_date = datetime.utcnow()
        await self.db.commit()

    async def _mark_task_completed(self, task_id: int):
        task = await self.db.scalar(select(DailyTask).where(DailyTask.id == task_id))

        if task:
            task.is_completed = True
            task.completed_at = datetime.utcnow()

    async def check_achievement_triggers(self, user_id: str) -> list:
        streak = await self._get_task_streak(user_id)
        triggers = []

        if streak >= 3:
            triggers.append(
                {"type": "streak", "value": streak, "code": "task_streak_3"}
            )
        if streak >= 7:
            triggers.append(
                {"type": "streak", "value": streak, "code": "task_streak_7"}
            )

        return triggers
