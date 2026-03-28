from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    nickname: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    id: str
    power: int = 50
    mood: int = 70
    hp: int = 100
    wins: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class UserStats(BaseModel):
    total_interviews: int
    avg_score: float
    highest_score: float
    streak_days: int


class UserProfileData(BaseModel):
    career: Optional[str] = None
    experience: Optional[str] = None
    target_position: Optional[str] = None
    industry: Optional[str] = None
    company_type: Optional[str] = None
    salary_range: Optional[str] = None
    job_search_status: Optional[str] = None
    preparation_time: Optional[str] = None
    goals: List[str] = []
    weakness: List[str] = []
    style_preference: Optional[str] = None


class UserProfileResponse(BaseModel):
    user_id: str
    nickname: Optional[str] = None
    profile: UserProfileData
    is_profile_completed: bool = False
    profile_completed_at: Optional[datetime] = None
    tags: List[dict] = []


class UserProfileUpdate(BaseModel):
    career: Optional[str] = None
    experience: Optional[str] = None
    target_position: Optional[str] = None
    industry: Optional[str] = None
    company_type: Optional[str] = None
    salary_range: Optional[str] = None
    job_search_status: Optional[str] = None
    preparation_time: Optional[str] = None
    goals: Optional[List[str]] = None
    weakness: Optional[List[str]] = None
    style_preference: Optional[str] = None


class UserStatusResponse(BaseModel):
    is_new_user: bool
    is_profile_completed: bool
    recommended_action: str
