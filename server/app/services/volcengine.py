import os
import httpx
import logging
from typing import List, Dict
import json

logger = logging.getLogger(__name__)


class VolcengineService:
    """火山引擎服务 - HTTP API方式"""

    def __init__(self):
        self.api_key = os.getenv("ARK_API_KEY", "")
        self.model = os.getenv("ARK_MODEL", "doubao-1-5-pro-32k-250115")
        self.base_url = "https://ark.cn-beijing.volces.com/api/v3"

        if not self.api_key:
            logger.warning("⚠️  ARK_API_KEY 未设置")
        else:
            logger.info(f"✅ 火山引擎服务已初始化，模型: {self.model}")

    def chat(self, messages: List[Dict[str, str]]) -> str:
        """调用火山引擎LLM - 使用HTTP API"""
        if not self.api_key:
            logger.error("ARK_API_KEY 未配置")
            return self._mock_chat(messages)

        try:
            # 使用同步HTTP请求
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.api_key}",
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 2048,
                    },
                )

                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"]
                else:
                    logger.error(
                        f"API调用失败: {response.status_code} - {response.text}"
                    )
                    return self._mock_chat(messages)

        except Exception as e:
            logger.error(f"火山引擎API调用异常: {e}")
            return self._mock_chat(messages)

    def _mock_chat(self, messages: List[Dict[str, str]]) -> str:
        """模拟对话（备用）"""
        last_message = messages[-1]["content"] if messages else ""

        if "自我介绍" in last_message or "第一个面试问题" in last_message:
            return "你好，欢迎参加面试。请先做一个简单的自我介绍。"
        elif len(last_message) > 20:
            return "很好，你的回答很详细。能否告诉我，你在工作中遇到的最大挑战是什么？你是如何解决的？"
        else:
            return "感谢你的回答。能否再详细说明一下你的具体情况和经历？"


volcengine_service = VolcengineService()
