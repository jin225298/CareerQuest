import logging
from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.memory.memory_processor import MemoryProcessor, ProcessedMemory
from app.services.memory.memory_auditor import MemoryAuditor
from app.services.memory.memory_retrieval import MemoryRetrieval
from app.services.memory.prompt_builder import MemoryPromptBuilder
from app.models.memory import MemoryAudit

logger = logging.getLogger(__name__)


class MemoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.processor = MemoryProcessor()
        self.auditor = MemoryAuditor(db)
        self.retrieval = MemoryRetrieval()
        self.prompt_builder = MemoryPromptBuilder()

    async def get_context_for_interview(
        self,
        user_id: str,
        topic: Optional[str] = None,
    ) -> Dict[str, List[Dict]]:
        memories = await self.retrieval.get_context_memories(user_id, topic)
        logger.info(
            f"Retrieved {sum(len(v) for v in memories.values())} memories for user {user_id}"
        )
        return memories

    async def build_system_prompt(
        self,
        memories: Dict[str, List[Dict]],
        base_prompt: str = "",
    ) -> str:
        return await self.prompt_builder.build_system_prompt(memories, base_prompt)

    async def process_interview_result(
        self,
        user_id: str,
        session_id: str,
        history: List[Dict],
        analysis: Optional[Dict] = None,
    ) -> Dict:
        results = []

        for turn_index, turn in enumerate(history):
            if turn.get("role") != "user":
                continue

            user_response = turn.get("content", "")
            if not user_response:
                continue

            processed = await self.processor.process(user_response)

            if processed:
                audit = MemoryAudit(
                    user_id=user_id,
                    original_content=processed.original_content,
                    processed_content=processed.summary,
                    sanitized=processed.sanitized,
                    error_type=processed.error_type,
                    topic=processed.topic,
                    processing_time_ms=processed.processing_time_ms,
                )
                self.db.add(audit)

                result = await self.auditor.process_error(
                    user_id=user_id,
                    processed_memory={
                        "summary": processed.summary,
                        "topic": processed.topic,
                        "error_type": processed.error_type,
                        "original_content": processed.original_content,
                    },
                    session_id=session_id,
                    turn_index=turn_index,
                )
                results.append(result)

        await self.db.commit()
        return {"processed": len(results), "results": results}

    async def record_correct_answer(
        self,
        user_id: str,
        topic: str,
        session_id: str,
    ) -> Dict:
        return await self.auditor.process_correct(user_id, topic, session_id)

    async def get_user_memory_stats(self, user_id: str) -> Dict:
        return await self.auditor.get_memory_stats(user_id)

    async def get_memories_by_level(
        self,
        user_id: str,
        level: str,
    ) -> List[Dict]:
        return await self.retrieval.get_all_memories(user_id, level=level)

    async def get_memory_detail(self, memory_id: str) -> Optional[Dict]:
        return await self.retrieval.get_memory_by_id(memory_id)

    async def delete_memory(self, memory_id: str) -> bool:
        from app.services.memory.mem0_client import mem0_client

        return await mem0_client.delete(memory_id)
