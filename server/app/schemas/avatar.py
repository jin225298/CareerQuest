from pydantic import BaseModel
from typing import Optional, Dict, Any
from enum import Enum


class EmotionUrls(BaseModel):
    gif: str
    png: str


class MultiEmotionAvatarResponse(BaseModel):
    avatar_id: str
    emotions: Dict[str, EmotionUrls]
    metadata: Dict[str, Any]


class AvatarStyle(str, Enum):
    professional = "professional"
    casual = "casual"
    creative = "creative"


class GenerateAvatarRequest(BaseModel):
    career: str
    style: Optional[AvatarStyle] = AvatarStyle.professional


class AvatarResponse(BaseModel):
    avatar_id: str
    sprite_url: str
    preview_url: str
    metadata: Dict[str, Any]


class UploadAvatarResponse(BaseModel):
    task_id: str
    message: str


class TaskStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class AvatarTaskStatus(BaseModel):
    task_id: str
    status: TaskStatus
    progress: int
    result: Optional[MultiEmotionAvatarResponse] = None
    error: Optional[str] = None
