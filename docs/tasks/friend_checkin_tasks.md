# 好友联机面试 & 打卡系统 - 任务分发文档

> 创建时间: 2026-03-27  
> 负责人: 高级程序员  
> 状态: 待分发

---

## 一、现有代码分析

### 1.1 用户模型 (`server/app/models/__init__.py`)

```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String, unique=True, index=True)  # 用户唯一标识
    nickname = Column(String)
    power = Column(Integer, default=50)      # 武力值
    mood = Column(Integer, default=70)       # 心情值
    hp = Column(Integer, default=100)        # 生命值
    wins = Column(Integer, default=0)        # 胜利次数
    # ... 其他字段
```

### 1.2 成就系统 (`server/app/models/achievement.py`)

已有连续登录逻辑可复用：
```python
class UserStreak(Base):
    __tablename__ = "user_streaks"
    
    user_id = Column(String, unique=True, index=True)
    high_score_streak = Column(Integer, default=0)     # 高分连续
    last_high_score_date = Column(DateTime)
    login_streak = Column(Integer, default=0)          # 登录连续
    last_login_date = Column(DateTime)

class UserLoginLog(Base):
    __tablename__ = "user_login_logs"
    
    user_id = Column(String)
    login_date = Column(Date)
```

### 1.3 面试记录系统 (`server/app/models/__init__.py`)

```python
class Interview(Base):
    __tablename__ = "interviews"
    
    session_id = Column(String, unique=True)
    user_id = Column(String)
    score = Column(Float)
    # ... 其他字段
```

---

## 二、任务分发给 database-developer

### 2.1 好友系统数据库模型

创建文件: `server/app/models/friend.py`

```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Friendship(Base):
    """好友关系表"""
    __tablename__ = "friendships"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    friend_id = Column(String(50), nullable=False, index=True)
    status = Column(String(20), default="active")  # active, blocked
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint("user_id", "friend_id", name="uq_friendship"),
    )


class FriendRequest(Base):
    """好友请求表"""
    __tablename__ = "friend_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(String(50), nullable=False, index=True)
    to_user_id = Column(String(50), nullable=False, index=True)
    status = Column(String(20), default="pending")  # pending, accepted, rejected
    message = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        UniqueConstraint("from_user_id", "to_user_id", name="uq_friend_request"),
    )


class InterviewInvitation(Base):
    """面试邀请表"""
    __tablename__ = "interview_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(String(50), nullable=False, index=True)
    to_user_id = Column(String(50), nullable=False, index=True)
    session_id = Column(String(100), nullable=True)
    interview_type = Column(String(50), default="practice")  # practice, competition
    status = Column(String(20), default="pending")  # pending, accepted, rejected, completed
    message = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
```

### 2.2 打卡系统数据库模型

创建文件: `server/app/models/checkin.py`

```python
from sqlalchemy import Column, Integer, String, DateTime, Date, Text, ForeignKey, UniqueConstraint
from app.database import Base
from datetime import datetime

class CheckIn(Base):
    """打卡记录表"""
    __tablename__ = "check_ins"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    check_date = Column(Date, nullable=False, index=True)
    check_type = Column(String(20), default="daily")  # daily, study, interview
    notes = Column(Text, nullable=True)
    power_gained = Column(Integer, default=10)
    mood_gained = Column(Integer, default=5)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint("user_id", "check_date", name="uq_user_checkin_date"),
    )


class CheckInStreak(Base):
    """连续打卡统计表"""
    __tablename__ = "check_in_streaks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, unique=True, index=True)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_check_date = Column(Date, nullable=True)
    total_check_days = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### 2.3 数据库任务清单

- [ ] 创建 `server/app/models/friend.py`
- [ ] 创建 `server/app/models/checkin.py`
- [ ] 在 `server/app/models/__init__.py` 中导入新模型
- [ ] 创建数据库迁移脚本（如需要）

---

## 三、任务分发给 backend-developer

### 3.1 好友系统 API

创建文件: `server/app/routers/friend.py`

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/v1/friends/request` | POST | 发送好友请求 |
| `/api/v1/friends/requests` | GET | 获取好友请求列表 |
| `/api/v1/friends/requests/{id}/accept` | POST | 接受好友请求 |
| `/api/v1/friends/requests/{id}/reject` | POST | 拒绝好友请求 |
| `/api/v1/friends` | GET | 获取好友列表 |
| `/api/v1/friends/{id}` | DELETE | 删除好友 |
| `/api/v1/friends/search` | GET | 搜索用户 |
| `/api/v1/friends/invite-interview` | POST | 邀请好友面试 |
| `/api/v1/friends/compare/{friend_id}` | GET | 对比面试成绩 |

#### API 详细设计

```python
# POST /api/v1/friends/request
{
    "to_user_id": "user-123",
    "message": "你好，想和你一起练习面试"
}
# Response:
{
    "success": true,
    "request_id": 1
}

# GET /api/v1/friends/requests?type=received
# Response:
{
    "requests": [
        {
            "id": 1,
            "from_user": {
                "user_id": "user-123",
                "nickname": "张三"
            },
            "message": "你好",
            "status": "pending",
            "created_at": "2026-03-27T10:00:00"
        }
    ],
    "total": 1
}

# GET /api/v1/friends
# Response:
{
    "friends": [
        {
            "user_id": "user-123",
            "nickname": "张三",
            "stats": {
                "total_interviews": 12,
                "avg_score": 85,
                "current_streak": 7
            }
        }
    ],
    "total": 1
}

# GET /api/v1/friends/compare/{friend_id}
# Response:
{
    "me": {
        "total_interviews": 15,
        "avg_score": 82,
        "highest_score": 95,
        "current_streak": 7,
        "dimensions": {
            "expression": 85,
            "logic": 78,
            "professional": 90,
            "confidence": 82
        }
    },
    "friend": {
        "total_interviews": 12,
        "avg_score": 85,
        "highest_score": 92,
        "current_streak": 12,
        "dimensions": {
            "expression": 88,
            "logic": 82,
            "professional": 85,
            "confidence": 90
        }
    }
}
```

### 3.2 打卡系统 API

创建文件: `server/app/routers/checkin.py`

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/v1/checkin` | POST | 今日打卡 |
| `/api/v1/checkin/today` | GET | 检查今日是否已打卡 |
| `/api/v1/checkin/calendar` | GET | 获取打卡日历（某月） |
| `/api/v1/checkin/streak` | GET | 获取连续打卡信息 |
| `/api/v1/checkin/leaderboard` | GET | 打卡排行榜 |

#### API 详细设计

```python
# POST /api/v1/checkin
# Response:
{
    "success": true,
    "streak": {
        "current": 7,
        "longest": 15,
        "is_new_record": false
    },
    "rewards": {
        "power": 10,
        "mood": 5,
        "bonus_power": 5  # 连续打卡奖励
    },
    "message": "连续打卡7天，获得额外奖励！"
}

# GET /api/v1/checkin/today
# Response:
{
    "checked_in": true,
    "check_time": "2026-03-27T08:30:00"
}

# GET /api/v1/checkin/calendar?year=2026&month=3
# Response:
{
    "year": 2026,
    "month": 3,
    "checked_days": [1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 25],
    "streak_info": {
        "current": 7,
        "longest": 15
    }
}

# GET /api/v1/checkin/leaderboard?limit=10
# Response:
{
    "leaderboard": [
        {
            "rank": 1,
            "user_id": "user-123",
            "nickname": "张三",
            "current_streak": 30,
            "avatar": "/avatars/user-123.png"
        }
    ],
    "my_rank": {
        "rank": 15,
        "current_streak": 7
    }
}
```

### 3.3 后端任务清单

- [ ] 创建 `server/app/routers/friend.py`
- [ ] 创建 `server/app/routers/checkin.py`
- [ ] 创建 `server/app/schemas/friend.py` (Pydantic模型)
- [ ] 创建 `server/app/schemas/checkin.py`
- [ ] 创建 `server/app/services/friend.py` (业务逻辑)
- [ ] 创建 `server/app/services/checkin.py`
- [ ] 在 `server/app/main.py` 注册路由
- [ ] 实现连续打卡奖励逻辑（可参考 achievement.py）

---

## 四、任务分发给 frontend-developer

### 4.1 好友页面组件

创建文件:
- `client/src/pages/FriendsPage.tsx` - 好友列表页面
- `client/src/components/friend/FriendCard.tsx` - 好友卡片
- `client/src/components/friend/FriendRequestModal.tsx` - 好友请求处理
- `client/src/components/friend/CompareResultModal.tsx` - 成绩对比弹窗
- `client/src/components/friend/SearchUserModal.tsx` - 搜索用户弹窗

### 4.2 打卡组件

创建文件:
- `client/src/components/checkin/CheckInButton.tsx` - 打卡按钮
- `client/src/components/checkin/CheckInCalendar.tsx` - 打卡日历
- `client/src/components/checkin/CheckInLeaderboard.tsx` - 打卡排行榜
- `client/src/components/checkin/CheckInSuccessModal.tsx` - 打卡成功动画

### 4.3 首页更新

修改文件: `client/src/pages/HomePage.tsx`

- 在右侧按钮区添加 FRIENDS 按钮（跳转好友页）
- 在左侧或底部添加打卡入口
- 打卡成功后显示连续天数动画

### 4.4 UI 设计建议

#### 好友页面布局
```
┌────────────────────────────────────┐
│  👥 好友                           │
├────────────────────────────────────┤
│  [搜索用户] [查看请求 (3)]          │
├────────────────────────────────────┤
│  好友列表：                         │
│  ┌──────────────────────────────┐  │
│  │ 😊 好友A                     │  │
│  │    面试次数: 12  平均分: 85  │  │
│  │    [邀请面试] [对比成绩]     │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

#### 成绩对比弹窗
```
┌────────────────────────────────────┐
│  📊 成绩对比                        │
├────────────────────────────────────┤
│           我          好友A        │
│  总面试    15          12          │
│  平均分    82          85          │
│  最高分    95          92          │
│  连续打卡  7天         12天        │
├────────────────────────────────────┤
│  能力对比雷达图                     │
│  ┌────────────────────────────┐    │
│  │     表达能力  ↑             │    │
│  │   逻辑    我 ╱╲ 好友        │    │
│  │     专业    ╲╱              │    │
│  └────────────────────────────┘    │
└────────────────────────────────────┘
```

#### 打卡界面

**首页打卡按钮（侧边或底部）:**
```
┌──────┐
│ 🔥   │
│ 打卡 │
│ 7天  │
└──────┘
```

**打卡成功动画:**
```
┌────────────────────────────┐
│  🎉 打卡成功！             │
│  连续打卡 7 天             │
│  获得 +10 武力值           │
│  [查看日历]                │
└────────────────────────────┘
```

**打卡日历:**
```
┌────────────────────────────┐
│  📅 2026年3月              │
├────────────────────────────┤
│ 日 一 二 三 四 五 六       │
│        1  2  3  4  5  6    │
│  ✅ ✅ ✅ ✅ ✅ ✅ ⬜     │
│  7  8  9 10 11 12 13       │
│  ✅ ⬜ ⬜ ⬜ ⬜ ⬜ ⬜     │
└────────────────────────────┘
```

### 4.5 前端任务清单

- [ ] 创建好友页面及组件
- [ ] 创建打卡组件
- [ ] 更新首页添加入口
- [ ] 更新路由配置 (`App.tsx`)
- [ ] 添加 API 调用函数 (`lib/api.ts`)
- [ ] 实现成绩对比雷达图

---

## 五、验收标准

### 5.1 好友系统

- [ ] 可以搜索并添加好友
- [ ] 可以接受/拒绝好友请求
- [ ] 好友列表正确显示
- [ ] 可以邀请好友面试（模拟）
- [ ] 成绩对比功能正常
- [ ] 能力雷达图正确展示

### 5.2 打卡系统

- [ ] 每日只能打卡一次
- [ ] 连续打卡统计正确
- [ ] 打卡日历显示正确
- [ ] 打卡奖励正确发放
- [ ] 排行榜实时更新
- [ ] 连续打卡奖励机制生效

---

## 六、连续打卡奖励规则

| 连续天数 | 额外奖励 |
|----------|----------|
| 3天 | +5 武力值 |
| 7天 | +10 武力值, +5 心情值 |
| 14天 | +20 武力值, +10 心情值 |
| 30天 | +50 武力值, +20 心情值, 解锁成就 |

---

## 七、技术要点

### 7.1 复用现有代码

1. **连续打卡逻辑**: 参考 `achievement.py` 中的 `_get_login_streak` 和 `_record_login`
2. **奖励发放**: 参考 `services/reward.py`
3. **雷达图**: 已有 `AbilityRadar.tsx` 组件可复用

### 7.2 数据库设计注意事项

1. 好友关系是双向的，需要在添加好友时创建两条记录
2. 打卡日期使用 Date 类型，便于日历查询
3. 排行榜需要考虑缓存优化

---

## 八、API 端点汇总

### 好友系统
```
POST   /api/v1/friends/request           发送好友请求
GET    /api/v1/friends/requests          获取好友请求列表
POST   /api/v1/friends/requests/{id}/accept   接受好友请求
POST   /api/v1/friends/requests/{id}/reject   拒绝好友请求
GET    /api/v1/friends                   获取好友列表
DELETE /api/v1/friends/{id}              删除好友
GET    /api/v1/friends/search            搜索用户
POST   /api/v1/friends/invite-interview  邀请好友面试
GET    /api/v1/friends/compare/{friend_id}  对比面试成绩
```

### 打卡系统
```
POST   /api/v1/checkin                   今日打卡
GET    /api/v1/checkin/today             检查今日是否已打卡
GET    /api/v1/checkin/calendar          获取打卡日历
GET    /api/v1/checkin/streak            获取连续打卡信息
GET    /api/v1/checkin/leaderboard       打卡排行榜
```

---

## 九、执行顺序建议

1. **database-developer**: 创建数据库模型（前置条件）
2. **backend-developer**: 实现 API 接口
3. **frontend-developer**: 实现前端页面
4. **集成测试**: 端到端功能验证

---

**文档创建完成，请各子程序员领取任务并开始实现。**
