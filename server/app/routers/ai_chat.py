from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.database import get_db
from app.models import User
from app.models.ai_chat import AiChatSession, AiChatMessage
from app.models.task_recommendation import TaskRecommendation
from app.schemas.ai_chat import (
    CreateSessionRequest,
    SessionResponse,
    SendMessageRequest,
    MessageResponse,
    SessionDetailResponse,
    RecommendedTask,
)
from app.services.volcengine import volcengine_service
from app.services.task_generator import task_generator
from datetime import datetime
import uuid
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-chat", tags=["ai-chat"])

DEFAULT_USER_ID = "default_user"
NPC_AVATAR = "/static/npcs/teacher.png"

NPC_SYSTEM_PROMPTS = {
    "teacher": """你是一位专业的职业发展导师，名为"小面"。你的职责是：
1. 帮助用户识别职业发展中的问题和机会
2. 根据用户的情况提供个性化的学习建议
3. 鼓励用户保持学习动力，提供情感支持
4. 在对话中自然地推荐适合的学习任务

回复要求：
- 语气亲切友好，像朋友一样交流
- 回答简洁有力，避免冗长
- 适时提出问题引导用户思考
- 发现用户需求时，主动推荐学习任务""",
    "interviewer": """你是一位资深的面试教练。你的职责是：
1. 帮助用户准备面试
2. 分析用户的面试表现并给出改进建议
3. 模拟常见面试场景
4. 提供面试技巧指导

回复要求：
- 专业但不过于严肃
- 给出具体可操作的建议
- 关注用户的实际需求""",
}


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


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    request: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await get_or_create_user(db)

    session_id = f"chat_{uuid.uuid4().hex[:12]}"
    session = AiChatSession(
        session_id=session_id,
        user_id=user.user_id,
        npc_type=request.npc_type,
        status="active",
        context={"npc_avatar": NPC_AVATAR},
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return SessionResponse(
        session_id=session.session_id,
        npc_type=session.npc_type,
        status=session.status,
        created_at=session.created_at,
    )


@router.post("/sessions/{session_id}/messages", response_model=MessageResponse)
async def send_message(
    session_id: str,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AiChatSession).where(AiChatSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session is not active")

    user_message = AiChatMessage(
        session_id=session_id,
        role="user",
        content=request.content,
    )
    db.add(user_message)
    await db.commit()

    history_result = await db.execute(
        select(AiChatMessage)
        .where(AiChatMessage.session_id == session_id)
        .order_by(AiChatMessage.created_at)
    )
    history = history_result.scalars().all()

    user = await get_or_create_user(db)

    messages = _build_messages(history, session.npc_type, user)

    try:
        assistant_content = volcengine_service.chat(messages)
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        assistant_content = "抱歉，我现在有点忙，请稍后再试。"

    recommended_task = None
    task_recommendation = None

    if _should_recommend_task(request.content, assistant_content):
        task_data = task_generator.generate_from_chat(
            user,
            [{"role": m.role, "content": m.content} for m in history[-6:]],
            session.npc_type,
        )

        if task_data:
            task_recommendation = TaskRecommendation(
                user_id=user.user_id,
                task_type=task_data.get("task_type", "knowledge"),
                title=task_data.get("title", "学习任务"),
                description=task_data.get("description", ""),
                reason=task_data.get("reason", "基于您的需求推荐"),
                source_session_id=session_id,
                reward_power=task_data.get("reward_power", 10),
                reward_mood=task_data.get("reward_mood", 5),
            )
            db.add(task_recommendation)
            await db.commit()
            await db.refresh(task_recommendation)

            recommended_task = RecommendedTask(
                id=task_recommendation.id,
                task_type=task_recommendation.task_type,
                title=task_recommendation.title,
                description=task_recommendation.description,
                reason=task_recommendation.reason,
                reward_power=task_recommendation.reward_power,
                reward_mood=task_recommendation.reward_mood,
            )

    assistant_message = AiChatMessage(
        session_id=session_id,
        role="assistant",
        content=assistant_content,
        recommended_task_id=task_recommendation.id if task_recommendation else None,
        metadata={"npc_avatar": NPC_AVATAR},
    )
    db.add(assistant_message)
    await db.commit()
    await db.refresh(assistant_message)

    return MessageResponse(
        id=assistant_message.id,
        role=assistant_message.role,
        content=assistant_message.content,
        recommended_task=recommended_task,
        created_at=assistant_message.created_at,
    )


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AiChatSession).where(AiChatSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages_result = await db.execute(
        select(AiChatMessage)
        .where(AiChatMessage.session_id == session_id)
        .order_by(AiChatMessage.created_at)
    )
    messages = messages_result.scalars().all()

    message_responses = []
    for msg in messages:
        recommended_task = None
        if msg.recommended_task_id:
            task_result = await db.execute(
                select(TaskRecommendation).where(
                    TaskRecommendation.id == msg.recommended_task_id
                )
            )
            task = task_result.scalar_one_or_none()
            if task:
                recommended_task = RecommendedTask(
                    id=task.id,
                    task_type=task.task_type,
                    title=task.title,
                    description=task.description,
                    reason=task.reason,
                    reward_power=task.reward_power,
                    reward_mood=task.reward_mood,
                )

        message_responses.append(
            MessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                recommended_task=recommended_task,
                created_at=msg.created_at,
            )
        )

    return SessionDetailResponse(
        session_id=session.session_id,
        npc_type=session.npc_type,
        status=session.status,
        messages=message_responses,
        created_at=session.created_at,
        ended_at=session.ended_at,
    )


@router.post("/sessions/{session_id}/end")
async def end_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AiChatSession).where(AiChatSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = "ended"
    session.ended_at = datetime.utcnow()
    await db.commit()

    return {"status": "ended", "session_id": session_id}


def _build_messages(history: list, npc_type: str, user: User) -> list:
    system_prompt = NPC_SYSTEM_PROMPTS.get(npc_type, NPC_SYSTEM_PROMPTS["teacher"])

    user_context = f"""
用户信息：
- 昵称：{user.nickname or "求职者"}
- 职业方向：{user.career or "未设置"}
- 目标职位：{user.target_position or "未设置"}
- 待提升：{", ".join(user.weakness) if user.weakness else "暂无"}
- 学习目标：{", ".join(user.goals) if user.goals else "暂无"}
"""

    messages = [{"role": "system", "content": system_prompt + user_context}]

    for msg in history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    return messages


def _should_recommend_task(user_message: str, assistant_response: str) -> bool:
    keywords = [
        "学习",
        "提升",
        "练习",
        "怎么",
        "如何",
        "建议",
        "推荐",
        "准备",
        "面试",
        "技能",
    ]
    return any(kw in user_message for kw in keywords)
