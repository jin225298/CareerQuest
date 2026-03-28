from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Float,
    JSON,
    Text,
    Boolean,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    nickname = Column(String, nullable=True)
    power = Column(Integer, default=50)
    mood = Column(Integer, default=70)
    hp = Column(Integer, default=100)
    wins = Column(Integer, default=0)
    profile_data = Column(JSON)
    career = Column(String)
    experience = Column(String)
    target_position = Column(String)
    industry = Column(String)
    company_type = Column(String)
    salary_range = Column(String)
    job_search_status = Column(String)
    preparation_time = Column(String)
    goals = Column(JSON)
    weakness = Column(JSON)
    style_preference = Column(String)
    is_profile_completed = Column(Boolean, default=False)
    profile_completed_at = Column(DateTime)
    avatar_happy_gif = Column(String, nullable=True)
    avatar_happy_png = Column(String, nullable=True)
    avatar_sad_gif = Column(String, nullable=True)
    avatar_sad_png = Column(String, nullable=True)
    avatar_excited_gif = Column(String, nullable=True)
    avatar_excited_png = Column(String, nullable=True)
    current_emotion = Column(String, default="happy")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tags = relationship("UserTag", back_populates="user", cascade="all, delete-orphan")


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    user_id = Column(String, nullable=True)
    type = Column(String)
    difficulty = Column(String)
    position = Column(String, nullable=True)
    history = Column(JSON, default=list)
    score = Column(Float, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    report_id = Column(String, ForeignKey("interview_reports.report_id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    report = relationship(
        "InterviewReport", back_populates="interview", foreign_keys=[report_id]
    )


class DailyTask(Base):
    __tablename__ = "daily_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    task_type = Column(String)
    description = Column(String)
    target_count = Column(Integer, default=1)
    current_count = Column(Integer, default=0)
    reward_power = Column(Integer, default=10)
    reward_mood = Column(Integer, default=5)
    is_completed = Column(Boolean, default=False)
    task_date = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


from app.models.user_tag import UserTag
from app.models.ai_chat import AiChatSession, AiChatMessage
from app.models.task_recommendation import TaskRecommendation
from app.models.interview_report import InterviewReport
from app.models.tree_hole import TreeHolePost, TreeHoleLike
from app.models.resume import Project, Skill, Resume
from app.models.friend import FriendRequest, Friendship, InterviewInvitation
from app.models.checkin import CheckIn, CheckInStreak
from app.models.memory import MemoryMeta, MemoryEvent, MemoryAudit
