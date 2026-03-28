from pydantic import BaseModel
from typing import Optional
from enum import Enum


class VoiceSessionStatus(str, Enum):
    idle = "idle"
    connecting = "connecting"
    active = "active"
    ended = "ended"


class StartVoiceSessionRequest(BaseModel):
    position: Optional[str] = None
    company: Optional[str] = None


class VoiceSessionResponse(BaseModel):
    session_id: str
    status: VoiceSessionStatus
    message: str


class AudioChunkResponse(BaseModel):
    session_id: str
    transcript: str
    ai_response: str
    is_speaking: bool


class VoiceSessionStatusResponse(BaseModel):
    session_id: str
    status: VoiceSessionStatus
    duration_seconds: int
    message_count: int
