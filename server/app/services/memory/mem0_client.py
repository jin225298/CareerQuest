import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
import hashlib
import json

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.85
MEMORY_VERSION = "1.0"


class Mem0Client:
    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock
        self._store: Dict[str, Dict] = {}
        self._vectors: Dict[str, List[float]] = {}
        logger.info(f"Mem0Client initialized (mock={use_mock})")

    async def add(
        self,
        user_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict:
        memory_id = f"mem_{hashlib.md5(f'{user_id}{content}{datetime.utcnow().isoformat()}'.encode()).hexdigest()[:12]}"

        record = {
            "id": memory_id,
            "user_id": user_id,
            "content": content,
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        self._store[memory_id] = record
        self._vectors[memory_id] = self._simple_vectorize(content)

        logger.debug(f"Added memory: {memory_id} for user: {user_id}")
        return record

    async def search(
        self,
        user_id: str,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10,
    ) -> List[Dict]:
        query_vector = self._simple_vectorize(query)
        results = []

        for memory_id, record in self._store.items():
            if record["user_id"] != user_id:
                continue

            if filters:
                metadata = record.get("metadata", {})
                if not all(metadata.get(k) == v for k, v in filters.items()):
                    continue

            stored_vector = self._vectors.get(memory_id, [])
            similarity = self._cosine_similarity(query_vector, stored_vector)

            if similarity > 0.1:
                results.append(
                    {
                        **record,
                        "score": similarity,
                    }
                )

        results.sort(key=lambda x: x.get("score", 0), reverse=True)
        return results[:limit]

    async def update(
        self,
        memory_id: str,
        data: Dict[str, Any],
    ) -> Dict:
        if memory_id not in self._store:
            raise ValueError(f"Memory not found: {memory_id}")

        record = self._store[memory_id]
        record.update(data)
        record["updated_at"] = datetime.utcnow().isoformat()

        if "content" in data:
            self._vectors[memory_id] = self._simple_vectorize(data["content"])

        return record

    async def delete(self, memory_id: str) -> bool:
        if memory_id in self._store:
            del self._store[memory_id]
            self._vectors.pop(memory_id, None)
            return True
        return False

    async def get_all(
        self,
        user_id: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 100,
    ) -> List[Dict]:
        results = []
        for memory_id, record in self._store.items():
            if record["user_id"] != user_id:
                continue

            if filters:
                metadata = record.get("metadata", {})
                if not all(metadata.get(k) == v for k, v in filters.items()):
                    continue

            results.append(record)

        results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return results[:limit]

    async def get_by_id(self, memory_id: str) -> Optional[Dict]:
        return self._store.get(memory_id)

    async def find_similar(
        self,
        user_id: str,
        content: str,
        threshold: float = SIMILARITY_THRESHOLD,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict]:
        results = await self.search(user_id, content, filters, limit=5)

        for result in results:
            if result.get("score", 0) >= threshold:
                return result

        return None

    def _simple_vectorize(self, text: str) -> List[float]:
        words = text.lower().split()
        vector = [0.0] * 128

        for i, word in enumerate(words[:128]):
            char_sum = sum(ord(c) for c in word)
            vector[i % 128] = (char_sum % 100) / 100.0

        return vector

    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        if not a or not b:
            return 0.0

        min_len = min(len(a), len(b))
        a, b = a[:min_len], b[:min_len]

        dot_product = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot_product / (norm_a * norm_b)


mem0_client = Mem0Client(use_mock=True)
