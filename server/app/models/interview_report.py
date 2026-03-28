from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey
from app.database import Base
from datetime import datetime


from sqlalchemy.orm import relationship


class InterviewReport(Base):
    __tablename__ = "interview_reports"

    id = Column(Integer, primary_key=True)
    report_id = Column(String, unique=True, index=True)
    session_id = Column(String, ForeignKey("interviews.session_id"))
    user_id = Column(String, index=True)

    overall_score = Column(Integer)
    overall_grade = Column(String)
    summary = Column(Text)
    dimensions = Column(JSON)
    question_analysis = Column(JSON)
    recommendations = Column(JSON)
    interview_meta = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    interview = relationship(
        "Interview", back_populates="report", foreign_keys="Interview.report_id"
    )
