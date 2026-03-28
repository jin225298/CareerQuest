from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

from app.database import get_db
from app.services.memory import MemoryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/memories")

DEFAULT_USER_ID = "default_user"


class MemorySummaryResponse(BaseModel):
    total: int
    l1_count: int
    l2_count: int
    l3_count: int
    topics: List[str]
    error_types: Dict[str, int]


class MemoryItem(BaseModel):
    memory_id: str
    content: str
    level: str
    topic: str
    error_type: str
    error_count: int
    created_at: str


class MemoryListResponse(BaseModel):
    memories: List[MemoryItem]
    total: int


class AnalyzeRequest(BaseModel):
    session_id: str
    history: List[Dict[str, Any]]


class AnalyzeResponse(BaseModel):
    processed: int
    results: List[Dict[str, Any]]


@router.get("/summary", response_model=MemorySummaryResponse)
async def get_memory_summary(
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or DEFAULT_USER_ID
    service = MemoryService(db)
    stats = await service.get_user_memory_stats(uid)

    return MemorySummaryResponse(
        total=stats.get("total", 0),
        l1_count=stats.get("l1_count", 0),
        l2_count=stats.get("l2_count", 0),
        l3_count=stats.get("l3_count", 0),
        topics=stats.get("topics", []),
        error_types=stats.get("error_types", {}),
    )


@router.get("/level/{level}", response_model=MemoryListResponse)
async def get_memories_by_level(
    level: str,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    if level not in ["L1", "L2", "L3"]:
        raise HTTPException(status_code=400, detail="Level must be L1, L2, or L3")

    uid = user_id or DEFAULT_USER_ID
    service = MemoryService(db)
    memories = await service.get_memories_by_level(uid, level)

    items = []
    for m in memories:
        items.append(
            MemoryItem(
                memory_id=m.get("id", ""),
                content=m.get("content", ""),
                level=m.get("metadata", {}).get("level", level),
                topic=m.get("metadata", {}).get("topic", ""),
                error_type=m.get("metadata", {}).get("error_type", ""),
                error_count=m.get("metadata", {}).get("error_count", 1),
                created_at=m.get("created_at", ""),
            )
        )

    return MemoryListResponse(memories=items, total=len(items))


@router.get("/{memory_id}")
async def get_memory_detail(
    memory_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = MemoryService(db)
    memory = await service.get_memory_detail(memory_id)

    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    return memory


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_session(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or DEFAULT_USER_ID
    service = MemoryService(db)

    result = await service.process_interview_result(
        user_id=uid,
        session_id=request.session_id,
        history=request.history,
    )

    return AnalyzeResponse(
        processed=result.get("processed", 0),
        results=result.get("results", []),
    )


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = MemoryService(db)
    success = await service.delete_memory(memory_id)

    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")

    return {"success": True}


@router.post("/correct")
async def record_correct_answer(
    topic: str,
    session_id: str,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or DEFAULT_USER_ID
    service = MemoryService(db)

    result = await service.record_correct_answer(uid, topic, session_id)
    return result
