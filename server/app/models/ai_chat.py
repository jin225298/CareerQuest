from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from app.database import Base
from datetime import datetime


class AiChatSession(Base):
    __tablename__ = "ai_chat_sessions"

    id = Column(Integer, primary_key=True)
    session_id = Column(String(50), unique=True, index=True)
    user_id = Column(String(50), index=True)
    npc_type = Column(String(20), default="teacher")
    status = Column(String(20), default="active")
    context = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)


class AiChatMessage(Base):
    __tablename__ = "ai_chat_messages"

    id = Column(Integer, primary_key=True)
    session_id = Column(String(50), index=True)
    role = Column(String(20))
    content = Column(Text)
    recommended_task_id = Column(Integer, nullable=True)
    extra_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
