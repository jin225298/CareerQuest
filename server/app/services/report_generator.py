import logging
import json
import re
import uuid
from typing import Dict, List, Optional
from app.services.volcengine import volcengine_service

logger = logging.getLogger(__name__)

REPORT_PROMPT = """你是一位专业的面试评估专家，请根据以下面试记录生成详细的评估报告。

## 面试信息
- 面试类型: {interview_type}
- 目标岗位: {position}
- 难度等级: {difficulty}
- 对话轮数: {turn_count}

## 面试对话记录
{conversation}

## 评估要求
请从以下维度进行评估，并返回JSON格式的报告：

1. **总体评分** (overall_score): 0-100分整数
2. **总体等级** (overall_grade): S/A/B/C/D
3. **综合评价** (summary): 100-200字的总体表现总结
4. **维度评分** (dimensions): 包含以下维度，每个维度包含score(0-100)和comment(50字内评价)
   - 专业能力 (professional_ability)
   - 沟通表达 (communication)
   - 逻辑思维 (logical_thinking)
   - 应变能力 (adaptability)
   - 职业素养 (professionalism)
5. **问题分析** (question_analysis): 针对每个问题的回答质量分析，包含:
   - question: 问题内容(截取前50字)
   - answer: 回答内容(截取前100字)
   - score: 该问题得分(0-100)
   - analysis: 简短点评(30字内)
6. **改进建议** (recommendations): 3-5条具体的改进建议，每条包含:
   - title: 建议标题
   - content: 详细建议(50字内)
   - priority: high/medium/low

请严格按照以下JSON格式返回，不要添加任何其他内容：
{{
    "overall_score": 85,
    "overall_grade": "A",
    "summary": "候选人在技术面试中表现优秀，展现出扎实的技术功底和良好的问题解决能力。沟通表达清晰，逻辑性强，能够准确理解问题并给出有深度的回答。建议进一步提升系统设计能力。",
    "dimensions": {{
        "professional_ability": {{"score": 88, "comment": "技术基础扎实，对核心概念理解深入"}},
        "communication": {{"score": 82, "comment": "表达清晰流畅，逻辑性强"}},
        "logical_thinking": {{"score": 85, "comment": "思路清晰，能够条理分明地分析问题"}},
        "adaptability": {{"score": 78, "comment": "面对追问能够灵活应对，但有时略显紧张"}},
        "professionalism": {{"score": 90, "comment": "态度认真，展现出良好的职业素养"}}
    }},
    "question_analysis": [
        {{
            "question": "请介绍一下你的技术背景...",
            "answer": "我有5年的开发经验...",
            "score": 85,
            "analysis": "介绍详细，重点突出"
        }}
    ],
    "recommendations": [
        {{
            "title": "提升系统设计能力",
            "content": "建议学习分布式系统设计，掌握高可用架构设计原则",
            "priority": "high"
        }}
    ]
}}"""

SIMPLIFIED_PROMPT = """根据面试对话给出评分。

面试类型: {interview_type}
对话记录:
{conversation}

返回JSON格式:
{{"score": 75, "grade": "B", "feedback": "表现良好"}}"""


class ReportGenerator:
    def generate_detailed_report(
        self,
        session_id: str,
        history: List[Dict],
        meta: Dict,
    ) -> Optional[Dict]:
        try:
            conversation = self._format_conversation(history)

            prompt = REPORT_PROMPT.format(
                interview_type=meta.get("type", "hr"),
                position=meta.get("position", "通用岗位"),
                difficulty=meta.get("difficulty", "medium"),
                turn_count=len([m for m in history if m["role"] == "user"]),
                conversation=conversation,
            )

            messages = [
                {
                    "role": "system",
                    "content": "你是一位专业的面试评估专家，擅长从多个维度分析候选人的表现。",
                },
                {"role": "user", "content": prompt},
            ]

            response = volcengine_service.chat(messages)

            return self._parse_report_response(response, session_id, meta)

        except Exception as e:
            logger.error(f"Failed to generate detailed report: {e}")
            return self._generate_simplified_report(session_id, history, meta)

    def _generate_simplified_report(
        self,
        session_id: str,
        history: List[Dict],
        meta: Dict,
    ) -> Dict:
        try:
            conversation = self._format_conversation(history[-6:])

            prompt = SIMPLIFIED_PROMPT.format(
                interview_type=meta.get("type", "hr"),
                conversation=conversation,
            )

            messages = [
                {"role": "system", "content": "你是面试评分助手。"},
                {"role": "user", "content": prompt},
            ]

            response = volcengine_service.chat(messages)

            json_match = re.search(r"\{[^}]+\}", response)
            if json_match:
                result = json.loads(json_match.group())
                score = int(result.get("score", 75))
                grade = result.get("grade", self._score_to_grade(score))

                return {
                    "report_id": f"report_{uuid.uuid4().hex[:12]}",
                    "session_id": session_id,
                    "user_id": meta.get("user_id", "default_user"),
                    "overall_score": score,
                    "overall_grade": grade,
                    "summary": result.get("feedback", "面试表现良好，继续保持！"),
                    "dimensions": self._get_default_dimensions(score),
                    "question_analysis": [],
                    "recommendations": self._get_default_recommendations(),
                    "interview_meta": meta,
                }
        except Exception as e:
            logger.error(f"Failed to generate simplified report: {e}")

        return self._get_default_report(session_id, meta)

    def _parse_report_response(
        self, response: str, session_id: str, meta: Dict
    ) -> Optional[Dict]:
        try:
            json_match = re.search(r"\{[\s\S]*\}", response)
            if not json_match:
                return None

            data = json.loads(json_match.group())

            return {
                "report_id": f"report_{uuid.uuid4().hex[:12]}",
                "session_id": session_id,
                "user_id": meta.get("user_id", "default_user"),
                "overall_score": int(data.get("overall_score", 75)),
                "overall_grade": data.get("overall_grade", "B"),
                "summary": data.get("summary", "面试表现良好。"),
                "dimensions": data.get("dimensions", self._get_default_dimensions(75)),
                "question_analysis": data.get("question_analysis", []),
                "recommendations": data.get(
                    "recommendations", self._get_default_recommendations()
                ),
                "interview_meta": meta,
            }
        except Exception as e:
            logger.error(f"Failed to parse report response: {e}")
            return None

    def _format_conversation(self, history: List[Dict]) -> str:
        lines = []
        for msg in history:
            role = "候选人" if msg["role"] == "user" else "面试官"
            content = msg.get("content", "")[:200]
            lines.append(f"{role}: {content}")
        return "\n".join(lines)

    def _score_to_grade(self, score: int) -> str:
        if score >= 90:
            return "S"
        elif score >= 80:
            return "A"
        elif score >= 70:
            return "B"
        elif score >= 60:
            return "C"
        else:
            return "D"

    def _get_default_dimensions(self, base_score: int) -> Dict:
        return {
            "professional_ability": {
                "score": min(100, base_score + 5),
                "comment": "技术能力表现良好",
            },
            "communication": {
                "score": base_score,
                "comment": "沟通表达清晰",
            },
            "logical_thinking": {
                "score": base_score,
                "comment": "逻辑思维正常",
            },
            "adaptability": {
                "score": max(60, base_score - 5),
                "comment": "应变能力有待提升",
            },
            "professionalism": {
                "score": min(100, base_score + 3),
                "comment": "职业素养良好",
            },
        }

    def _get_default_recommendations(self) -> List[Dict]:
        return [
            {
                "title": "持续学习",
                "content": "建议多进行模拟面试练习，提升表达能力",
                "priority": "medium",
            },
            {
                "title": "深化专业知识",
                "content": "针对岗位要求，深入学习相关技术和业务知识",
                "priority": "high",
            },
        ]

    def _get_default_report(self, session_id: str, meta: Dict) -> Dict:
        return {
            "report_id": f"report_{uuid.uuid4().hex[:12]}",
            "session_id": session_id,
            "user_id": meta.get("user_id", "default_user"),
            "overall_score": 75,
            "overall_grade": "B",
            "summary": "面试已完成，表现中等水平。建议继续练习提升。",
            "dimensions": self._get_default_dimensions(75),
            "question_analysis": [],
            "recommendations": self._get_default_recommendations(),
            "interview_meta": meta,
        }


report_generator = ReportGenerator()
