from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from datetime import datetime
from app.database import Base
import enum


class FriendshipStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class InvitationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    expired = "expired"


class FriendRequest(Base):
    """好友请求"""

    __tablename__ = "friend_requests"

    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(String, nullable=False, index=True)
    to_user_id = Column(String, nullable=False, index=True)
    status = Column(String(20), default="pending")
    message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Friendship(Base):
    """好友关系"""

    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    friend_id = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    show_interview_records = Column(Integer, default=1)
    show_stats = Column(Integer, default=1)


class InterviewInvitation(Base):
    """面试邀请"""

    __tablename__ = "interview_invitations"

    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(String, nullable=False, index=True)
    to_user_id = Column(String, nullable=False, index=True)
    interview_type = Column(String(50))
    position = Column(String(100))
    status = Column(String(20), default="pending")
    scheduled_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
