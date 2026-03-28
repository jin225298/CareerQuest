import re
import logging
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from app.services.volcengine import volcengine_service

logger = logging.getLogger(__name__)


SANITIZATION_RULES = [
    (r"(我叫|我是|姓名[是为])\s*[^\s，。！？]{2,4}", r"\1[姓名]"),
    (r"(在|就职于|供职于)\s*[^\s，。！？]{2,10](公司|科技|集团|有限)", r"\1[公司]\2"),
    (r"[\d]{11}", "[手机号]"),
    (r"[\w.-]+@[\w.-]+\.\w+", "[邮箱]"),
    (r"(身份证|ID)[号:：]\s*[\dXx]{15,18}", r"\1[号码]"),
    (r"项目[代号名称]*[是为:：]\s*[^\s，。！？]{2,10}", "项目代号: [项目名]"),
    (r"(负责|参与|主导)\s*[^\s，。！？]{2,15}(项目|产品)", r"\1[某项目]"),
]

ERROR_TYPES = ["blind_spot", "misconception", "weakness", "knowledge_gap"]

PROCESSOR_PROMPT = """分析以下面试对话，识别候选人的错误或不足。

对话内容：
{conversation}

请分析并返回 JSON 格式：
{{
    "error_type": "blind_spot|misconception|weakness|knowledge_gap",
    "topic": "具体技术点或知识点",
    "problem": "问题简述（10字内）",
    "manifestation": "具体表现（20字内）",
    "summary": "技术盲点/知识缺陷：{topic}。表现：{manifestation}"
}}

只关注回答中的错误、不完整、模糊或明显弱点。如无明显问题，返回 null。"""


@dataclass
class ProcessedMemory:
    content: str
    error_type: str
    topic: str
    problem: str
    manifestation: str
    summary: str
    original_content: str
    sanitized: bool
    processing_time_ms: int


class MemoryProcessor:
    def __init__(self):
        self.rules = SANITIZATION_RULES

    def sanitize(self, text: str) -> str:
        if not text:
            return text

        result = text
        for pattern, replacement in self.rules:
            result = re.sub(pattern, replacement, result)

        return result

    async def summarize(
        self,
        conversation: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, str]]:
        if not conversation:
            return None

        try:
            prompt = PROCESSOR_PROMPT.format(conversation=conversation[:2000])
            response = volcengine_service.chat(
                [
                    {
                        "role": "system",
                        "content": "你是面试分析专家，识别候选人的技术弱点。",
                    },
                    {"role": "user", "content": prompt},
                ]
            )

            import json

            json_match = re.search(r"\{[^{}]*\}", response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                if result and result.get("topic"):
                    return result
        except Exception as e:
            logger.error(f"Summarization failed: {e}")

        return None

    async def process(
        self,
        conversation: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Optional[ProcessedMemory]:
        start_time = time.time()

        sanitized = self.sanitize(conversation)
        summary_result = await self.summarize(sanitized, context)

        if not summary_result:
            return None

        processing_time = int((time.time() - start_time) * 1000)

        return ProcessedMemory(
            content=summary_result.get("summary", ""),
            error_type=summary_result.get("error_type", "weakness"),
            topic=summary_result.get("topic", ""),
            problem=summary_result.get("problem", ""),
            manifestation=summary_result.get("manifestation", ""),
            summary=summary_result.get("summary", ""),
            original_content=conversation,
            sanitized=sanitized != conversation,
            processing_time_ms=processing_time,
        )
