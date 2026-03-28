from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User
from app.schemas.voice import (
    StartVoiceSessionRequest,
    VoiceSessionResponse,
    VoiceSessionStatusResponse,
    AudioChunkResponse,
    VoiceSessionStatus,
)
from app.services.voice import voice_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice"])

DEFAULT_USER_ID = "default_user"


async def get_or_create_user(db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.user_id == DEFAULT_USER_ID))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            user_id=DEFAULT_USER_ID,
            nickname="求职者",
            power=50,
            mood=70,
            hp=100,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


@router.post("/start", response_model=VoiceSessionResponse)
async def start_voice_session(
    request: StartVoiceSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    await get_or_create_user(db)

    session = voice_service.create_session(
        position=request.position,
        company=request.company,
    )

    voice_service.start_session(session.session_id)

    return VoiceSessionResponse(
        session_id=session.session_id,
        status=VoiceSessionStatus.active,
        message="Voice session started successfully. AI interviewer is ready.",
    )


@router.post("/audio", response_model=AudioChunkResponse)
async def upload_audio_chunk(
    session_id: str,
    audio: UploadFile = File(...),
):
    session = voice_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session is not active")

    audio_data = await audio.read()

    result = voice_service.process_audio(session_id, audio_data)

    return AudioChunkResponse(
        session_id=result["session_id"],
        transcript=result["transcript"],
        ai_response=result["ai_response"],
        is_speaking=result["is_speaking"],
    )


@router.post("/end", response_model=VoiceSessionResponse)
async def end_voice_session(
    session_id: str,
):
    result = voice_service.end_session(session_id)

    if not result:
        raise HTTPException(status_code=404, detail="Session not found")

    return VoiceSessionResponse(
        session_id=session_id,
        status=VoiceSessionStatus.ended,
        message="Voice session ended successfully.",
    )


@router.get("/{session_id}/status", response_model=VoiceSessionStatusResponse)
async def get_session_status(
    session_id: str,
):
    result = voice_service.get_status(session_id)

    if not result:
        raise HTTPException(status_code=404, detail="Session not found")

    return VoiceSessionStatusResponse(
        session_id=result["session_id"],
        status=VoiceSessionStatus(result["status"]),
        duration_seconds=result["duration_seconds"],
        message_count=result["message_count"],
    )
