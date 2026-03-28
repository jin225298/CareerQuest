from pydantic import BaseModel
from typing import Optional, List, Union, Any, Dict
from datetime import datetime


class StartInterviewRequest(BaseModel):
    type: str
    difficulty: str
    position: Optional[str] = None


class StartInterviewResponse(BaseModel):
    session_id: str
    first_question: str
    type: str
    difficulty: str


class ReplyRequest(BaseModel):
    session_id: str
    message: str


class ReplyResponse(BaseModel):
    response: str
    session_id: str


class EndInterviewRequest(BaseModel):
    session_id: str
    max_stress: int = 0


class EndInterviewResponse(BaseModel):
    success: bool
    session_id: str
    message_count: int
    score: float
    feedback: str
    unlocked_achievements: List[Any] = []


class InterviewHistory(BaseModel):
    id: int
    type: str
    difficulty: str
    score: Optional[float]
    duration_seconds: Optional[int]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class DimensionScore(BaseModel):
    score: int
    comment: str


class QuestionAnalysis(BaseModel):
    question: str
    answer: str
    score: int
    analysis: str


class Recommendation(BaseModel):
    title: str
    content: str
    priority: str


class InterviewReportResponse(BaseModel):
    report_id: str
    session_id: str
    user_id: str
    overall_score: int
    overall_grade: str
    summary: str
    dimensions: Dict[str, DimensionScore]
    question_analysis: List[QuestionAnalysis]
    recommendations: List[Recommendation]
    interview_meta: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewReportBrief(BaseModel):
    report_id: str
    session_id: str
    overall_score: int
    overall_grade: str
    created_at: datetime
