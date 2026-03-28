from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, outerjoin
from app.schemas.interview import (
    StartInterviewRequest,
    StartInterviewResponse,
    ReplyRequest,
    ReplyResponse,
    EndInterviewRequest,
    EndInterviewResponse,
    InterviewReportResponse,
    InterviewReportBrief,
)
from app.services.interview import interview_service
from app.services.report_generator import report_generator
from app.services.achievement import AchievementService
from app.services.memory import MemoryService
from app.database import get_db
from app.models import Interview, InterviewReport
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
import uuid
import time
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interviews")

DEFAULT_USER_ID = "default_user"


class ReportSummary(BaseModel):
    report_id: str
    overall_grade: str
    dimensions: dict


class InterviewHistoryItem(BaseModel):
    session_id: str
    type: str
    difficulty: str
    position: str | None
    score: float | None
    duration_seconds: int | None
    created_at: str
    completed_at: str | None
    report: ReportSummary | None = None


class InterviewHistoryResponse(BaseModel):
    interviews: List[InterviewHistoryItem]
    total: int


@router.get("/history", response_model=InterviewHistoryResponse)
async def get_interview_history(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Interview, InterviewReport)
        .outerjoin(InterviewReport, Interview.session_id == InterviewReport.session_id)
        .where(Interview.user_id == DEFAULT_USER_ID)
        .order_by(Interview.created_at.desc())
        .limit(20)
    )
    rows = result.all()

    interviews = []
    for interview, report in rows:
        report_summary = None
        if report:
            report_summary = ReportSummary(
                report_id=report.report_id,
                overall_grade=report.overall_grade,
                dimensions=report.dimensions or {},
            )

        interviews.append(
            InterviewHistoryItem(
                session_id=interview.session_id,
                type=interview.type,
                difficulty=interview.difficulty,
                position=interview.position,
                score=interview.score,
                duration_seconds=interview.duration_seconds,
                created_at=interview.created_at.isoformat()
                if interview.created_at
                else "",
                completed_at=interview.completed_at.isoformat()
                if interview.completed_at
                else None,
                report=report_summary,
            )
        )

    return InterviewHistoryResponse(interviews=interviews, total=len(interviews))


@router.post("/start", response_model=StartInterviewResponse)
async def start_interview(
    request: StartInterviewRequest, db: AsyncSession = Depends(get_db)
):
    """开始面试"""
    session_id = f"interview_{int(time.time() * 1000)}_{uuid.uuid4().hex[:9]}"

    memory_service = MemoryService(db)
    await interview_service.create_session(
        session_id,
        request.type,
        request.difficulty,
        request.position,
        user_id=DEFAULT_USER_ID,
        memory_service=memory_service,
    )

    session = interview_service.get_session(session_id)
    enhanced_prompt = session.get("memory_enhanced_prompt") if session else None

    first_question = interview_service.generate_first_question(
        request.type, request.position, enhanced_prompt
    )

    interview_record = Interview(
        session_id=session_id,
        user_id=DEFAULT_USER_ID,
        type=request.type,
        difficulty=request.difficulty,
        position=request.position,
    )
    db.add(interview_record)
    await db.commit()

    logger.info(f"Started interview: {session_id}")

    return StartInterviewResponse(
        session_id=session_id,
        first_question=first_question,
        type=request.type,
        difficulty=request.difficulty,
    )


@router.post("/reply", response_model=ReplyResponse)
async def reply_interview(request: ReplyRequest):
    """回复面试问题"""
    session = interview_service.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    response = interview_service.process_user_message(
        request.session_id, request.message
    )

    return ReplyResponse(response=response, session_id=request.session_id)


@router.post("/end", response_model=EndInterviewResponse)
async def end_interview(
    request: EndInterviewRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """结束面试"""
    session = interview_service.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    evaluation = interview_service.generate_evaluation(request.session_id)
    context = interview_service.end_session(request.session_id)

    interview_record = await db.scalar(
        select(Interview).where(Interview.session_id == request.session_id)
    )

    unlocked_achievements = []

    if interview_record:
        interview_record.score = evaluation["score"]
        interview_record.duration_seconds = int(
            (time.time() * 1000 - int(request.session_id.split("_")[1])) / 1000
        )
        interview_record.history = context.get("history", [])
        await db.commit()

        achievement_service = AchievementService(db)
        unlocked_achievements = await achievement_service.check_interview_achievements(
            DEFAULT_USER_ID,
            {
                "score": evaluation["score"],
                "duration_seconds": interview_record.duration_seconds,
                "history": context.get("history", []),
                "max_stress": request.max_stress,
            },
        )

        background_tasks.add_task(
            _generate_report_async,
            request.session_id,
            context.get("history", []),
            {
                "type": context.get("type", "hr"),
                "difficulty": context.get("difficulty", "medium"),
                "position": context.get("position"),
                "user_id": DEFAULT_USER_ID,
            },
        )

        background_tasks.add_task(
            _process_memories_async,
            DEFAULT_USER_ID,
            request.session_id,
            context.get("history", []),
        )

    return EndInterviewResponse(
        success=True,
        session_id=request.session_id,
        message_count=len(context.get("history", [])) if context else 0,
        score=evaluation["score"],
        feedback=evaluation["feedback"],
        unlocked_achievements=unlocked_achievements,
    )


async def _process_memories_async(user_id: str, session_id: str, history: List):
    try:
        from app.database import AsyncSessionLocal

        async with AsyncSessionLocal() as db:
            memory_service = MemoryService(db)
            result = await memory_service.process_interview_result(
                user_id=user_id,
                session_id=session_id,
                history=history,
            )
            logger.info(f"Processed memories for session {session_id}: {result}")
    except Exception as e:
        logger.error(f"Failed to process memories: {e}")


async def _generate_report_async(session_id: str, history: List, meta: dict):
    try:
        from app.database import AsyncSessionLocal

        report_data = report_generator.generate_detailed_report(
            session_id, history, meta
        )

        if report_data:
            async with AsyncSessionLocal() as db:
                existing = await db.scalar(
                    select(InterviewReport).where(
                        InterviewReport.session_id == session_id
                    )
                )
                if existing:
                    return

                report = InterviewReport(
                    report_id=report_data["report_id"],
                    session_id=session_id,
                    user_id=report_data["user_id"],
                    overall_score=report_data["overall_score"],
                    overall_grade=report_data["overall_grade"],
                    summary=report_data["summary"],
                    dimensions=report_data["dimensions"],
                    question_analysis=report_data["question_analysis"],
                    recommendations=report_data["recommendations"],
                    interview_meta=report_data["interview_meta"],
                )
                db.add(report)

                interview_record = await db.scalar(
                    select(Interview).where(Interview.session_id == session_id)
                )
                if interview_record:
                    interview_record.report_id = report_data["report_id"]

                await db.commit()
                logger.info(f"Generated report for session: {session_id}")
    except Exception as e:
        logger.error(f"Failed to generate report: {e}")


@router.get("/reports/{report_id}", response_model=InterviewReportResponse)
async def get_report(report_id: str, db: AsyncSession = Depends(get_db)):
    """获取报告详情"""
    report = await db.scalar(
        select(InterviewReport).where(InterviewReport.report_id == report_id)
    )

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return InterviewReportResponse(
        report_id=report.report_id,
        session_id=report.session_id,
        user_id=report.user_id,
        overall_score=report.overall_score,
        overall_grade=report.overall_grade,
        summary=report.summary,
        dimensions=report.dimensions,
        question_analysis=report.question_analysis,
        recommendations=report.recommendations,
        interview_meta=report.interview_meta,
        created_at=report.created_at,
    )


@router.get("/{session_id}/report", response_model=InterviewReportResponse)
async def get_report_by_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """根据session获取报告"""
    report = await db.scalar(
        select(InterviewReport).where(InterviewReport.session_id == session_id)
    )

    if not report:
        raise HTTPException(status_code=404, detail="Report not found for this session")

    return InterviewReportResponse(
        report_id=report.report_id,
        session_id=report.session_id,
        user_id=report.user_id,
        overall_score=report.overall_score,
        overall_grade=report.overall_grade,
        summary=report.summary,
        dimensions=report.dimensions,
        question_analysis=report.question_analysis,
        recommendations=report.recommendations,
        interview_meta=report.interview_meta,
        created_at=report.created_at,
    )
