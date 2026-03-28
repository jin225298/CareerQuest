from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CreateSessionRequest(BaseModel):
    npc_type: str = "teacher"


class SessionResponse(BaseModel):
    session_id: str
    npc_type: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    content: str


class RecommendedTask(BaseModel):
    id: int
    task_type: str
    title: str
    description: str
    reason: str
    reward_power: int
    reward_mood: int

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    recommended_task: Optional[RecommendedTask] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SessionDetailResponse(BaseModel):
    session_id: str
    npc_type: str
    status: str
    messages: List[MessageResponse]
    created_at: datetime
    ended_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskRecommendationResponse(BaseModel):
    id: int
    task_type: str
    title: str
    description: str
    reason: str
    status: str
    reward_power: int
    reward_mood: int
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TaskRecommendationListResponse(BaseModel):
    recommendations: List[TaskRecommendationResponse]
    total_count: int


class AcceptTaskResponse(BaseModel):
    id: int
    task_type: str
    title: str
    status: str
    reward_power: int
    reward_mood: int

    class Config:
        from_attributes = True
