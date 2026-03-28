from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.schemas.tree_hole import (
    PostCreate,
    PostResponse,
    PostListResponse,
    LikeResponse,
)
from app.database import get_db
from app.models.tree_hole import TreeHolePost, TreeHoleLike
from app.models import User
from typing import Optional

router = APIRouter(prefix="/tree-hole")


@router.post("/posts", response_model=PostResponse)
async def create_post(
    data: PostCreate,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    post = TreeHolePost(
        user_id=uid if not data.is_anonymous else None,
        emotion=data.emotion,
        content=data.content,
        is_anonymous=data.is_anonymous,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)

    return PostResponse(
        id=post.id,
        emotion=post.emotion,
        content=post.content,
        likes_count=post.likes_count,
        created_at=post.created_at,
        is_anonymous=post.is_anonymous,
        author_name=None if data.is_anonymous else "用户",
        is_liked=False,
    )


@router.get("/posts", response_model=PostListResponse)
async def list_posts(
    emotion: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"

    query = select(TreeHolePost)
    count_query = select(func.count(TreeHolePost.id))

    if emotion:
        query = query.where(TreeHolePost.emotion == emotion)
        count_query = count_query.where(TreeHolePost.emotion == emotion)

    query = query.order_by(desc(TreeHolePost.created_at)).offset(skip).limit(limit)

    result = await db.execute(query)
    posts = result.scalars().all()

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    user_likes_result = await db.execute(
        select(TreeHoleLike.post_id).where(TreeHoleLike.user_id == uid)
    )
    liked_post_ids = set(row[0] for row in user_likes_result.all())

    user_ids = [p.user_id for p in posts if p.user_id]
    users_result = await db.execute(select(User).where(User.user_id.in_(user_ids)))
    users = {u.user_id: u.nickname or "用户" for u in users_result.scalars().all()}

    post_responses = []
    for post in posts:
        author_name = None
        if not post.is_anonymous and post.user_id:
            author_name = users.get(post.user_id, "用户")

        post_responses.append(
            PostResponse(
                id=post.id,
                emotion=post.emotion,
                content=post.content,
                likes_count=post.likes_count,
                created_at=post.created_at,
                is_anonymous=post.is_anonymous,
                author_name=author_name,
                is_liked=post.id in liked_post_ids,
            )
        )

    return PostListResponse(posts=post_responses, total=total)


@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: int,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"

    result = await db.execute(select(TreeHolePost).where(TreeHolePost.id == post_id))
    post = result.scalar_one_or_none()

    if not post:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Post not found")

    is_liked = False
    if uid:
        like_result = await db.execute(
            select(TreeHoleLike).where(
                TreeHoleLike.post_id == post_id,
                TreeHoleLike.user_id == uid,
            )
        )
        is_liked = like_result.scalar_one_or_none() is not None

    author_name = None
    if not post.is_anonymous and post.user_id:
        user_result = await db.execute(select(User).where(User.user_id == post.user_id))
        user = user_result.scalar_one_or_none()
        author_name = user.nickname if user and user.nickname else "用户"

    return PostResponse(
        id=post.id,
        emotion=post.emotion,
        content=post.content,
        likes_count=post.likes_count,
        created_at=post.created_at,
        is_anonymous=post.is_anonymous,
        author_name=author_name,
        is_liked=is_liked,
    )


@router.post("/posts/{post_id}/like", response_model=LikeResponse)
async def like_post(
    post_id: int,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"

    result = await db.execute(select(TreeHolePost).where(TreeHolePost.id == post_id))
    post = result.scalar_one_or_none()

    if not post:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Post not found")

    existing_like = await db.execute(
        select(TreeHoleLike).where(
            TreeHoleLike.post_id == post_id,
            TreeHoleLike.user_id == uid,
        )
    )
    if existing_like.scalar_one_or_none():
        return LikeResponse(success=True, likes_count=post.likes_count)

    like = TreeHoleLike(post_id=post_id, user_id=uid)
    db.add(like)
    post.likes_count += 1
    await db.commit()
    await db.refresh(post)

    return LikeResponse(success=True, likes_count=post.likes_count)


@router.delete("/posts/{post_id}/like", response_model=LikeResponse)
async def unlike_post(
    post_id: int,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"

    result = await db.execute(select(TreeHolePost).where(TreeHolePost.id == post_id))
    post = result.scalar_one_or_none()

    if not post:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Post not found")

    like_result = await db.execute(
        select(TreeHoleLike).where(
            TreeHoleLike.post_id == post_id,
            TreeHoleLike.user_id == uid,
        )
    )
    like = like_result.scalar_one_or_none()

    if like:
        await db.delete(like)
        post.likes_count = max(0, post.likes_count - 1)
        await db.commit()
        await db.refresh(post)

    return LikeResponse(success=True, likes_count=post.likes_count)
