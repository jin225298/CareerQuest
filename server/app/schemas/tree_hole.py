from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PostCreate(BaseModel):
    emotion: str
    content: str
    is_anonymous: bool = False


class PostResponse(BaseModel):
    id: int
    emotion: str
    content: str
    likes_count: int
    created_at: datetime
    is_anonymous: bool
    author_name: Optional[str] = None
    is_liked: bool = False

    class Config:
        from_attributes = True


class PostListResponse(BaseModel):
    posts: List[PostResponse]
    total: int


class LikeResponse(BaseModel):
    success: bool
    likes_count: int
