import json
import logging
from typing import List, Dict, Optional
from app.services.volcengine import volcengine_service
from app.models import User

logger = logging.getLogger(__name__)

TASK_TEMPLATES = {
    "knowledge": {
        "prefix": "学习知识点：",
        "examples": [
            "深入理解React Hooks原理",
            "掌握HTTP缓存策略",
            "学习CSS Grid布局",
            "理解JavaScript事件循环",
            "掌握SQL索引优化",
        ],
    },
    "project": {
        "prefix": "实战项目：",
        "examples": [
            "完成一个响应式导航组件",
            "实现一个简单的状态管理库",
            "编写一个API请求封装工具",
            "实现一个图片懒加载功能",
            "完成一个表单验证工具",
        ],
    },
    "interview": {
        "prefix": "面试练习：",
        "examples": [
            "模拟自我介绍场景",
            "回答项目难点问题",
            "练习薪资谈判技巧",
            "模拟离职原因回答",
            "练习技术问题解答",
        ],
    },
}


class TaskGeneratorService:
    def __init__(self):
        self.llm = volcengine_service

    def generate_tasks(
        self,
        user: User,
        count: int = 3,
        task_types: Optional[List[str]] = None,
    ) -> List[Dict]:
        if task_types is None:
            task_types = ["knowledge", "project", "interview"]

        prompt = self._build_prompt(user, task_types)

        try:
            response = self.llm.chat([{"role": "user", "content": prompt}])
            tasks = self._parse_response(response, task_types)

            if len(tasks) < count:
                tasks.extend(
                    self._generate_fallback_tasks(user, count - len(tasks), task_types)
                )

            return tasks[:count]
        except Exception as e:
            logger.error(f"Task generation failed: {e}")
            return self._generate_fallback_tasks(user, count, task_types)

    def _build_prompt(self, user: User, task_types: List[str]) -> str:
        weakness = user.weakness or []
        goals = user.goals or []
        career = user.career or ""
        target_position = user.target_position or ""
        experience = user.experience or ""

        weakness_str = "、".join(weakness) if weakness else "暂无"
        goals_str = "、".join(goals) if goals else "暂无"

        prompt = f"""你是一个专业的职业发展顾问。根据用户画像生成个性化学习任务。

用户画像：
- 职业方向：{career}
- 目标职位：{target_position}
- 工作经验：{experience}
- 待提升项：{weakness_str}
- 学习目标：{goals_str}

任务类型：{", ".join(task_types)}
- knowledge: 知识学习类任务
- project: 实战项目类任务  
- interview: 面试练习类任务

请生成3个个性化任务，以JSON数组格式返回：
```json
[
  {{
    "task_type": "knowledge|project|interview",
    "title": "任务标题（简洁明了）",
    "description": "任务详细描述",
    "reason": "推荐理由（结合用户画像说明为什么推荐这个任务）"
  }}
]
```

注意：
1. 任务要针对用户的薄弱项和目标
2. 标题要简洁有力
3. 描述要具体可执行
4. 理由要个性化，体现对用户画像的理解
5. 只返回JSON数组，不要其他内容"""

        return prompt

    def _parse_response(self, response: str, task_types: List[str]) -> List[Dict]:
        try:
            json_match = response
            if "```json" in response:
                json_match = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_match = response.split("```")[1].split("```")[0]

            tasks = json.loads(json_match.strip())

            valid_tasks = []
            for task in tasks:
                if task.get("task_type") in task_types:
                    task["reward_power"] = self._calculate_power_reward(
                        task["task_type"]
                    )
                    task["reward_mood"] = self._calculate_mood_reward(task["task_type"])
                    valid_tasks.append(task)

            return valid_tasks
        except (json.JSONDecodeError, KeyError, IndexError) as e:
            logger.error(f"Failed to parse task response: {e}")
            return []

    def _calculate_power_reward(self, task_type: str) -> int:
        rewards = {
            "knowledge": 15,
            "project": 25,
            "interview": 20,
        }
        return rewards.get(task_type, 10)

    def _calculate_mood_reward(self, task_type: str) -> int:
        rewards = {
            "knowledge": 10,
            "project": 15,
            "interview": 12,
        }
        return rewards.get(task_type, 5)

    def _generate_fallback_tasks(
        self, user: User, count: int, task_types: List[str]
    ) -> List[Dict]:
        tasks = []
        weakness = user.weakness or []

        for i, task_type in enumerate(task_types[:count]):
            template = TASK_TEMPLATES.get(task_type, TASK_TEMPLATES["knowledge"])
            weakness_item = weakness[i % len(weakness)] if weakness else "相关技能"

            title = f"{template['prefix']}{weakness_item}"
            tasks.append(
                {
                    "task_type": task_type,
                    "title": title,
                    "description": f"针对您的{weakness_item}进行专项提升练习",
                    "reason": f"根据您希望提升{weakness_item}的需求推荐",
                    "reward_power": self._calculate_power_reward(task_type),
                    "reward_mood": self._calculate_mood_reward(task_type),
                }
            )

        return tasks

    def generate_from_chat(
        self, user: User, chat_context: List[Dict], npc_type: str = "teacher"
    ) -> Optional[Dict]:
        last_messages = chat_context[-5:] if len(chat_context) > 5 else chat_context
        messages_text = "\n".join(
            [f"{m['role']}: {m['content']}" for m in last_messages]
        )

        prompt = f"""根据以下对话内容，判断是否需要为用户推荐一个学习任务。

对话内容：
{messages_text}

如果用户表现出学习需求或困惑，请返回一个任务推荐：
```json
{{
  "need_recommendation": true,
  "task": {{
    "task_type": "knowledge|project|interview",
    "title": "任务标题",
    "description": "任务描述",
    "reason": "推荐理由（基于对话内容）"
  }}
}}
```

如果不需要推荐任务：
```json
{{
  "need_recommendation": false
}}
```

只返回JSON，不要其他内容。"""

        try:
            response = self.llm.chat([{"role": "user", "content": prompt}])
            result = self._parse_chat_response(response)
            if result and result.get("need_recommendation") and result.get("task"):
                task = result["task"]
                task["reward_power"] = self._calculate_power_reward(
                    task.get("task_type", "knowledge")
                )
                task["reward_mood"] = self._calculate_mood_reward(
                    task.get("task_type", "knowledge")
                )
                return task
        except Exception as e:
            logger.error(f"Failed to generate task from chat: {e}")

        return None

    def _parse_chat_response(self, response: str) -> Optional[Dict]:
        try:
            json_match = response
            if "```json" in response:
                json_match = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_match = response.split("```")[1].split("```")[0]
            return json.loads(json_match.strip())
        except (json.JSONDecodeError, KeyError, IndexError):
            return None


task_generator = TaskGeneratorService()
