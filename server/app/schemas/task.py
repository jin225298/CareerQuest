from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TaskBase(BaseModel):
    task_type: str
    description: str
    target_count: int = 1
    reward_power: int = 10
    reward_mood: int = 5


class TaskCreate(TaskBase):
    pass


class TaskResponse(TaskBase):
    id: int
    user_id: str
    current_count: int
    is_completed: bool
    task_date: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskProgress(BaseModel):
    task_id: int
    increment: int = 1


class DailyTasksResponse(BaseModel):
    tasks: list[TaskResponse]
    total_completed: int
    total_tasks: int
    power_reward: int
    mood_reward: int
