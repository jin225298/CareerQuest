from app.services.volcengine import volcengine_service
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

INTERVIEW_PROMPTS = {
    "hr": """你是一位资深HR面试官，专注于考察候选人的综合素质、沟通能力和职业素养。
你的面试风格专业友善，会适度追问但不刁难。
请根据候选人的回答情况，适时进行追问或引导，保持对话的自然流畅。
每次回复控制在2-3句话，避免冗长。""",
    "technical": """你是一位技术面试官，专注于考察候选人的专业技能和技术深度。
你会针对候选人的回答进行深入追问，考察其技术理解深度。
请用专业但易懂的语言交流，根据候选人水平调整问题难度。
每次回复控制在2-3句话。""",
    "behavioral": """你是一位行为面试官，专注于考察候选人的过往经历和行为模式。
你会使用STAR法则引导候选人描述具体事例。
请保持耐心倾听，适时追问细节，帮助候选人展现真实水平。
每次回复控制在2-3句话。""",
}


class InterviewService:
    def __init__(self):
        self.sessions: Dict[str, Dict] = {}

    async def create_session(
        self,
        session_id: str,
        interview_type: str,
        difficulty: str,
        position: Optional[str] = None,
        user_id: Optional[str] = None,
        memory_service=None,
    ) -> None:
        self.sessions[session_id] = {
            "type": interview_type,
            "difficulty": difficulty,
            "position": position,
            "user_id": user_id or "default_user",
            "history": [],
            "memory_enhanced_prompt": None,
        }

        if memory_service:
            try:
                memories = await memory_service.get_context_for_interview(
                    user_id=user_id or "default_user",
                    topic=position,
                )
                base_prompt = INTERVIEW_PROMPTS.get(
                    interview_type, INTERVIEW_PROMPTS["hr"]
                )
                enhanced_prompt = await memory_service.build_system_prompt(
                    memories, base_prompt
                )
                self.sessions[session_id]["memory_enhanced_prompt"] = enhanced_prompt
                logger.info(f"Enhanced prompt with memories for session: {session_id}")
            except Exception as e:
                logger.warning(f"Failed to enhance prompt with memories: {e}")

        logger.info(f"Created interview session: {session_id}")

    def get_session(self, session_id: str) -> Optional[Dict]:
        return self.sessions.get(session_id)

    def process_user_message(self, session_id: str, user_message: str) -> str:
        context = self.sessions.get(session_id)
        if not context:
            raise ValueError(f"Session {session_id} not found")

        context["history"].append({"role": "user", "content": user_message})

        system_prompt = context.get("memory_enhanced_prompt") or INTERVIEW_PROMPTS.get(
            context["type"], INTERVIEW_PROMPTS["hr"]
        )
        position_context = (
            f"\n目标岗位：{context['position']}" if context["position"] else ""
        )

        messages = [
            {"role": "system", "content": system_prompt + position_context},
            *context["history"],
        ]

        response = volcengine_service.chat(messages)

        context["history"].append({"role": "assistant", "content": response})

        return response

    def generate_first_question(
        self,
        interview_type: str,
        position: Optional[str] = None,
        enhanced_prompt: Optional[str] = None,
    ) -> str:
        prompts = {
            "hr": f"作为HR面试官，请为{position}岗位的候选人提出第一个面试问题，要求简洁专业。"
            if position
            else "作为HR面试官，请提出第一个面试问题，让候选人做自我介绍。",
            "technical": f"作为技术面试官，请为{position}岗位的候选人提出第一个技术问题。"
            if position
            else "作为技术面试官，请提出第一个技术问题，考察候选人的基础知识。",
            "behavioral": "作为行为面试官，请提出第一个行为面试问题，让候选人描述一个具体经历。",
        }

        system_content = enhanced_prompt or INTERVIEW_PROMPTS.get(
            interview_type, INTERVIEW_PROMPTS["hr"]
        )

        messages = [
            {
                "role": "system",
                "content": system_content,
            },
            {"role": "user", "content": prompts.get(interview_type, prompts["hr"])},
        ]

        return volcengine_service.chat(messages)

    def end_session(self, session_id: str) -> Optional[Dict]:
        context = self.sessions.pop(session_id, None)
        if context:
            logger.info(f"Ended interview session: {session_id}")
        return context

    def generate_evaluation(self, session_id: str) -> Dict:
        context = self.sessions.get(session_id)
        if not context or not context["history"]:
            return {
                "score": 75.0,
                "feedback": "面试已完成，继续保持练习！",
            }

        history = context["history"]
        user_messages = [m for m in history if m["role"] == "user"]
        assistant_messages = [m for m in history if m["role"] == "assistant"]

        if len(user_messages) < 2:
            return {
                "score": 70.0,
                "feedback": "面试时间较短，建议多进行几轮对话以获得更准确的评估。",
            }

        eval_prompt = f"""请根据以下面试对话，对候选人进行评分和反馈。

面试类型: {context.get("type", "hr")}
目标岗位: {context.get("position", "通用")}

对话记录:
{self._format_history(history)}

请给出：
1. 综合评分(0-100分)
2. 简短反馈(50字以内)

请按以下JSON格式回复:
{{"score": 85, "feedback": "表现不错，回答清晰有条理。"}}"""

        try:
            messages = [
                {
                    "role": "system",
                    "content": "你是一位面试评估专家，请客观公正地评估候选人表现。",
                },
                {"role": "user", "content": eval_prompt},
            ]

            response = volcengine_service.chat(messages)

            import json
            import re

            json_match = re.search(r"\{[^}]+\}", response)
            if json_match:
                result = json.loads(json_match.group())
                return {
                    "score": float(result.get("score", 75)),
                    "feedback": result.get("feedback", "面试表现不错！"),
                }
        except Exception as e:
            logger.error(f"Failed to generate evaluation: {e}")

        return {
            "score": 75.0,
            "feedback": "面试已完成，感谢参与！",
        }

    def _format_history(self, history: List[Dict]) -> str:
        lines = []
        for msg in history[-10:]:
            role = "候选人" if msg["role"] == "user" else "面试官"
            lines.append(f"{role}: {msg['content'][:100]}")
        return "\n".join(lines)


interview_service = InterviewService()
