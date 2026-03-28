from app.routers.interview import router as interview_router
from app.routers.survey import router as survey_router
from app.routers.user import router as user_router
from app.routers.avatar import router as avatar_router
from app.routers.ai_chat import router as ai_chat_router

__all__ = [
    "interview_router",
    "survey_router",
    "user_router",
    "avatar_router",
    "ai_chat_router",
]
