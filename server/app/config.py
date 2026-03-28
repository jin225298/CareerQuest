from pydantic_settings import BaseSettings
from typing import List
import os
from pathlib import Path
from dotenv import load_dotenv

# 加载.env文件
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


class Settings(BaseSettings):
    ARK_API_KEY: str = ""
    ARK_MODEL: str = "doubao-1-5-pro-32k-250115"

    DATABASE_URL: str = "sqlite+aiosqlite:///./interview.db"

    APP_NAME: str = "面试修炼手册API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        case_sensitive = True


settings = Settings()
