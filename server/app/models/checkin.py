from sqlalchemy import Column, Integer, String, DateTime, Date, Text
from datetime import datetime, date
from app.database import Base


class CheckIn(Base):
    """打卡记录"""

    __tablename__ = "check_ins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    check_date = Column(Date, nullable=False, index=True)
    check_type = Column(String(20), default="daily")
    notes = Column(Text)
    power_gained = Column(Integer, default=0)
    mood_gained = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class CheckInStreak(Base):
    """连续打卡统计"""

    __tablename__ = "check_in_streaks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, unique=True, index=True)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_check_date = Column(Date)
    total_check_ins = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
