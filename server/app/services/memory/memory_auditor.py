import logging
import hashlib
from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.memory import MemoryMeta, MemoryEvent, MemoryAudit
from app.services.memory.mem0_client import mem0_client

logger = logging.getLogger(__name__)

UPGRADE_THRESHOLD = 2
L1_DOWNGRADE_THRESHOLD = 3
L2_DOWNGRADE_THRESHOLD = 2
SIMILARITY_THRESHOLD = 0.85


class MemoryAuditor:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.mem0 = mem0_client

    async def process_error(
        self,
        user_id: str,
        processed_memory: Dict[str, Any],
        session_id: str,
        turn_index: int = 0,
    ) -> Dict:
        content = processed_memory.get("summary", "")
        topic = processed_memory.get("topic", "")
        error_type = processed_memory.get("error_type", "weakness")
        original_content = processed_memory.get("original_content", "")

        similar = await self.mem0.find_similar(
            user_id=user_id,
            content=content,
            threshold=SIMILARITY_THRESHOLD,
        )

        if similar:
            memory_id = similar["id"]
            meta = await self._get_meta(memory_id)

            if meta:
                meta.error_count += 1
                meta.last_accessed_at = datetime.utcnow()

                if meta.level == "L2" and meta.error_count >= UPGRADE_THRESHOLD:
                    await self._upgrade(meta, session_id)
                elif meta.level == "L3":
                    meta.level = "L2"
                    meta.error_count = 1
                    meta.correct_count = 0
                    await self._log_event(meta, "reoccurred", "L3", "L2", session_id)

                await self.db.commit()
                return {
                    "action": "updated",
                    "memory_id": memory_id,
                    "level": meta.level,
                }

        memory_id = await self._create_memory(
            user_id=user_id,
            content=content,
            topic=topic,
            error_type=error_type,
            session_id=session_id,
            turn_index=turn_index,
            original_content=original_content,
        )

        return {"action": "created", "memory_id": memory_id, "level": "L2"}

    async def process_correct(
        self,
        user_id: str,
        topic: str,
        session_id: str,
    ) -> Dict:
        result = await self.db.execute(
            select(MemoryMeta).where(
                and_(
                    MemoryMeta.user_id == user_id,
                    MemoryMeta.topic.ilike(f"%{topic}%"),
                    MemoryMeta.level.in_(["L1", "L2"]),
                )
            )
        )
        memories = result.scalars().all()

        for meta in memories:
            meta.correct_count += 1
            meta.last_accessed_at = datetime.utcnow()

            downgrade_threshold = (
                L1_DOWNGRADE_THRESHOLD if meta.level == "L1" else L2_DOWNGRADE_THRESHOLD
            )

            if meta.correct_count >= downgrade_threshold:
                old_level = meta.level
                meta.level = "L3"
                meta.downgraded_at = datetime.utcnow()
                await self._log_event(
                    meta, "downgraded", old_level, "L3", session_id, "correct_answer"
                )

        await self.db.commit()

        return {"action": "corrected", "count": len(memories)}

    async def check_similar_memory(
        self,
        user_id: str,
        content: str,
    ) -> Optional[Dict]:
        return await self.mem0.find_similar(
            user_id=user_id,
            content=content,
            threshold=SIMILARITY_THRESHOLD,
        )

    async def get_memory_stats(self, user_id: str) -> Dict:
        result = await self.db.execute(
            select(MemoryMeta).where(MemoryMeta.user_id == user_id)
        )
        memories = result.scalars().all()

        stats = {
            "total": len(memories),
            "l1_count": 0,
            "l2_count": 0,
            "l3_count": 0,
            "topics": set(),
            "error_types": {},
        }

        for m in memories:
            if m.level == "L1":
                stats["l1_count"] += 1
            elif m.level == "L2":
                stats["l2_count"] += 1
            else:
                stats["l3_count"] += 1

            if m.topic:
                stats["topics"].add(m.topic)

            if m.error_type:
                stats["error_types"][m.error_type] = (
                    stats["error_types"].get(m.error_type, 0) + 1
                )

        stats["topics"] = list(stats["topics"])
        return stats

    async def _get_meta(self, memory_id: str) -> Optional[MemoryMeta]:
        result = await self.db.execute(
            select(MemoryMeta).where(MemoryMeta.memory_id == memory_id)
        )
        return result.scalar_one_or_none()

    async def _create_memory(
        self,
        user_id: str,
        content: str,
        topic: str,
        error_type: str,
        session_id: str,
        turn_index: int,
        original_content: str,
    ) -> str:
        mem0_record = await self.mem0.add(
            user_id=user_id,
            content=content,
            metadata={
                "level": "L2",
                "topic": topic,
                "error_type": error_type,
            },
        )

        memory_id = mem0_record["id"]
        vector_hash = hashlib.md5(content.encode()).hexdigest()[:16]

        meta = MemoryMeta(
            memory_id=memory_id,
            user_id=user_id,
            level="L2",
            error_type=error_type,
            topic=topic,
            summary=content,
            original_content=original_content,
            error_count=1,
            correct_count=0,
            vector_hash=vector_hash,
            source_session_id=session_id,
            source_turn_index=turn_index,
        )

        self.db.add(meta)
        await self._log_event(meta, "created", None, "L2", session_id)
        await self.db.commit()

        logger.info(f"Created memory: {memory_id} for user: {user_id}")
        return memory_id

    async def _upgrade(self, meta: MemoryMeta, session_id: str) -> None:
        old_level = meta.level
        meta.level = "L1"
        meta.upgraded_at = datetime.utcnow()
        await self._log_event(meta, "upgraded", old_level, "L1", session_id)
        logger.info(f"Upgraded memory {meta.memory_id} to L1")

    async def _log_event(
        self,
        meta: MemoryMeta,
        event_type: str,
        old_level: Optional[str],
        new_level: Optional[str],
        session_id: str,
        trigger: str = "",
    ) -> None:
        event = MemoryEvent(
            memory_id=meta.memory_id,
            user_id=meta.user_id,
            event_type=event_type,
            old_level=old_level,
            new_level=new_level,
            trigger=trigger,
            session_id=session_id,
        )
        self.db.add(event)
