import logging
from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from app.models import User, Interview
from app.models.friend import FriendRequest, Friendship, InterviewInvitation
from app.models.interview_report import InterviewReport

logger = logging.getLogger(__name__)


class FriendService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_friend_request(
        self, from_user_id: str, to_user_id: str, message: Optional[str] = None
    ) -> FriendRequest:
        if from_user_id == to_user_id:
            raise ValueError("Cannot send friend request to yourself")

        existing = await self.db.scalar(
            select(FriendRequest).where(
                or_(
                    and_(
                        FriendRequest.from_user_id == from_user_id,
                        FriendRequest.to_user_id == to_user_id,
                    ),
                    and_(
                        FriendRequest.from_user_id == to_user_id,
                        FriendRequest.to_user_id == from_user_id,
                    ),
                )
            )
        )

        if existing and existing.status == "pending":
            raise ValueError("Friend request already pending")

        friendship = await self.db.scalar(
            select(Friendship).where(
                or_(
                    and_(
                        Friendship.user_id == from_user_id,
                        Friendship.friend_id == to_user_id,
                    ),
                    and_(
                        Friendship.user_id == to_user_id,
                        Friendship.friend_id == from_user_id,
                    ),
                )
            )
        )

        if friendship:
            raise ValueError("Already friends")

        friend_request = FriendRequest(
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            message=message,
            status="pending",
        )
        self.db.add(friend_request)
        await self.db.commit()
        await self.db.refresh(friend_request)

        return friend_request

    async def get_friend_requests(
        self, user_id: str, request_type: str = "incoming"
    ) -> List[FriendRequest]:
        if request_type == "incoming":
            result = await self.db.execute(
                select(FriendRequest)
                .where(
                    and_(
                        FriendRequest.to_user_id == user_id,
                        FriendRequest.status == "pending",
                    )
                )
                .order_by(FriendRequest.created_at.desc())
            )
        else:
            result = await self.db.execute(
                select(FriendRequest)
                .where(FriendRequest.from_user_id == user_id)
                .order_by(FriendRequest.created_at.desc())
            )

        return result.scalars().all()

    async def accept_friend_request(self, request_id: int, user_id: str) -> Friendship:
        friend_request = await self.db.scalar(
            select(FriendRequest).where(
                and_(
                    FriendRequest.id == request_id,
                    FriendRequest.to_user_id == user_id,
                    FriendRequest.status == "pending",
                )
            )
        )

        if not friend_request:
            raise ValueError("Friend request not found or not pending")

        friend_request.status = "accepted"

        friendship1 = Friendship(
            user_id=friend_request.from_user_id,
            friend_id=friend_request.to_user_id,
        )
        friendship2 = Friendship(
            user_id=friend_request.to_user_id,
            friend_id=friend_request.from_user_id,
        )

        self.db.add(friendship1)
        self.db.add(friendship2)
        await self.db.commit()
        await self.db.refresh(friendship1)

        return friendship1

    async def reject_friend_request(self, request_id: int, user_id: str) -> bool:
        friend_request = await self.db.scalar(
            select(FriendRequest).where(
                and_(
                    FriendRequest.id == request_id,
                    FriendRequest.to_user_id == user_id,
                    FriendRequest.status == "pending",
                )
            )
        )

        if not friend_request:
            raise ValueError("Friend request not found or not pending")

        friend_request.status = "rejected"
        await self.db.commit()

        return True

    async def get_friends(self, user_id: str) -> List[Dict]:
        result = await self.db.execute(
            select(Friendship).where(Friendship.user_id == user_id)
        )
        friendships = result.scalars().all()

        friends = []
        for friendship in friendships:
            friend_user = await self.db.scalar(
                select(User).where(User.user_id == friendship.friend_id)
            )

            if not friend_user:
                continue

            interview_count = await self.db.scalar(
                select(func.count(Interview.id)).where(
                    and_(
                        Interview.user_id == friendship.friend_id,
                        Interview.score.isnot(None),
                    )
                )
            )

            avg_score = await self.db.scalar(
                select(func.avg(Interview.score)).where(
                    and_(
                        Interview.user_id == friendship.friend_id,
                        Interview.score.isnot(None),
                    )
                )
            )

            friends.append(
                {
                    "id": friendship.id,
                    "friend_id": friendship.friend_id,
                    "friend_nickname": friend_user.nickname or "未知用户",
                    "friend_power": friend_user.power,
                    "friend_mood": friend_user.mood,
                    "interview_count": interview_count or 0,
                    "avg_score": round(avg_score or 0, 2),
                    "created_at": friendship.created_at,
                }
            )

        return friends

    async def delete_friend(self, user_id: str, friend_id: str) -> bool:
        result = await self.db.execute(
            select(Friendship).where(
                or_(
                    and_(
                        Friendship.user_id == user_id,
                        Friendship.friend_id == friend_id,
                    ),
                    and_(
                        Friendship.user_id == friend_id,
                        Friendship.friend_id == user_id,
                    ),
                )
            )
        )
        friendships = result.scalars().all()

        if not friendships:
            raise ValueError("Friendship not found")

        for friendship in friendships:
            await self.db.delete(friendship)

        await self.db.commit()
        return True

    async def search_users(self, keyword: str, user_id: str) -> List[Dict]:
        if not keyword or len(keyword) < 1:
            return []

        result = await self.db.execute(
            select(User)
            .where(
                and_(
                    User.user_id != user_id,
                    or_(
                        User.nickname.ilike(f"%{keyword}%"),
                        User.user_id.ilike(f"%{keyword}%"),
                    ),
                )
            )
            .limit(20)
        )
        users = result.scalars().all()

        return [
            {
                "user_id": user.user_id,
                "nickname": user.nickname or "未知用户",
                "power": user.power,
                "mood": user.mood,
            }
            for user in users
        ]

    async def invite_interview(
        self,
        from_user_id: str,
        to_user_id: str,
        interview_type: str = "hr",
        position: Optional[str] = None,
    ) -> InterviewInvitation:
        friendship = await self.db.scalar(
            select(Friendship).where(
                and_(
                    Friendship.user_id == from_user_id,
                    Friendship.friend_id == to_user_id,
                )
            )
        )

        if not friendship:
            raise ValueError("Not friends with this user")

        invitation = InterviewInvitation(
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            interview_type=interview_type,
            position=position,
            status="pending",
        )
        self.db.add(invitation)
        await self.db.commit()
        await self.db.refresh(invitation)

        return invitation

    async def compare_stats(self, user_id: str, friend_id: str) -> Dict:
        friendship = await self.db.scalar(
            select(Friendship).where(
                and_(
                    Friendship.user_id == user_id,
                    Friendship.friend_id == friend_id,
                )
            )
        )

        if not friendship:
            raise ValueError("Not friends with this user")

        my_user = await self.db.scalar(select(User).where(User.user_id == user_id))
        friend_user = await self.db.scalar(
            select(User).where(User.user_id == friend_id)
        )

        my_interview_count = await self.db.scalar(
            select(func.count(Interview.id)).where(
                and_(Interview.user_id == user_id, Interview.score.isnot(None))
            )
        )
        friend_interview_count = await self.db.scalar(
            select(func.count(Interview.id)).where(
                and_(Interview.user_id == friend_id, Interview.score.isnot(None))
            )
        )

        my_avg_score = await self.db.scalar(
            select(func.avg(Interview.score)).where(
                and_(Interview.user_id == user_id, Interview.score.isnot(None))
            )
        )
        friend_avg_score = await self.db.scalar(
            select(func.avg(Interview.score)).where(
                and_(Interview.user_id == friend_id, Interview.score.isnot(None))
            )
        )

        my_highest_score = await self.db.scalar(
            select(func.max(Interview.score)).where(
                and_(Interview.user_id == user_id, Interview.score.isnot(None))
            )
        )
        friend_highest_score = await self.db.scalar(
            select(func.max(Interview.score)).where(
                and_(Interview.user_id == friend_id, Interview.score.isnot(None))
            )
        )

        my_stats = {
            "power": my_user.power if my_user else 0,
            "mood": my_user.mood if my_user else 0,
            "interview_count": my_interview_count or 0,
            "avg_score": round(my_avg_score or 0, 2),
            "highest_score": my_highest_score or 0,
        }

        friend_stats = {
            "power": friend_user.power if friend_user else 0,
            "mood": friend_user.mood if friend_user else 0,
            "interview_count": friend_interview_count or 0,
            "avg_score": round(friend_avg_score or 0, 2),
            "highest_score": friend_highest_score or 0,
        }

        dimensions_comparison = {
            "power": {
                "mine": my_stats["power"],
                "friend": friend_stats["power"],
                "winner": "me"
                if my_stats["power"] > friend_stats["power"]
                else "friend",
            },
            "mood": {
                "mine": my_stats["mood"],
                "friend": friend_stats["mood"],
                "winner": "me" if my_stats["mood"] > friend_stats["mood"] else "friend",
            },
            "interview_count": {
                "mine": my_stats["interview_count"],
                "friend": friend_stats["interview_count"],
                "winner": "me"
                if my_stats["interview_count"] > friend_stats["interview_count"]
                else "friend",
            },
            "avg_score": {
                "mine": my_stats["avg_score"],
                "friend": friend_stats["avg_score"],
                "winner": "me"
                if my_stats["avg_score"] > friend_stats["avg_score"]
                else "friend",
            },
        }

        return {
            "my_stats": my_stats,
            "friend_stats": friend_stats,
            "dimensions_comparison": dimensions_comparison,
        }
