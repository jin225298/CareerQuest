from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.schemas.friend import (
    SendFriendRequest,
    FriendRequestResponse,
    FriendResponse,
    InviteInterviewRequest,
    CompareResult,
)
from app.services.friend_service import FriendService

router = APIRouter(prefix="/friends")


@router.post("/request", response_model=FriendRequestResponse)
async def send_friend_request(
    request: SendFriendRequest,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    service = FriendService(db)

    try:
        friend_request = await service.send_friend_request(
            from_user_id=uid,
            to_user_id=request.to_user_id,
            message=request.message,
        )
        return FriendRequestResponse.model_validate(friend_request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/requests")
async def get_friend_requests(
    type: str = Query("incoming", description="incoming or outgoing"),
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    service = FriendService(db)

    requests = await service.get_friend_requests(uid, type)
    return [FriendRequestResponse.model_validate(r) for r in requests]


@router.post("/requests/{request_id}/accept")
async def accept_friend_request(
    request_id: int,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    service = FriendService(db)

    try:
        friendship = await service.accept_friend_request(request_id, uid)
        return {"message": "Friend request accepted", "friendship_id": friendship.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/requests/{request_id}/reject")
async def reject_friend_request(
    request_id: int,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    service = FriendService(db)

    try:
        await service.reject_friend_request(request_id, uid)
        return {"message": "Friend request rejected"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("")
async def get_friends(
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    service = FriendService(db)

    friends = await service.get_friends(uid)
    return friends


@router.delete("/{friend_id}")
async def delete_friend(
    friend_id: str,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    service = FriendService(db)

    try:
        await service.delete_friend(uid, friend_id)
        return {"message": "Friend deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/search")
async def search_users(
    keyword: str = Query(..., min_length=1),
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    service = FriendService(db)

    users = await service.search_users(keyword, uid)
    return users


@router.post("/invite")
async def invite_interview(
    request: InviteInterviewRequest,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    service = FriendService(db)

    try:
        invitation = await service.invite_interview(
            from_user_id=uid,
            to_user_id=request.to_user_id,
            interview_type=request.interview_type,
            position=request.position,
        )
        return {
            "message": "Interview invitation sent",
            "invitation_id": invitation.id,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/compare/{friend_id}", response_model=CompareResult)
async def compare_stats(
    friend_id: str,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or "demo-user"
    service = FriendService(db)

    try:
        result = await service.compare_stats(uid, friend_id)
        return CompareResult(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
