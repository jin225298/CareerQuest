import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = """你是一位严厉的面试官。基于候选人过往表现，你需要重点关注：

【必考项（顽固问题）- 必须提问】
{l1_section}

【参考项（近期弱点）- 选择性追问】
{l2_section}

【抽查项（曾犯错但已修复）- 偶尔验证】
{l3_section}

面试规则：
1. 必考项是候选人多次犯错的领域，必须针对性提问，深入考察
2. 参考项是候选人的近期弱点，根据回答情况选择性追问
3. 抽查项用于验证候选人是否真正掌握，避免死记硬背

{base_prompt}"""

EMPTY_PLACEHOLDER = "暂无相关记录"


class MemoryPromptBuilder:
    def __init__(self):
        pass

    async def build_system_prompt(
        self,
        memories: Dict[str, List[Dict]],
        base_prompt: str = "",
    ) -> str:
        l1_memories = memories.get("L1", [])
        l2_memories = memories.get("L2", [])
        l3_memories = memories.get("L3", [])

        l1_section = self._format_section(
            l1_memories, EMPTY_PLACEHOLDER, with_count=True
        )
        l2_section = self._format_section(l2_memories, EMPTY_PLACEHOLDER)
        l3_section = self._format_section(l3_memories, EMPTY_PLACEHOLDER)

        return SYSTEM_PROMPT_TEMPLATE.format(
            l1_section=l1_section,
            l2_section=l2_section,
            l3_section=l3_section,
            base_prompt=base_prompt,
        )

    def _format_section(
        self,
        memories: List[Dict],
        default_text: str = "",
        with_count: bool = False,
    ) -> str:
        if not memories:
            return default_text

        lines = []
        for i, m in enumerate(memories, 1):
            content = m.get("content", m.get("summary", ""))
            if with_count:
                count = m.get("error_count", 1)
                lines.append(f"{i}. {content} (错误{count}次)")
            else:
                lines.append(f"{i}. {content}")

        return "\n".join(lines)

    def build_memory_summary(
        self,
        memories: Dict[str, List[Dict]],
    ) -> Dict:
        return {
            "l1_count": len(memories.get("L1", [])),
            "l2_count": len(memories.get("L2", [])),
            "l3_count": len(memories.get("L3", [])),
            "total": sum(len(memories.get(k, [])) for k in ["L1", "L2", "L3"]),
        }
