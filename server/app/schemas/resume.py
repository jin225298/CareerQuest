from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tech_stack: Optional[List[str]] = []
    role: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    link: Optional[str] = None
    highlights: Optional[List[str]] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    role: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    link: Optional[str] = None
    highlights: Optional[List[str]] = None


class ProjectResponse(BaseModel):
    id: int
    user_id: str
    name: str
    description: Optional[str] = None
    tech_stack: List[str] = []
    role: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    link: Optional[str] = None
    highlights: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class SkillCreate(BaseModel):
    name: str
    level: Optional[str] = "intermediate"
    category: Optional[str] = "tool"
    years_of_experience: Optional[int] = 0


class SkillResponse(SkillCreate):
    id: int
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ResumeGenerateRequest(BaseModel):
    target_position: Optional[str] = None
    target_company: Optional[str] = None
    style: Optional[str] = "modern"


class ResumeOptimizeRequest(BaseModel):
    resume_content: str
    target_position: Optional[str] = None
    focus_areas: Optional[List[str]] = []


class ResumeResponse(BaseModel):
    id: int
    user_id: str
    content: str
    template: str
    created_at: datetime

    class Config:
        from_attributes = True


class ResumeProfileResponse(BaseModel):
    profile: dict
    projects: List[ProjectResponse]
    skills: List[SkillResponse]
