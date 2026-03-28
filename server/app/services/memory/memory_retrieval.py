import logging
import random
from typing import Dict, List, Optional, Any
from app.services.memory.mem0_client import mem0_client

logger = logging.getLogger(__name__)

L1_LIMIT = 20
L2_RATIO = 0.3
L2_MIN = 3
L2_MAX = 10
L3_RATIO = 0.1
L3_MIN = 1
L3_MAX = 3


class MemoryRetrieval:
    def __init__(self):
        self.mem0 = mem0_client

    async def get_context_memories(
        self,
        user_id: str,
        topic: Optional[str] = None,
    ) -> Dict[str, List[Dict]]:
        l1_memories = await self._get_by_level(user_id, "L1", limit=L1_LIMIT)
        l2_memories = await self._get_by_level(user_id, "L2", limit=L2_MAX * 2)
        l3_memories = await self._get_by_level(user_id, "L3", limit=L3_MAX * 3)

        if topic:
            l1_memories = [
                m for m in l1_memories if topic.lower() in m.get("content", "").lower()
            ]
            l2_memories = [
                m for m in l2_memories if topic.lower() in m.get("content", "").lower()
            ]
            l3_memories = [
                m for m in l3_memories if topic.lower() in m.get("content", "").lower()
            ]

        l2_sampled = self._sample(l2_memories, L2_RATIO, L2_MIN, L2_MAX)
        l3_sampled = self._sample(l3_memories, L3_RATIO, L3_MIN, L3_MAX)

        return {
            "L1": l1_memories[:L1_LIMIT],
            "L2": l2_sampled,
            "L3": l3_sampled,
        }

    async def get_by_topic(
        self,
        user_id: str,
        topic: str,
    ) -> List[Dict]:
        results = await self.mem0.search(
            user_id=user_id,
            query=topic,
            limit=20,
        )
        return results

    async def get_all_memories(
        self,
        user_id: str,
        level: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict]:
        filters = {}
        if level:
            filters["level"] = level

        return await self.mem0.get_all(user_id, filters=filters, limit=limit)

    async def get_memory_by_id(self, memory_id: str) -> Optional[Dict]:
        return await self.mem0.get_by_id(memory_id)

    async def _get_by_level(
        self,
        user_id: str,
        level: str,
        limit: int = 20,
    ) -> List[Dict]:
        return await self.mem0.get_all(
            user_id=user_id,
            filters={"level": level},
            limit=limit,
        )

    def _sample(
        self,
        items: List[Dict],
        ratio: float,
        min_count: int,
        max_count: int,
    ) -> List[Dict]:
        if not items:
            return []

        count = max(min_count, min(max_count, int(len(items) * ratio)))
        count = min(count, len(items))

        if count >= len(items):
            return items

        return random.sample(items, count)
