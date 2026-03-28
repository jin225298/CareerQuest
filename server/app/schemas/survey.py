from pydantic import BaseModel
from typing import List, Union, Optional
from enum import Enum


class QuestionType(str, Enum):
    single = "single"
    multiple = "multiple"
    text = "text"


class Question(BaseModel):
    id: str
    type: QuestionType
    question: str
    options: Optional[List[str]] = None
    required: bool = True


class Answer(BaseModel):
    question_id: str
    answer: Union[str, List[str]]


class SubmitSurveyRequest(BaseModel):
    answers: List[Answer]


class UserProfile(BaseModel):
    career: str = ""
    experience: str = ""
    target_position: Optional[str] = None
    goals: List[str] = []
    style: str = ""
    industry: Optional[str] = None
    company_type: Optional[str] = None
    salary_range: Optional[str] = None
    job_search_status: Optional[str] = None
    interview_experience: Optional[str] = None
    weakness: List[str] = []
    preparation_time: Optional[str] = None


class UserTagResponse(BaseModel):
    tag_key: str
    tag_value: str
    tag_type: str
    confidence: float = 1.0

    class Config:
        from_attributes = True


class SubmitSurveyResponse(BaseModel):
    profile: UserProfile
    tags: List[UserTagResponse] = []
    is_new_user: bool = False
