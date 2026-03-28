from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AchievementBase(BaseModel):
    code: str
    name: str
    description: str
    icon: str = "trophy"
    category: str = "milestone"
    rarity: str = "common"
    reward_power: int = 0
    reward_mood: int = 0


class AchievementResponse(AchievementBase):
    id: int
    is_unlocked: bool = False
    unlocked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AchievementListResponse(BaseModel):
    achievements: List[AchievementResponse]
    total_count: int
    unlocked_count: int


class AchievementStatsResponse(BaseModel):
    total_count: int
    unlocked_count: int
    total_power_rewarded: int
    total_mood_rewarded: int
    recent_unlocks: List[AchievementResponse]


class AchievementUnlockResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str
    icon: str
    rarity: str
    reward_power: int
    reward_mood: int

    class Config:
        from_attributes = True
