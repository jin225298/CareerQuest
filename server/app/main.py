from app.config import settings
from app.database import init_db
from app.routers import (
    interview,
    survey,
    user,
    avatar,
    task,
    achievement,
    ai_chat,
    voice,
    tree_hole,
    resume,
    friend,
    checkin,
    memory,
)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging

logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user.router, prefix="/api/v1", tags=["user"])
app.include_router(survey.router, prefix="/api/v1", tags=["survey"])
app.include_router(interview.router, prefix="/api/v1", tags=["interview"])
app.include_router(avatar.router, prefix="/api/v1", tags=["avatar"])
app.include_router(task.router, prefix="/api/v1", tags=["task"])
app.include_router(achievement.router, prefix="/api/v1", tags=["achievement"])
app.include_router(ai_chat.router, prefix="/api/v1", tags=["ai-chat"])
app.include_router(voice.router, prefix="/api/v1", tags=["voice"])
app.include_router(tree_hole.router, prefix="/api/v1", tags=["tree-hole"])
app.include_router(resume.router, prefix="/api/v1", tags=["resume"])
app.include_router(friend.router, prefix="/api/v1", tags=["friend"])
app.include_router(checkin.router, prefix="/api/v1", tags=["checkin"])
app.include_router(memory.router, prefix="/api/v1", tags=["memory"])

static_dir = Path(__file__).parent.parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting up...")
    await init_db()
    logger.info("✅ Database initialized")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("👋 Shutting down...")


@app.get("/")
async def root():
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION, "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}
