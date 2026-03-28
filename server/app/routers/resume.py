from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.schemas.resume import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    SkillCreate,
    SkillResponse,
    ResumeGenerateRequest,
    ResumeOptimizeRequest,
    ResumeResponse,
    ResumeProfileResponse,
)
from app.database import get_db
from app.models import User
from app.models.resume import Project, Skill, Resume
from app.services.resume_service import resume_service
from typing import Optional
import json

router = APIRouter(prefix="/resume")


@router.get("/profile", response_model=ResumeProfileResponse)
async def get_resume_profile(
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"

    user_result = await db.execute(select(User).where(User.user_id == uid))
    user = user_result.scalar_one_or_none()

    profile = {}
    if user:
        profile = {
            "career": user.career,
            "experience": user.experience,
            "target_position": user.target_position,
            "industry": user.industry,
            "company_type": user.company_type,
            "salary_range": user.salary_range,
            "goals": user.goals or [],
            "weakness": user.weakness or [],
        }

    projects_result = await db.execute(
        select(Project)
        .where(Project.user_id == uid)
        .order_by(Project.created_at.desc())
    )
    projects = projects_result.scalars().all()

    skills_result = await db.execute(
        select(Skill).where(Skill.user_id == uid).order_by(Skill.created_at.desc())
    )
    skills = skills_result.scalars().all()

    return ResumeProfileResponse(
        profile=profile,
        projects=[_project_to_response(p) for p in projects],
        skills=[_skill_to_response(s) for s in skills],
    )


@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"

    project = Project(
        user_id=uid,
        name=project_data.name,
        description=project_data.description,
        tech_stack=json.dumps(project_data.tech_stack, ensure_ascii=False),
        role=project_data.role,
        start_date=project_data.start_date,
        end_date=project_data.end_date,
        link=project_data.link,
        highlights=json.dumps(project_data.highlights, ensure_ascii=False),
    )

    db.add(project)
    await db.commit()
    await db.refresh(project)

    return _project_to_response(project)


@router.get("/projects", response_model=list[ProjectResponse])
async def get_projects(
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"

    result = await db.execute(
        select(Project)
        .where(Project.user_id == uid)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()

    return [_project_to_response(p) for p in projects]


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"

    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == uid)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    update_dict = project_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if key in ["tech_stack", "highlights"] and value is not None:
            setattr(project, key, json.dumps(value, ensure_ascii=False))
        elif hasattr(project, key):
            setattr(project, key, value)

    await db.commit()
    await db.refresh(project)

    return _project_to_response(project)


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: int,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"

    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == uid)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    await db.delete(project)
    await db.commit()

    return {"message": "删除成功"}


@router.post("/skills", response_model=SkillResponse)
async def create_skill(
    skill_data: SkillCreate,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"

    skill = Skill(
        user_id=uid,
        name=skill_data.name,
        level=skill_data.level,
        category=skill_data.category,
        years_of_experience=skill_data.years_of_experience,
    )

    db.add(skill)
    await db.commit()
    await db.refresh(skill)

    return _skill_to_response(skill)


@router.get("/skills", response_model=list[SkillResponse])
async def get_skills(
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"

    result = await db.execute(
        select(Skill).where(Skill.user_id == uid).order_by(Skill.created_at.desc())
    )
    skills = result.scalars().all()

    return [_skill_to_response(s) for s in skills]


@router.delete("/skills/{skill_id}")
async def delete_skill(
    skill_id: int,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"

    result = await db.execute(
        select(Skill).where(Skill.id == skill_id, Skill.user_id == uid)
    )
    skill = result.scalar_one_or_none()

    if not skill:
        raise HTTPException(status_code=404, detail="技能不存在")

    await db.delete(skill)
    await db.commit()

    return {"message": "删除成功"}


@router.post("/generate")
async def generate_resume(
    request: ResumeGenerateRequest,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"

    user_result = await db.execute(select(User).where(User.user_id == uid))
    user = user_result.scalar_one_or_none()

    profile = {}
    if user:
        profile = {
            "career": user.career,
            "experience": user.experience,
            "target_position": user.target_position,
            "industry": user.industry,
            "company_type": user.company_type,
        }

    projects_result = await db.execute(
        select(Project)
        .where(Project.user_id == uid)
        .order_by(Project.created_at.desc())
    )
    projects = projects_result.scalars().all()

    skills_result = await db.execute(
        select(Skill).where(Skill.user_id == uid).order_by(Skill.created_at.desc())
    )
    skills = skills_result.scalars().all()

    projects_data = [_project_to_dict(p) for p in projects]
    skills_data = [_skill_to_dict(s) for s in skills]

    content = resume_service.generate_resume(
        profile=profile,
        projects=projects_data,
        skills=skills_data,
        target_position=request.target_position,
        target_company=request.target_company,
        style=request.style,
    )

    resume = Resume(
        user_id=uid,
        content=content,
        template=request.style,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    return {
        "id": resume.id,
        "content": content,
        "template": resume.template,
        "created_at": resume.created_at,
    }


@router.post("/optimize")
async def optimize_resume(
    request: ResumeOptimizeRequest,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"

    optimized_content = resume_service.optimize_resume(
        resume_content=request.resume_content,
        target_position=request.target_position,
        focus_areas=request.focus_areas,
    )

    resume = Resume(
        user_id=uid,
        content=optimized_content,
        template="optimized",
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    return {
        "id": resume.id,
        "content": optimized_content,
        "template": resume.template,
        "created_at": resume.created_at,
    }


def _project_to_response(project: Project) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        user_id=project.user_id,
        name=project.name,
        description=project.description,
        tech_stack=json.loads(project.tech_stack) if project.tech_stack else [],
        role=project.role,
        start_date=project.start_date,
        end_date=project.end_date,
        link=project.link,
        highlights=json.loads(project.highlights) if project.highlights else [],
        created_at=project.created_at,
    )


def _skill_to_response(skill: Skill) -> SkillResponse:
    return SkillResponse(
        id=skill.id,
        user_id=skill.user_id,
        name=skill.name,
        level=skill.level,
        category=skill.category,
        years_of_experience=skill.years_of_experience,
        created_at=skill.created_at,
    )


def _project_to_dict(project: Project) -> dict:
    return {
        "name": project.name,
        "description": project.description,
        "tech_stack": json.loads(project.tech_stack) if project.tech_stack else [],
        "role": project.role,
        "start_date": project.start_date,
        "end_date": project.end_date,
        "link": project.link,
        "highlights": json.loads(project.highlights) if project.highlights else [],
    }


def _skill_to_dict(skill: Skill) -> dict:
    return {
        "name": skill.name,
        "level": skill.level,
        "category": skill.category,
        "years_of_experience": skill.years_of_experience,
    }
