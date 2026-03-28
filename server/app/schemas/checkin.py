from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime


class CheckInCreate(BaseModel):
    check_type: Optional[str] = "daily"
    notes: Optional[str] = None


class CheckInResponse(BaseModel):
    id: int
    user_id: str
    check_date: date
    check_type: str
    notes: Optional[str]
    power_gained: int
    mood_gained: int
    created_at: datetime

    class Config:
        from_attributes = True


class StreakResponse(BaseModel):
    current_streak: int
    longest_streak: int
    total_check_ins: int
    last_check_date: Optional[date]
    today_checked_in: bool


class CalendarResponse(BaseModel):
    year: int
    month: int
    checked_dates: List[int]


class LeaderboardItem(BaseModel):
    user_id: str
    nickname: str
    current_streak: int
    total_check_ins: int
    rank: int
