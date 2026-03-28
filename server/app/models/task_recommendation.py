from sqlalchemy import Column, Integer, String, DateTime, Text
from app.database import Base
from datetime import datetime


class TaskRecommendation(Base):
    __tablename__ = "task_recommendations"

    id = Column(Integer, primary_key=True)
    user_id = Column(String(50), index=True)
    task_type = Column(String(30))
    title = Column(String(200))
    description = Column(Text)
    reason = Column(Text)
    source_session_id = Column(String(50))
    status = Column(String(20), default="pending")
    reward_power = Column(Integer, default=10)
    reward_mood = Column(Integer, default=5)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    decided_at = Column(DateTime, nullable=True)
    converted_task_id = Column(Integer, nullable=True)
