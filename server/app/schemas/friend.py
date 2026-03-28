from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SendFriendRequest(BaseModel):
    to_user_id: str
    message: Optional[str] = None


class FriendRequestResponse(BaseModel):
    id: int
    from_user_id: str
    to_user_id: str
    status: str
    message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class FriendResponse(BaseModel):
    id: int
    friend_id: str
    friend_nickname: str
    friend_power: int
    friend_mood: int
    interview_count: int
    avg_score: float
    created_at: datetime

    class Config:
        from_attributes = True


class InviteInterviewRequest(BaseModel):
    to_user_id: str
    interview_type: Optional[str] = "hr"
    position: Optional[str] = None


class CompareResult(BaseModel):
    my_stats: dict
    friend_stats: dict
    dimensions_comparison: dict
