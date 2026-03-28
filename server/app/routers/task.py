from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.schemas.task import TaskResponse, TaskProgress, DailyTasksResponse
from app.schemas.ai_chat import (
    TaskRecommendationResponse,
    TaskRecommendationListResponse,
    AcceptTaskResponse,
)
from app.models import DailyTask, User
from app.models.task_recommendation import TaskRecommendation
from app.services.reward import RewardService
from app.services.task_generator import task_generator
from app.database import get_db
from datetime import datetime, date, timedelta
from typing import List
import uuid
import random

router = APIRouter(prefix="/tasks", tags=["tasks"])

TASK_TEMPLATES = [
    {
        "task_type": "interview",
        "description": "完成1次面试练习",
        "target_count": 1,
        "reward_power": 20,
        "reward_mood": 10,
    },
    {
        "task_type": "interview",
        "description": "完成3次面试练习",
        "target_count": 3,
        "reward_power": 50,
        "reward_mood": 25,
    },
    {
        "task_type": "survey",
        "description": "完善个人资料",
        "target_count": 1,
        "reward_power": 15,
        "reward_mood": 10,
    },
    {
        "task_type": "login",
        "description": "每日签到",
        "target_count": 1,
        "reward_power": 5,
        "reward_mood": 10,
    },
    {
        "task_type": "review",
        "description": "查看1次面试回放",
        "target_count": 1,
        "reward_power": 10,
        "reward_mood": 5,
    },
]

DEFAULT_USER_ID = "default_user"


async def get_or_create_user(db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.user_id == DEFAULT_USER_ID))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            user_id=DEFAULT_USER_ID, nickname="求职者", power=50, mood=70, hp=100
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


@router.get("/daily", response_model=DailyTasksResponse)
async def get_daily_tasks(db: AsyncSession = Depends(get_db)):
    user = await get_or_create_user(db)
    today = date.today().isoformat()

    tasks_result = await db.execute(
        select(DailyTask).where(
            DailyTask.user_id == user.user_id, DailyTask.task_date == today
        )
    )
    tasks = tasks_result.scalars().all()

    if not tasks:
        selected_templates = random.sample(TASK_TEMPLATES, min(4, len(TASK_TEMPLATES)))

        for template in selected_templates:
            task = DailyTask(
                user_id=user.user_id,
                task_type=template["task_type"],
                description=template["description"],
                target_count=template["target_count"],
                reward_power=template["reward_power"],
                reward_mood=template["reward_mood"],
                task_date=today,
            )
            db.add(task)

        await db.commit()

        tasks_result = await db.execute(
            select(DailyTask).filter(
                DailyTask.user_id == user.user_id, DailyTask.task_date == today
            )
        )
        tasks = tasks_result.scalars().all()

    task_responses = [TaskResponse.model_validate(t) for t in tasks]
    completed = sum(1 for t in tasks if t.is_completed)
    total_power = sum(t.reward_power for t in tasks if t.is_completed)
    total_mood = sum(t.reward_mood for t in tasks if t.is_completed)

    return DailyTasksResponse(
        tasks=task_responses,
        total_completed=completed,
        total_tasks=len(tasks),
        power_reward=total_power,
        mood_reward=total_mood,
    )


@router.post("/progress", response_model=TaskResponse)
async def update_task_progress(
    progress: TaskProgress,
    db: AsyncSession = Depends(get_db),
):
    user = await get_or_create_user(db)

    task_result = await db.execute(
        select(DailyTask).where(
            DailyTask.id == progress.task_id, DailyTask.user_id == user.user_id
        )
    )
    task = task_result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.is_completed:
        return TaskResponse.model_validate(task)

    task.current_count = min(task.current_count + progress.increment, task.target_count)

    if task.current_count >= task.target_count:
        task.is_completed = True
        task.completed_at = datetime.utcnow()

        reward_service = RewardService(db)
        reward_result = await reward_service.apply_task_reward(
            user, task.reward_power, task.reward_mood, task.id
        )

    await db.commit()
    await db.refresh(task)

    return TaskResponse.model_validate(task)


@router.post("/claim-rewards")
async def claim_daily_rewards(db: AsyncSession = Depends(get_db)):
    user = await get_or_create_user(db)
    today = date.today().isoformat()

    completed_result = await db.execute(
        select(DailyTask).where(
            DailyTask.user_id == user.user_id,
            DailyTask.task_date == today,
            DailyTask.is_completed == True,
        )
    )
    completed_tasks = completed_result.scalars().all()

    if not completed_tasks:
        raise HTTPException(status_code=400, detail="No completed tasks to claim")

    total_power = sum(t.reward_power for t in completed_tasks)
    total_mood = sum(t.reward_mood for t in completed_tasks)

    return {
        "power_gained": total_power,
        "mood_gained": total_mood,
        "current_power": user.power,
        "current_mood": user.mood,
    }


@router.get("/recommendations", response_model=TaskRecommendationListResponse)
async def get_recommendations(db: AsyncSession = Depends(get_db)):
    user = await get_or_create_user(db)

    existing_result = await db.execute(
        select(TaskRecommendation)
        .where(
            TaskRecommendation.user_id == user.user_id,
            TaskRecommendation.status == "pending",
        )
        .order_by(TaskRecommendation.created_at.desc())
        .limit(5)
    )
    existing = existing_result.scalars().all()

    if len(existing) < 3:
        new_tasks = task_generator.generate_tasks(user, count=3 - len(existing))

        for task_data in new_tasks:
            expires = datetime.utcnow() + timedelta(days=3)
            recommendation = TaskRecommendation(
                user_id=user.user_id,
                task_type=task_data.get("task_type", "knowledge"),
                title=task_data.get("title", "学习任务"),
                description=task_data.get("description", ""),
                reason=task_data.get("reason", "根据您的需求推荐"),
                reward_power=task_data.get("reward_power", 10),
                reward_mood=task_data.get("reward_mood", 5),
                expires_at=expires,
            )
            db.add(recommendation)

        await db.commit()

        existing_result = await db.execute(
            select(TaskRecommendation)
            .where(
                TaskRecommendation.user_id == user.user_id,
                TaskRecommendation.status == "pending",
            )
            .order_by(TaskRecommendation.created_at.desc())
            .limit(5)
        )
        existing = existing_result.scalars().all()

    recommendations = [TaskRecommendationResponse.model_validate(r) for r in existing]

    return TaskRecommendationListResponse(
        recommendations=recommendations,
        total_count=len(recommendations),
    )


@router.post(
    "/recommendations/{recommendation_id}/accept", response_model=AcceptTaskResponse
)
async def accept_recommendation(
    recommendation_id: int,
    db: AsyncSession = Depends(get_db),
):
    user = await get_or_create_user(db)

    rec_result = await db.execute(
        select(TaskRecommendation).where(
            TaskRecommendation.id == recommendation_id,
            TaskRecommendation.user_id == user.user_id,
            TaskRecommendation.status == "pending",
        )
    )
    recommendation = rec_result.scalar_one_or_none()

    if not recommendation:
        raise HTTPException(
            status_code=404, detail="Recommendation not found or already processed"
        )

    today = date.today().isoformat()

    daily_task = DailyTask(
        user_id=user.user_id,
        task_type=recommendation.task_type,
        description=recommendation.title,
        target_count=1,
        reward_power=recommendation.reward_power,
        reward_mood=recommendation.reward_mood,
        task_date=today,
    )
    db.add(daily_task)

    recommendation.status = "accepted"
    recommendation.decided_at = datetime.utcnow()

    await db.commit()
    await db.refresh(daily_task)

    recommendation.converted_task_id = daily_task.id
    await db.commit()

    return AcceptTaskResponse(
        id=recommendation.id,
        task_type=recommendation.task_type,
        title=recommendation.title,
        status="accepted",
        reward_power=recommendation.reward_power,
        reward_mood=recommendation.reward_mood,
    )


@router.post("/recommendations/{recommendation_id}/reject")
async def reject_recommendation(
    recommendation_id: int,
    db: AsyncSession = Depends(get_db),
):
    user = await get_or_create_user(db)

    rec_result = await db.execute(
        select(TaskRecommendation).where(
            TaskRecommendation.id == recommendation_id,
            TaskRecommendation.user_id == user.user_id,
            TaskRecommendation.status == "pending",
        )
    )
    recommendation = rec_result.scalar_one_or_none()

    if not recommendation:
        raise HTTPException(
            status_code=404, detail="Recommendation not found or already processed"
        )

    recommendation.status = "rejected"
    recommendation.decided_at = datetime.utcnow()
    await db.commit()

    return {"status": "rejected", "recommendation_id": recommendation_id}


@router.get("/stats")
async def get_task_stats(db: AsyncSession = Depends(get_db)):
    user = await get_or_create_user(db)

    reward_service = RewardService(db)
    stats = await reward_service.get_user_stats(user.user_id)

    return stats
