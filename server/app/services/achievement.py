from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from app.models.achievement import (
    Achievement,
    UserAchievement,
    UserStreak,
    UserLoginLog,
)
from app.models import Interview
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

ACHIEVEMENT_DATA = [
    {
        "code": "first_interview",
        "name": "初出茅庐",
        "description": "完成第一次面试",
        "icon": "trophy",
        "category": "milestone",
        "rarity": "common",
        "reward_power": 10,
        "reward_mood": 5,
        "sort_order": 1,
    },
    {
        "code": "interviewer_10",
        "name": "面试达人",
        "description": "完成10次面试",
        "icon": "briefcase",
        "category": "milestone",
        "rarity": "rare",
        "reward_power": 30,
        "reward_mood": 15,
        "sort_order": 2,
    },
    {
        "code": "interviewer_50",
        "name": "面试专家",
        "description": "完成50次面试",
        "icon": "award",
        "category": "milestone",
        "rarity": "epic",
        "reward_power": 100,
        "reward_mood": 50,
        "sort_order": 3,
    },
    {
        "code": "perfect_score",
        "name": "完美表现",
        "description": "面试得分达到95分以上",
        "icon": "star",
        "category": "performance",
        "rarity": "epic",
        "reward_power": 50,
        "reward_mood": 30,
        "sort_order": 4,
    },
    {
        "code": "streak_3",
        "name": "稳定发挥",
        "description": "连续3次面试得分达到80分以上",
        "icon": "flame",
        "category": "streak",
        "rarity": "rare",
        "reward_power": 20,
        "reward_mood": 10,
        "sort_order": 5,
    },
    {
        "code": "streak_5",
        "name": "状态火热",
        "description": "连续5次面试得分达到80分以上",
        "icon": "zap",
        "category": "streak",
        "rarity": "epic",
        "reward_power": 40,
        "reward_mood": 20,
        "sort_order": 6,
    },
    {
        "code": "quick_finish",
        "name": "速战速决",
        "description": "在5分钟内完成面试",
        "icon": "clock",
        "category": "special",
        "rarity": "rare",
        "reward_power": 15,
        "reward_mood": 10,
        "sort_order": 7,
    },
    {
        "code": "marathon",
        "name": "马拉松式",
        "description": "面试对话达到10轮以上",
        "icon": "message-circle",
        "category": "special",
        "rarity": "rare",
        "reward_power": 15,
        "reward_mood": 10,
        "sort_order": 8,
    },
    {
        "code": "low_stress",
        "name": "从容应对",
        "description": "全程压力值保持在30以下",
        "icon": "shield",
        "category": "special",
        "rarity": "rare",
        "reward_power": 20,
        "reward_mood": 15,
        "sort_order": 9,
    },
    {
        "code": "weekly_login",
        "name": "坚持不懈",
        "description": "连续7天登录",
        "icon": "calendar",
        "category": "login",
        "rarity": "epic",
        "reward_power": 50,
        "reward_mood": 30,
        "sort_order": 10,
    },
]


class AchievementService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def init_achievements(self):
        existing = await self.db.scalar(select(func.count(Achievement.id)))
        if existing > 0:
            return

        for data in ACHIEVEMENT_DATA:
            achievement = Achievement(**data)
            self.db.add(achievement)
        await self.db.commit()
        logger.info("Initialized achievements data")

    async def get_achievements(self, user_id: str) -> Dict:
        await self.init_achievements()

        achievements = await self.db.execute(
            select(Achievement).order_by(Achievement.sort_order)
        )
        achievements = achievements.scalars().all()

        user_achievements = await self.db.execute(
            select(UserAchievement).where(UserAchievement.user_id == user_id)
        )
        user_achievements = {
            ua.achievement_id: ua for ua in user_achievements.scalars().all()
        }

        result = []
        unlocked_count = 0

        for ach in achievements:
            ua = user_achievements.get(ach.id)
            is_unlocked = ua is not None

            if is_unlocked:
                unlocked_count += 1

            result.append(
                {
                    "id": ach.id,
                    "code": ach.code,
                    "name": ach.name,
                    "description": ach.description,
                    "icon": ach.icon,
                    "category": ach.category,
                    "rarity": ach.rarity,
                    "reward_power": ach.reward_power,
                    "reward_mood": ach.reward_mood,
                    "is_unlocked": is_unlocked,
                    "unlocked_at": ua.unlocked_at if ua else None,
                }
            )

        return {
            "achievements": result,
            "total_count": len(result),
            "unlocked_count": unlocked_count,
        }

    async def get_pending_achievements(self, user_id: str) -> List[Dict]:
        result = await self.db.execute(
            select(UserAchievement)
            .options(selectinload(UserAchievement.achievement))
            .where(
                and_(
                    UserAchievement.user_id == user_id,
                    UserAchievement.is_notified == False,
                )
            )
        )
        pending = result.scalars().all()

        return [
            {
                "id": ua.achievement.id,
                "code": ua.achievement.code,
                "name": ua.achievement.name,
                "description": ua.achievement.description,
                "icon": ua.achievement.icon,
                "rarity": ua.achievement.rarity,
                "reward_power": ua.achievement.reward_power,
                "reward_mood": ua.achievement.reward_mood,
            }
            for ua in pending
        ]

    async def mark_as_notified(self, user_id: str, achievement_id: int) -> bool:
        result = await self.db.execute(
            select(UserAchievement).where(
                and_(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement_id,
                )
            )
        )
        ua = result.scalar_one_or_none()

        if ua:
            ua.is_notified = True
            ua.notified_at = datetime.utcnow()
            await self.db.commit()
            return True
        return False

    async def check_interview_achievements(
        self, user_id: str, interview_data: Dict
    ) -> List[Dict]:
        await self.init_achievements()
        unlocked = []

        achievements_to_check = [
            ("first_interview", self._detect_first_interview),
            ("interviewer_10", self._detect_interviewer_10),
            ("interviewer_50", self._detect_interviewer_50),
            ("perfect_score", self._detect_perfect_score),
            ("streak_3", self._detect_streak_3),
            ("streak_5", self._detect_streak_5),
            ("quick_finish", self._detect_quick_finish),
            ("marathon", self._detect_marathon),
            ("low_stress", self._detect_low_stress),
        ]

        score = interview_data.get("score", 0)
        await self._update_high_score_streak(user_id, score)

        for code, detector in achievements_to_check:
            if await detector(user_id, interview_data):
                achievement = await self._unlock_achievement(user_id, code)
                if achievement:
                    unlocked.append(achievement)

        return unlocked

    async def check_login_achievements(self, user_id: str) -> List[Dict]:
        await self.init_achievements()
        await self._record_login(user_id)

        unlocked = []
        if await self._detect_weekly_login(user_id):
            achievement = await self._unlock_achievement(user_id, "weekly_login")
            if achievement:
                unlocked.append(achievement)

        return unlocked

    async def _unlock_achievement(self, user_id: str, code: str) -> Optional[Dict]:
        achievement = await self.db.scalar(
            select(Achievement).where(Achievement.code == code)
        )

        if not achievement:
            return None

        existing = await self.db.scalar(
            select(UserAchievement).where(
                and_(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement.id,
                )
            )
        )

        if existing:
            return None

        ua = UserAchievement(
            user_id=user_id,
            achievement_id=achievement.id,
        )
        self.db.add(ua)
        await self.db.commit()

        logger.info(f"User {user_id} unlocked achievement: {code}")

        return {
            "id": achievement.id,
            "code": achievement.code,
            "name": achievement.name,
            "description": achievement.description,
            "icon": achievement.icon,
            "rarity": achievement.rarity,
            "reward_power": achievement.reward_power,
            "reward_mood": achievement.reward_mood,
        }

    async def _detect_first_interview(self, user_id: str, interview_data: Dict) -> bool:
        count = await self.db.scalar(
            select(func.count(Interview.id)).where(Interview.user_id == user_id)
        )
        return count == 1

    async def _detect_interviewer_10(self, user_id: str, interview_data: Dict) -> bool:
        count = await self.db.scalar(
            select(func.count(Interview.id))
            .where(Interview.user_id == user_id)
            .where(Interview.score.isnot(None))
        )
        return count >= 10

    async def _detect_interviewer_50(self, user_id: str, interview_data: Dict) -> bool:
        count = await self.db.scalar(
            select(func.count(Interview.id))
            .where(Interview.user_id == user_id)
            .where(Interview.score.isnot(None))
        )
        return count >= 50

    async def _detect_perfect_score(self, user_id: str, interview_data: Dict) -> bool:
        return interview_data.get("score", 0) >= 95

    async def _detect_streak_3(self, user_id: str, interview_data: Dict) -> bool:
        streak = await self._get_high_score_streak(user_id)
        return streak >= 3

    async def _detect_streak_5(self, user_id: str, interview_data: Dict) -> bool:
        streak = await self._get_high_score_streak(user_id)
        return streak >= 5

    async def _detect_quick_finish(self, user_id: str, interview_data: Dict) -> bool:
        duration = interview_data.get("duration_seconds", 0)
        return 0 < duration <= 300

    async def _detect_marathon(self, user_id: str, interview_data: Dict) -> bool:
        history = interview_data.get("history", [])
        user_messages = [m for m in history if m.get("role") == "user"]
        return len(user_messages) >= 10

    async def _detect_low_stress(self, user_id: str, interview_data: Dict) -> bool:
        max_stress = interview_data.get("max_stress", 100)
        return max_stress < 30

    async def _detect_weekly_login(self, user_id: str) -> bool:
        streak = await self._get_login_streak(user_id)
        return streak >= 7

    async def _get_high_score_streak(self, user_id: str) -> int:
        streak = await self.db.scalar(
            select(UserStreak).where(UserStreak.user_id == user_id)
        )
        return streak.high_score_streak if streak else 0

    async def _update_high_score_streak(self, user_id: str, score: float):
        streak = await self.db.scalar(
            select(UserStreak).where(UserStreak.user_id == user_id)
        )

        if not streak:
            streak = UserStreak(user_id=user_id)
            self.db.add(streak)

        if score >= 80:
            streak.high_score_streak = (streak.high_score_streak or 0) + 1
            streak.last_high_score_date = datetime.utcnow()
        else:
            streak.high_score_streak = 0
            streak.last_high_score_date = None

        await self.db.commit()

    async def _get_login_streak(self, user_id: str) -> int:
        today = datetime.utcnow().date()

        logs = await self.db.execute(
            select(UserLoginLog.login_date)
            .where(UserLoginLog.user_id == user_id)
            .where(UserLoginLog.login_date >= today - timedelta(days=7))
            .order_by(UserLoginLog.login_date.desc())
        )
        dates = [row[0] for row in logs.fetchall()]

        if not dates or dates[0] != today:
            return 0

        streak = 1
        for i in range(len(dates) - 1):
            if (dates[i] - dates[i + 1]).days == 1:
                streak += 1
            else:
                break

        return streak

    async def _record_login(self, user_id: str):
        today = datetime.utcnow().date()

        existing = await self.db.scalar(
            select(UserLoginLog).where(
                and_(UserLoginLog.user_id == user_id, UserLoginLog.login_date == today)
            )
        )

        if not existing:
            log = UserLoginLog(user_id=user_id, login_date=today)
            self.db.add(log)
            await self.db.commit()
