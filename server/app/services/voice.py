from typing import Dict, Optional
import uuid
import logging
import time

logger = logging.getLogger(__name__)


class VoiceSession:
    def __init__(
        self,
        session_id: str,
        position: Optional[str] = None,
        company: Optional[str] = None,
    ):
        self.session_id = session_id
        self.position = position
        self.company = company
        self.status = "idle"
        self.created_at = time.time()
        self.message_count = 0
        self.history: list = []

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "status": self.status,
            "duration_seconds": int(time.time() - self.created_at),
            "message_count": self.message_count,
        }


class VoiceService:
    def __init__(self):
        self.sessions: Dict[str, VoiceSession] = {}
        self._mock_responses = [
            "你好！我是今天的面试官，很高兴和你进行这次语音面试。请先做一个简单的自我介绍吧。",
            "好的，我了解了。能具体说说你在这个项目中的角色和贡献吗？",
            "非常有意思的经历。你在项目中遇到过什么挑战？是如何解决的？",
            "很好。如果我们录用你，你觉得你能给团队带来什么价值？",
            "感谢你的分享。你有什么问题想问我们的吗？",
        ]

    def create_session(
        self,
        position: Optional[str] = None,
        company: Optional[str] = None,
    ) -> VoiceSession:
        session_id = f"voice_{uuid.uuid4().hex[:12]}"
        session = VoiceSession(
            session_id=session_id,
            position=position,
            company=company,
        )
        session.status = "connecting"
        self.sessions[session_id] = session
        logger.info(f"Created voice session: {session_id}")
        return session

    def get_session(self, session_id: str) -> Optional[VoiceSession]:
        return self.sessions.get(session_id)

    def start_session(self, session_id: str) -> bool:
        session = self.sessions.get(session_id)
        if not session:
            return False
        session.status = "active"
        logger.info(f"Started voice session: {session_id}")
        return True

    def process_audio(
        self,
        session_id: str,
        audio_data: Optional[bytes] = None,
    ) -> dict:
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        session.message_count += 1

        response_index = min(session.message_count - 1, len(self._mock_responses) - 1)
        ai_response = self._mock_responses[response_index]

        return {
            "session_id": session_id,
            "transcript": "Mock transcript for user input",
            "ai_response": ai_response,
            "is_speaking": True,
        }

    def end_session(self, session_id: str) -> Optional[dict]:
        session = self.sessions.pop(session_id, None)
        if session:
            session.status = "ended"
            logger.info(f"Ended voice session: {session_id}")
            return session.to_dict()
        return None

    def get_status(self, session_id: str) -> Optional[dict]:
        session = self.sessions.get(session_id)
        if session:
            return session.to_dict()
        return None


voice_service = VoiceService()
