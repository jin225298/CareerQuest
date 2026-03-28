from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from app.database import Base
from datetime import datetime


class MemoryMeta(Base):
    __tablename__ = "memory_meta"

    id = Column(Integer, primary_key=True, index=True)
    memory_id = Column(String, unique=True, index=True)
    user_id = Column(String, index=True)
    level = Column(String, default="L2")
    error_type = Column(String)
    topic = Column(String, index=True)
    summary = Column(Text)
    original_content = Column(Text)
    error_count = Column(Integer, default=1)
    correct_count = Column(Integer, default=0)
    vector_hash = Column(String, index=True)
    source_session_id = Column(String)
    source_turn_index = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    upgraded_at = Column(DateTime, nullable=True)
    downgraded_at = Column(DateTime, nullable=True)
    last_accessed_at = Column(DateTime, default=datetime.utcnow)


class MemoryEvent(Base):
    __tablename__ = "memory_events"

    id = Column(Integer, primary_key=True, index=True)
    memory_id = Column(String, index=True)
    user_id = Column(String, index=True)
    event_type = Column(String)
    old_level = Column(String, nullable=True)
    new_level = Column(String, nullable=True)
    trigger = Column(String)
    session_id = Column(String)
    details = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class MemoryAudit(Base):
    __tablename__ = "memory_audits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    original_content = Column(Text)
    processed_content = Column(Text)
    sanitized = Column(Boolean, default=False)
    error_type = Column(String, nullable=True)
    topic = Column(String, nullable=True)
    processor_version = Column(String, default="1.0")
    processing_time_ms = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
