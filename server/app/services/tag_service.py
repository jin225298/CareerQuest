from typing import List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.user_tag import UserTag
from app.models import User


TAG_MAPPINGS = {
    "career": {
        "软件开发": ("career_tech", "技术岗"),
        "产品经理": ("career_product", "产品岗"),
        "设计师": ("career_design", "设计岗"),
        "运营": ("career_ops", "运营岗"),
        "市场": ("career_marketing", "市场岗"),
        "其他": ("career_other", "其他"),
    },
    "experience": {
        "应届生": ("exp_fresh", "应届生"),
        "1-3年": ("exp_junior", "初级经验"),
        "3-5年": ("exp_mid", "中级经验"),
        "5-10年": ("exp_senior", "高级经验"),
        "10年以上": ("exp_expert", "专家级"),
    },
    "industry": {
        "互联网/IT": ("industry_internet", "互联网"),
        "金融": ("industry_finance", "金融"),
        "教育": ("industry_education", "教育"),
        "医疗健康": ("industry_health", "医疗"),
        "制造业": ("industry_manufacture", "制造业"),
        "消费品": ("industry_consumer", "消费品"),
        "其他": ("industry_other", "其他"),
    },
    "company_type": {
        "大型互联网公司": ("company_bigtech", "大厂"),
        "创业公司": ("company_startup", "创业公司"),
        "外企": ("company_foreign", "外企"),
        "国企/事业单位": ("company_soe", "国企"),
        "不限": ("company_any", "不限"),
    },
    "job_search_status": {
        "在职看机会": ("status_active", "在职看机会"),
        "离职求职中": ("status_urgent", "紧急求职"),
        "应届生求职": ("status_fresh", "应届求职"),
        "暂无求职计划": ("status_passive", "暂无计划"),
    },
    "preparation_time": {
        "少于1小时": ("time_low", "轻度准备"),
        "1-2小时": ("time_medium", "中度准备"),
        "2-4小时": ("time_high", "强度准备"),
        "4小时以上": ("time_intense", "高强度准备"),
    },
    "goals": {
        "提升表达能力": ("goal_expression", "表达提升"),
        "克服紧张": ("goal_confidence", "自信提升"),
        "熟悉面试流程": ("goal_process", "流程熟悉"),
        "提升专业回答": ("goal_professional", "专业提升"),
        "其他": ("goal_other", "其他目标"),
    },
    "weakness": {
        "技术深度": ("weak_tech", "技术深度"),
        "项目经验": ("weak_project", "项目经验"),
        "表达能力": ("weak_expression", "表达能力"),
        "算法基础": ("weak_algorithm", "算法基础"),
        "系统设计": ("weak_system", "系统设计"),
        "行业知识": ("weak_industry", "行业知识"),
    },
    "style": {
        "友善温和": ("style_friendly", "友善风格"),
        "专业严肃": ("style_professional", "专业风格"),
        "压力面试": ("style_pressure", "压力风格"),
    },
}


async def generate_tags_from_profile(
    db: AsyncSession, user_id: str, profile: dict
) -> List[UserTag]:
    await db.execute(delete(UserTag).where(UserTag.user_id == user_id))

    tags = []

    single_fields = [
        ("career", "career"),
        ("experience", "experience"),
        ("industry", "industry"),
        ("company_type", "company_type"),
        ("job_search_status", "job_search_status"),
        ("preparation_time", "preparation_time"),
        ("style", "style"),
    ]

    for field, tag_type in single_fields:
        value = profile.get(field)
        if value and value in TAG_MAPPINGS.get(tag_type, {}):
            tag_key, tag_value = TAG_MAPPINGS[tag_type][value]
            tag = UserTag(
                user_id=user_id,
                tag_key=tag_key,
                tag_value=tag_value,
                tag_type=tag_type,
                confidence=1.0,
                source="survey",
            )
            tags.append(tag)

    for multi_field, tag_type in [("goals", "goal"), ("weakness", "weakness")]:
        values = profile.get(multi_field, [])
        if isinstance(values, list):
            mapping = TAG_MAPPINGS.get(multi_field, {})
            for value in values:
                if value in mapping:
                    tag_key, tag_value = mapping[value]
                    tag = UserTag(
                        user_id=user_id,
                        tag_key=tag_key,
                        tag_value=tag_value,
                        tag_type=tag_type,
                        confidence=1.0,
                        source="survey",
                    )
                    tags.append(tag)

    for tag in tags:
        db.add(tag)

    return tags


async def get_user_tags(db: AsyncSession, user_id: str) -> List[UserTag]:
    result = await db.execute(
        select(UserTag)
        .where(UserTag.user_id == user_id)
        .order_by(UserTag.tag_type, UserTag.tag_key)
    )
    return result.scalars().all()
