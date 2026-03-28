from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.schemas.survey import (
    Question,
    SubmitSurveyRequest,
    UserProfile,
    SubmitSurveyResponse,
    UserTagResponse,
)
from app.database import get_db
from app.models import User
from app.services.tag_service import generate_tags_from_profile
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/survey")

SURVEY_QUESTIONS = [
    Question(
        id="career",
        type="single",
        question="你的职业方向是什么？",
        options=["软件开发", "产品经理", "设计师", "运营", "市场", "其他"],
        required=True,
    ),
    Question(
        id="experience",
        type="single",
        question="你有多少年工作经验？",
        options=["应届生", "1-3年", "3-5年", "5-10年", "10年以上"],
        required=True,
    ),
    Question(
        id="target_position",
        type="text",
        question="你的目标岗位是什么？（可选）",
        required=False,
    ),
    Question(
        id="goals",
        type="multiple",
        question="你希望通过面试练习达到什么目标？",
        options=["提升表达能力", "克服紧张", "熟悉面试流程", "提升专业回答", "其他"],
        required=True,
    ),
    Question(
        id="style",
        type="single",
        question="你希望面试官的风格是？",
        options=["友善温和", "专业严肃", "压力面试"],
        required=True,
    ),
    Question(
        id="industry",
        type="single",
        question="你想进入哪个行业？",
        options=["互联网/IT", "金融", "教育", "医疗健康", "制造业", "消费品", "其他"],
        required=False,
    ),
    Question(
        id="company_type",
        type="single",
        question="你倾向于什么类型的公司？",
        options=["大型互联网公司", "创业公司", "外企", "国企/事业单位", "不限"],
        required=False,
    ),
    Question(
        id="salary_range",
        type="single",
        question="你的期望薪资范围？",
        options=["5K以下", "5K-10K", "10K-20K", "20K-35K", "35K-50K", "50K以上"],
        required=False,
    ),
    Question(
        id="job_search_status",
        type="single",
        question="你目前的求职状态？",
        options=["在职看机会", "离职求职中", "应届生求职", "暂无求职计划"],
        required=False,
    ),
    Question(
        id="interview_experience",
        type="single",
        question="你有过面试经历吗？",
        options=["没有", "1-3次", "3-10次", "10次以上"],
        required=False,
    ),
    Question(
        id="weakness",
        type="multiple",
        question="你觉得自己的短板是什么？",
        options=[
            "技术深度",
            "项目经验",
            "表达能力",
            "算法基础",
            "系统设计",
            "行业知识",
        ],
        required=False,
    ),
    Question(
        id="preparation_time",
        type="single",
        question="你每天能投入多少时间准备？",
        options=["少于1小时", "1-2小时", "2-4小时", "4小时以上"],
        required=False,
    ),
]


@router.get("/questions", response_model=List[Question])
async def get_questions():
    """获取问卷题目"""
    return SURVEY_QUESTIONS


def _get_answer_value(answer) -> str | None:
    if answer is None:
        return None
    if isinstance(answer, str):
        return answer
    if isinstance(answer, list) and len(answer) > 0:
        return answer[0] if isinstance(answer[0], str) else str(answer[0])
    return None


def _get_answer_list(answer) -> list:
    if answer is None:
        return []
    if isinstance(answer, list):
        return [a for a in answer if isinstance(a, str)]
    if isinstance(answer, str):
        return [answer]
    return []


@router.post("/submit", response_model=SubmitSurveyResponse)
async def submit_survey(
    request: SubmitSurveyRequest,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    profile = UserProfile()

    for answer in request.answers:
        if answer.question_id == "career":
            profile.career = _get_answer_value(answer.answer) or ""
        elif answer.question_id == "experience":
            profile.experience = _get_answer_value(answer.answer) or ""
        elif answer.question_id == "target_position":
            profile.target_position = _get_answer_value(answer.answer)
        elif answer.question_id == "goals":
            profile.goals = _get_answer_list(answer.answer)
        elif answer.question_id == "style":
            profile.style = _get_answer_value(answer.answer) or ""
        elif answer.question_id == "industry":
            profile.industry = _get_answer_value(answer.answer)
        elif answer.question_id == "company_type":
            profile.company_type = _get_answer_value(answer.answer)
        elif answer.question_id == "salary_range":
            profile.salary_range = _get_answer_value(answer.answer)
        elif answer.question_id == "job_search_status":
            profile.job_search_status = _get_answer_value(answer.answer)
        elif answer.question_id == "interview_experience":
            profile.interview_experience = _get_answer_value(answer.answer)
        elif answer.question_id == "weakness":
            profile.weakness = _get_answer_list(answer.answer)
        elif answer.question_id == "preparation_time":
            profile.preparation_time = _get_answer_value(answer.answer)

    uid = user_id or "demo-user"

    result = await db.execute(select(User).where(User.user_id == uid))
    user = result.scalar_one_or_none()

    if not user:
        user = User(user_id=uid, nickname="测试用户")
        db.add(user)
        await db.flush()

    is_new_user = not user.is_profile_completed

    profile_dict = profile.model_dump()
    user.profile_data = request.model_dump()
    user.career = profile.career or None
    user.experience = profile.experience or None
    user.target_position = profile.target_position
    user.industry = profile.industry
    user.company_type = profile.company_type
    user.salary_range = profile.salary_range
    user.job_search_status = profile.job_search_status
    user.preparation_time = profile.preparation_time
    user.goals = profile.goals
    user.weakness = profile.weakness
    user.style_preference = profile.style or None
    user.is_profile_completed = True
    user.profile_completed_at = datetime.utcnow()

    tags = await generate_tags_from_profile(db, uid, profile_dict)

    await db.commit()

    tag_responses = [
        UserTagResponse(
            tag_key=t.tag_key,
            tag_value=t.tag_value,
            tag_type=t.tag_type,
            confidence=t.confidence,
        )
        for t in tags
    ]

    return SubmitSurveyResponse(
        profile=profile, tags=tag_responses, is_new_user=is_new_user
    )
