from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class TreeHolePost(Base):
    __tablename__ = "tree_hole_posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True)
    emotion = Column(String)
    content = Column(Text, nullable=False)
    is_anonymous = Column(Boolean, default=False)
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    likes = relationship(
        "TreeHoleLike", back_populates="post", cascade="all, delete-orphan"
    )


class TreeHoleLike(Base):
    __tablename__ = "tree_hole_likes"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("tree_hole_posts.id"))
    user_id = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("TreeHolePost", back_populates="likes")
