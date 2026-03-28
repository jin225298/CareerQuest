import os
import uuid
import time
import asyncio
import sys
from pathlib import Path
from typing import Dict, Optional
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from concurrent.futures import ThreadPoolExecutor

from app.schemas.avatar import (
    GenerateAvatarRequest,
    AvatarResponse,
    UploadAvatarResponse,
    TaskStatus,
    AvatarTaskStatus,
    EmotionUrls,
    MultiEmotionAvatarResponse,
)
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/avatars")

TASKS: Dict[str, AvatarTaskStatus] = {}

STATIC_DIR = Path(__file__).parent.parent.parent / "static" / "avatars"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024

executor = ThreadPoolExecutor(max_workers=2)


def get_recommended_emotion(mood: int) -> str:
    if mood < 30:
        return "sad"
    elif mood <= 70:
        return "happy"
    else:
        return "excited"


def validate_image(file: UploadFile) -> None:
    ext = Path(file.filename).suffix.lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式。支持: {', '.join(ALLOWED_EXTENSIONS)}",
        )


def run_generation_sync(
    task_id: str, input_path: Path, output_dir: Path, user_id: Optional[str] = None
):
    import asyncio

    try:
        TASKS[task_id].status = TaskStatus.processing
        TASKS[task_id].progress = 5

        pixel_animator_path = (
            Path(__file__).parent.parent.parent.parent / "pixel_animator"
        )
        sys.path.insert(0, str(pixel_animator_path))

        from emotion_animator import generate_all_emotions

        TASKS[task_id].progress = 10

        reference_path = pixel_animator_path / "reference.png"
        if not reference_path.exists():
            raise Exception(f"参考图不存在: {reference_path}")

        TASKS[task_id].progress = 20

        print(f"🎨 生成所有情绪动画...")
        results = generate_all_emotions(
            reference_path=str(reference_path),
            character_path=str(input_path),
            output_dir=str(output_dir),
            emotions=["happy", "sad", "excited"],
            frames_per_emotion=8,
        )

        TASKS[task_id].progress = 90

        if not results:
            raise Exception("生成动画失败")

        avatar_id = f"avatar_{task_id}"

        emotions = {}
        for emotion in ["happy", "sad", "excited"]:
            if emotion in results:
                emotions[emotion] = EmotionUrls(
                    gif=f"/static/avatars/{task_id}/{emotion}.gif",
                    png=f"/static/avatars/{task_id}/{emotion}.png",
                )

        TASKS[task_id].result = MultiEmotionAvatarResponse(
            avatar_id=avatar_id,
            emotions=emotions,
            metadata={
                "original_filename": input_path.name,
                "emotions_generated": list(results.keys()) if results else [],
            },
        )

        TASKS[task_id].status = TaskStatus.completed
        TASKS[task_id].progress = 100
        print(f"✅ 头像生成完成: {task_id}")

        if user_id:
            try:
                from app.database import AsyncSessionLocal

                async def update_user_avatar():
                    async with AsyncSessionLocal() as session:
                        db_result = await session.execute(
                            select(User).where(User.user_id == user_id)
                        )
                        user = db_result.scalar_one_or_none()

                        if user:
                            if "happy" in results:
                                user.avatar_happy_gif = (
                                    f"/static/avatars/{task_id}/happy.gif"
                                )
                                user.avatar_happy_png = (
                                    f"/static/avatars/{task_id}/happy.png"
                                )
                            if "sad" in results:
                                user.avatar_sad_gif = (
                                    f"/static/avatars/{task_id}/sad.gif"
                                )
                                user.avatar_sad_png = (
                                    f"/static/avatars/{task_id}/sad.png"
                                )
                            if "excited" in results:
                                user.avatar_excited_gif = (
                                    f"/static/avatars/{task_id}/excited.gif"
                                )
                                user.avatar_excited_png = (
                                    f"/static/avatars/{task_id}/excited.png"
                                )

                            user.current_emotion = get_recommended_emotion(user.mood)
                            await session.commit()
                            print(f"✅ 已保存头像信息到用户: {user_id}")

                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(update_user_avatar())
                loop.close()
            except Exception as e:
                print(f"⚠️ 更新用户头像失败: {e}")

    except Exception as e:
        import traceback

        print(f"❌ 生成失败: {e}")
        print(f"详细错误: {traceback.format_exc()}")
        TASKS[task_id].status = TaskStatus.failed
        TASKS[task_id].error = str(e)


async def process_avatar_task(
    task_id: str, input_path: Path, output_dir: Path, user_id: Optional[str] = None
):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        executor, run_generation_sync, task_id, input_path, output_dir, user_id
    )


@router.post("/generate", response_model=AvatarResponse)
async def generate_avatar(request: GenerateAvatarRequest):
    return AvatarResponse(
        avatar_id=f"avatar_{int(time.time() * 1000)}",
        sprite_url="/assets/default-pixel-avatar.png",
        preview_url="/assets/default-pixel-avatar-preview.png",
        metadata={"career": request.career, "style": request.style.value},
    )


@router.post("/upload", response_model=UploadAvatarResponse)
async def upload_avatar(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: Optional[str] = None,
):
    validate_image(file)

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件大小超过5MB限制")

    task_id = str(uuid.uuid4())

    output_dir = STATIC_DIR / task_id
    output_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix.lower() if file.filename else ".png"
    input_path = output_dir / f"original{ext}"

    with open(input_path, "wb") as f:
        f.write(content)

    TASKS[task_id] = AvatarTaskStatus(
        task_id=task_id,
        status=TaskStatus.pending,
        progress=0,
    )

    background_tasks.add_task(
        process_avatar_task, task_id, input_path, output_dir, user_id
    )

    return UploadAvatarResponse(
        task_id=task_id,
        message="图片上传成功，正在后台处理",
    )


@router.get("/{task_id}/status", response_model=AvatarTaskStatus)
async def get_task_status(task_id: str):
    if task_id not in TASKS:
        raise HTTPException(status_code=404, detail="任务不存在")

    return TASKS[task_id]


@router.patch("/users/{user_id}/emotion")
async def set_avatar_emotion(
    user_id: str,
    emotion: str,
    db: AsyncSession = Depends(get_db),
):
    if emotion not in ["happy", "sad", "excited"]:
        raise HTTPException(status_code=400, detail="情绪必须是 happy, sad 或 excited")

    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    emotion_gif_field = f"avatar_{emotion}_gif"
    emotion_png_field = f"avatar_{emotion}_png"

    if not getattr(user, emotion_gif_field, None):
        raise HTTPException(status_code=400, detail=f"用户没有 {emotion} 情绪的头像")

    user.current_emotion = emotion
    await db.commit()

    return {
        "user_id": user_id,
        "current_emotion": emotion,
        "gif_url": getattr(user, emotion_gif_field),
        "png_url": getattr(user, emotion_png_field),
    }


@router.get("/users/{user_id}/emotion")
async def get_avatar_emotion(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    current_emotion = user.current_emotion or "happy"
    emotion_gif_field = f"avatar_{current_emotion}_gif"
    emotion_png_field = f"avatar_{current_emotion}_png"

    available_emotions = {}
    for emotion in ["happy", "sad", "excited"]:
        gif_field = f"avatar_{emotion}_gif"
        png_field = f"avatar_{emotion}_png"
        gif_url = getattr(user, gif_field, None)
        png_url = getattr(user, png_field, None)
        if gif_url and png_url:
            available_emotions[emotion] = EmotionUrls(gif=gif_url, png=png_url)

    gif_url = getattr(user, emotion_gif_field, None)
    png_url = getattr(user, emotion_png_field, None)

    return {
        "user_id": user_id,
        "current_emotion": current_emotion,
        "recommended_emotion": get_recommended_emotion(user.mood),
        "mood": user.mood,
        "preview_url": png_url,
        "sprite_url": gif_url,
        "available_emotions": available_emotions,
    }
