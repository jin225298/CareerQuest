from app.services.volcengine import volcengine_service
from app.services.prompts import (
    RESUME_GENERATION_PROMPT,
    RESUME_OPTIMIZATION_PROMPT,
    PROJECT_SUGGESTION_PROMPT,
)
from typing import Dict, List, Optional
import logging
import json

logger = logging.getLogger(__name__)


class ResumeService:
    def __init__(self):
        pass

    def generate_resume(
        self,
        profile: dict,
        projects: List[dict],
        skills: List[dict],
        target_position: Optional[str] = None,
        target_company: Optional[str] = None,
        style: str = "modern",
    ) -> str:
        prompt = self._build_generate_prompt(
            profile, projects, skills, target_position, target_company, style
        )

        messages = [
            {
                "role": "system",
                "content": "你是一位资深简历撰写专家，擅长根据候选人的背景信息生成专业、有针对性的简历内容。",
            },
            {"role": "user", "content": prompt},
        ]

        return volcengine_service.chat(messages)

    def optimize_resume(
        self,
        resume_content: str,
        target_position: Optional[str] = None,
        focus_areas: List[str] = [],
    ) -> str:
        prompt = self._build_optimize_prompt(
            resume_content, target_position, focus_areas
        )

        messages = [
            {
                "role": "system",
                "content": "你是一位简历优化专家，擅长改进简历内容使其更具吸引力和专业性。",
            },
            {"role": "user", "content": prompt},
        ]

        return volcengine_service.chat(messages)

    def suggest_projects(
        self,
        career: str,
        existing_projects: List[str],
    ) -> str:
        prompt = PROJECT_SUGGESTION_PROMPT.format(
            career=career,
            existing_projects="、".join(existing_projects)
            if existing_projects
            else "暂无",
        )

        messages = [
            {
                "role": "system",
                "content": "你是一位职业规划专家，擅长根据求职目标推荐合适的项目经历。",
            },
            {"role": "user", "content": prompt},
        ]

        return volcengine_service.chat(messages)

    def _build_generate_prompt(
        self,
        profile: dict,
        projects: List[dict],
        skills: List[dict],
        target_position: Optional[str],
        target_company: Optional[str],
        style: str,
    ) -> str:
        experience = profile.get("experience", "未提供")
        career = profile.get("career", "未提供")
        goals = profile.get("goals", "未提供")

        projects_str = json.dumps(projects, ensure_ascii=False, indent=2)
        skills_str = json.dumps(skills, ensure_ascii=False, indent=2)

        return RESUME_GENERATION_PROMPT.format(
            target_position=target_position or "通用岗位",
            target_company=target_company or "不限",
            experience=experience,
            career=career,
            goals=goals,
            projects=projects_str,
            skills=skills_str,
            style=style,
        )

    def _build_optimize_prompt(
        self,
        resume_content: str,
        target_position: Optional[str],
        focus_areas: List[str],
    ) -> str:
        focus_str = "、".join(focus_areas) if focus_areas else "整体优化"

        return RESUME_OPTIMIZATION_PROMPT.format(
            resume_content=resume_content,
            target_position=target_position or "通用岗位",
            focus_areas=focus_str,
        )


resume_service = ResumeService()
