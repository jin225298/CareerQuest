# 成就系统技术架构设计

## 1. 数据库设计

### 1.1 新增表结构

#### Achievement 表（成就定义表）
```python
# server/app/models/achievement.py

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=False)
    icon = Column(String(100))
    category = Column(String(20))
    rarity = Column(String(20))
    reward_power = Column(Integer, default=0)
    reward_mood = Column(Integer, default=0)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

#### UserAchievement 表（用户成就记录表）
```python
# server/app/models/achievement.py

class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)
    is_notified = Column(Boolean, default=False)
    notified_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),
        Index("idx_user_achievement_user", "user_id"),
        Index("idx_user_achievement_unlocked", "unlocked_at"),
    )
```

#### UserStreak 表（用户连续性追踪表）
```python
# server/app/models/achievement.py

class UserStreak(Base):
    __tablename__ = "user_streaks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, unique=True, index=True)
    high_score_streak = Column(Integer, default=0)
    last_high_score_date = Column(DateTime, nullable=True)
    login_streak = Column(Integer, default=0)
    last_login_date = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

#### UserLoginLog 表（登录日志表）
```python
# server/app/models/achievement.py

class UserLoginLog(Base):
    __tablename__ = "user_login_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    login_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "login_date", name="uq_user_login_date"),
        Index("idx_login_user_date", "user_id", "login_date"),
    )
```

### 1.2 成就初始数据

| code | name | description | category | rarity | reward_power | reward_mood |
|------|------|-------------|----------|--------|--------------|-------------|
| first_interview | 初出茅庐 | 完成第一次面试 | milestone | common | 10 | 5 |
| interviewer_10 | 面试达人 | 完成10次面试 | milestone | rare | 30 | 15 |
| interviewer_50 | 面试专家 | 完成50次面试 | milestone | epic | 100 | 50 |
| perfect_score | 完美表现 | 面试得分≥95分 | performance | epic | 50 | 30 |
| streak_3 | 稳定发挥 | 连续3次面试得分≥80 | streak | rare | 20 | 10 |
| streak_5 | 状态火热 | 连续5次面试得分≥80 | streak | epic | 40 | 20 |
| quick_finish | 速战速决 | 5分钟内完成面试 | special | rare | 15 | 10 |
| marathon | 马拉松式 | 面试对话≥10轮 | special | rare | 15 | 10 |
| low_stress | 从容应对 | 最高压力值<30 | special | rare | 20 | 15 |
| weekly_login | 坚持不懈 | 连续7天登录 | login | epic | 50 | 30 |

### 1.3 索引设计

```sql
-- 用户成就查询优化
CREATE INDEX idx_user_achievement_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievement_unlocked ON user_achievements(unlocked_at);

-- 成就定义查询优化
CREATE INDEX idx_achievement_code ON achievements(code);
CREATE INDEX idx_achievement_category ON achievements(category);

-- 连续性追踪优化
CREATE UNIQUE INDEX idx_user_streak_user ON user_streaks(user_id);

-- 登录日志查询优化
CREATE INDEX idx_login_user_date ON user_login_logs(user_id, login_date);
```

---

## 2. 后端架构

### 2.1 API 设计

#### 获取成就列表
```
GET /api/v1/achievements
Response: {
  "achievements": [
    {
      "id": 1,
      "code": "first_interview",
      "name": "初出茅庐",
      "description": "完成第一次面试",
      "icon": "trophy",
      "category": "milestone",
      "rarity": "common",
      "reward_power": 10,
      "reward_mood": 5,
      "is_unlocked": true,
      "unlocked_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total_count": 10,
  "unlocked_count": 3
}
```

#### 获取用户成就统计
```
GET /api/v1/achievements/stats
Response: {
  "total_count": 10,
  "unlocked_count": 3,
  "total_power_rewarded": 60,
  "total_mood_rewarded": 30,
  "recent_unlocks": [...]
}
```

#### 获取未通知成就（用于弹窗）
```
GET /api/v1/achievements/pending
Response: {
  "achievements": [
    {
      "id": 1,
      "code": "first_interview",
      "name": "初出茅庐",
      "description": "完成第一次面试",
      "icon": "trophy",
      "rarity": "common"
    }
  ]
}
```

#### 标记成就已通知
```
POST /api/v1/achievements/{achievement_id}/notify
Response: {
  "success": true
}
```

### 2.2 服务层设计

#### 成就检测服务
```python
# server/app/services/achievement.py

class AchievementService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.detectors = {
            "first_interview": self._detect_first_interview,
            "interviewer_10": self._detect_interviewer_10,
            "interviewer_50": self._detect_interviewer_50,
            "perfect_score": self._detect_perfect_score,
            "streak_3": self._detect_streak_3,
            "streak_5": self._detect_streak_5,
            "quick_finish": self._detect_quick_finish,
            "marathon": self._detect_marathon,
            "low_stress": self._detect_low_stress,
            "weekly_login": self._detect_weekly_login,
        }

    async def check_interview_achievements(
        self, user_id: str, interview_data: Dict
    ) -> List[Dict]:
        """面试结束时触发成就检测"""
        unlocked = []
        
        detectors_to_run = [
            "first_interview",
            "interviewer_10", 
            "interviewer_50",
            "perfect_score",
            "streak_3",
            "streak_5",
            "quick_finish",
            "marathon",
            "low_stress",
        ]
        
        for code in detectors_to_run:
            if await self.detectors[code](user_id, interview_data):
                achievement = await self._unlock_achievement(user_id, code)
                if achievement:
                    unlocked.append(achievement)
        
        return unlocked

    async def check_login_achievements(self, user_id: str) -> List[Dict]:
        """用户登录时触发成就检测"""
        unlocked = []
        
        if await self.detectors["weekly_login"](user_id):
            achievement = await self._unlock_achievement(user_id, "weekly_login")
            if achievement:
                unlocked.append(achievement)
        
        return unlocked
```

### 2.3 触发时机

| 触发事件 | 检测成就 | 说明 |
|---------|---------|------|
| 面试结束 | first_interview, interviewer_10, interviewer_50, perfect_score, streak_3, streak_5, quick_finish, marathon, low_stress | 调用 `/interviews/end` 后触发 |
| 用户登录 | weekly_login | 调用 `/users/me` 或登录接口时触发 |
| 页面加载 | 无 | 仅查询待通知成就 |

---

## 3. 前端架构

### 3.1 页面结构

```
/achievements          - 成就列表页
/achievements/:id      - 成就详情页（可选）
```

### 3.2 组件设计

```
client/src/
├── components/
│   └── achievement/
│       ├── AchievementList.tsx       # 成就列表组件
│       ├── AchievementCard.tsx       # 成就卡片组件
│       ├── AchievementBadge.tsx      # 成就徽章组件
│       ├── AchievementModal.tsx      # 成就弹窗组件
│       └── AchievementUnlockAnim.tsx # 解锁动画组件
├── pages/
│   └── AchievementPage.tsx           # 成就页面
├── hooks/
│   └── useAchievements.ts            # 成就相关hooks
└── stores/
    └── achievementStore.ts           # 成就状态管理
```

### 3.3 状态管理

```typescript
// client/src/stores/achievementStore.ts

interface AchievementState {
  achievements: Achievement[];
  stats: AchievementStats;
  pendingAchievements: Achievement[];
  isLoading: boolean;
  
  fetchAchievements: () => Promise<void>;
  fetchPendingAchievements: () => Promise<void>;
  markAsNotified: (achievementId: number) => Promise<void>;
}
```

### 3.4 弹窗动画实现方案

#### 方案一：Lottie 动画（推荐）
```typescript
// AchievementModal.tsx
import Lottie from 'lottie-react';
import unlockAnimation from '../assets/animations/unlock.json';

function AchievementModal({ achievement, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: "spring", duration: 0.5 }}
    >
      <div className="relative">
        <Lottie 
          animationData={unlockAnimation} 
          loop={false}
          style={{ width: 200, height: 200 }}
        />
        <div className="achievement-content">
          <img src={`/icons/${achievement.icon}.png`} />
          <h2>{achievement.name}</h2>
          <p>{achievement.description}</p>
        </div>
      </div>
    </motion.div>
  );
}
```

#### 方案二：Framer Motion + CSS 动画
```typescript
function AchievementUnlockAnim({ achievement }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        className="absolute inset-0 bg-black"
      />
      
      {/* 光效动画 */}
      <motion.div
        initial={{ scale: 0, rotate: 0 }}
        animate={{ scale: [0, 1.2, 1], rotate: 360 }}
        transition={{ duration: 0.8 }}
        className="absolute w-64 h-64"
      >
        <div className="absolute inset-0 bg-gradient-radial from-yellow-400/50 to-transparent rounded-full" />
      </motion.div>
      
      {/* 成就徽章 */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="relative z-10"
      >
        <AchievementBadge achievement={achievement} size="large" />
      </motion.div>
      
      {/* 粒子效果 */}
      <ParticleEffect count={20} />
    </motion.div>
  );
}
```

### 3.5 稀有度样式映射

```typescript
const rarityStyles = {
  common: {
    bg: 'bg-gray-500/20',
    border: 'border-gray-400',
    text: 'text-gray-300',
    glow: 'shadow-gray-400/50',
  },
  rare: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-400',
    text: 'text-blue-300',
    glow: 'shadow-blue-400/50',
  },
  epic: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-400',
    text: 'text-purple-300',
    glow: 'shadow-purple-400/50',
  },
};
```

---

## 4. 成就检测逻辑

### 4.1 各成就检测算法

#### first_interview（初出茅庐）
```python
async def _detect_first_interview(self, user_id: str, interview_data: Dict) -> bool:
    """检测是否完成第一次面试"""
    count = await self.db.scalar(
        select(func.count(Interview.id)).where(Interview.user_id == user_id)
    )
    return count == 1
```

#### interviewer_10 / interviewer_50（面试达人/专家）
```python
async def _detect_interviewer_10(self, user_id: str, interview_data: Dict) -> bool:
    """检测是否完成10次面试"""
    count = await self.db.scalar(
        select(func.count(Interview.id))
        .where(Interview.user_id == user_id)
        .where(Interview.score.isnot(None))
    )
    return count >= 10

async def _detect_interviewer_50(self, user_id: str, interview_data: Dict) -> bool:
    """检测是否完成50次面试"""
    count = await self.db.scalar(
        select(func.count(Interview.id))
        .where(Interview.user_id == user_id)
        .where(Interview.score.isnot(None))
    )
    return count >= 50
```

#### perfect_score（完美表现）
```python
async def _detect_perfect_score(self, user_id: str, interview_data: Dict) -> bool:
    """检测本次面试是否得分≥95"""
    return interview_data.get("score", 0) >= 95
```

#### streak_3 / streak_5（稳定发挥/状态火热）
```python
async def _detect_streak_3(self, user_id: str, interview_data: Dict) -> bool:
    """检测连续3次高分"""
    streak = await self._get_high_score_streak(user_id)
    return streak >= 3

async def _detect_streak_5(self, user_id: str, interview_data: Dict) -> bool:
    """检测连续5次高分"""
    streak = await self._get_high_score_streak(user_id)
    return streak >= 5

async def _get_high_score_streak(self, user_id: str) -> int:
    """获取连续高分次数"""
    streak_record = await self.db.scalar(
        select(UserStreak).where(UserStreak.user_id == user_id)
    )
    return streak_record.high_score_streak if streak_record else 0
```

#### quick_finish（速战速决）
```python
async def _detect_quick_finish(self, user_id: str, interview_data: Dict) -> bool:
    """检测5分钟内完成"""
    duration = interview_data.get("duration_seconds", 0)
    return duration > 0 and duration <= 300
```

#### marathon（马拉松式）
```python
async def _detect_marathon(self, user_id: str, interview_data: Dict) -> bool:
    """检测对话轮数≥10"""
    history = interview_data.get("history", [])
    user_messages = [m for m in history if m.get("role") == "user"]
    return len(user_messages) >= 10
```

#### low_stress（从容应对）
```python
async def _detect_low_stress(self, user_id: str, interview_data: Dict) -> bool:
    """检测最高压力<30"""
    max_stress = interview_data.get("max_stress", 100)
    return max_stress < 30
```

#### weekly_login（坚持不懈）
```python
async def _detect_weekly_login(self, user_id: str) -> bool:
    """检测连续7天登录"""
    streak = await self._get_login_streak(user_id)
    return streak >= 7

async def _get_login_streak(self, user_id: str) -> int:
    """计算连续登录天数"""
    today = datetime.utcnow().date()
    
    recent_logins = await self.db.execute(
        select(UserLoginLog.login_date)
        .where(UserLoginLog.user_id == user_id)
        .where(UserLoginLog.login_date >= today - timedelta(days=7))
        .order_by(UserLoginLog.login_date.desc())
    )
    
    dates = [row[0] for row in recent_logins.fetchall()]
    
    if not dates or dates[0] != today:
        return 0
    
    streak = 1
    for i in range(len(dates) - 1):
        if (dates[i] - dates[i + 1]).days == 1:
            streak += 1
        else:
            break
    
    return streak
```

### 4.2 连续性追踪方案

```python
async def update_high_score_streak(self, user_id: str, score: float):
    """更新高分连续记录"""
    streak_record = await self.db.scalar(
        select(UserStreak).where(UserStreak.user_id == user_id)
    )
    
    if not streak_record:
        streak_record = UserStreak(user_id=user_id)
        self.db.add(streak_record)
    
    if score >= 80:
        streak_record.high_score_streak += 1
        streak_record.last_high_score_date = datetime.utcnow()
    else:
        streak_record.high_score_streak = 0
        streak_record.last_high_score_date = None
    
    await self.db.commit()

async def record_login(self, user_id: str):
    """记录登录日志"""
    today = datetime.utcnow().date()
    
    existing = await self.db.scalar(
        select(UserLoginLog)
        .where(UserLoginLog.user_id == user_id)
        .where(UserLoginLog.login_date == today)
    )
    
    if not existing:
        log = UserLoginLog(user_id=user_id, login_date=today)
        self.db.add(log)
        await self.db.commit()
```

### 4.3 数据缓存策略

```python
# 使用 Redis 缓存用户成就状态
class AchievementCache:
    CACHE_PREFIX = "achievement:"
    CACHE_TTL = 3600  # 1小时
    
    async def get_user_achievements(self, user_id: str) -> Optional[Dict]:
        key = f"{self.CACHE_PREFIX}{user_id}"
        return await redis.get(key)
    
    async def set_user_achievements(self, user_id: str, data: Dict):
        key = f"{self.CACHE_PREFIX}{user_id}"
        await redis.setex(key, self.CACHE_TTL, json.dumps(data))
    
    async def invalidate_user_cache(self, user_id: str):
        key = f"{self.CACHE_PREFIX}{user_id}"
        await redis.delete(key)
```

---

## 5. 文件结构

### 5.1 需要新增的文件

```
server/app/
├── models/
│   └── achievement.py              # 成就相关数据模型
├── schemas/
│   └── achievement.py              # 成就相关Pydantic模型
├── routers/
│   └── achievement.py              # 成就API路由
├── services/
│   └── achievement.py              # 成就检测服务

client/src/
├── components/achievement/
│   ├── AchievementList.tsx         # 成就列表
│   ├── AchievementCard.tsx         # 成就卡片
│   ├── AchievementBadge.tsx        # 成就徽章
│   ├── AchievementModal.tsx        # 成就弹窗
│   └── AchievementUnlockAnim.tsx   # 解锁动画
├── pages/
│   └── AchievementPage.tsx         # 成就页面
├── hooks/
│   └── useAchievements.ts          # 成就hooks
├── stores/
│   └── achievementStore.ts         # 状态管理
└── assets/
    └── animations/
        └── unlock.json             # Lottie动画文件

docs/
└── arch/
    └── ACHIEVEMENT_ARCH.md         # 本文档
```

### 5.2 需要修改的文件

```
server/app/
├── models/__init__.py              # 导出新模型
├── main.py                         # 注册成就路由
├── routers/interview.py            # 面试结束时触发成就检测
├── routers/user.py                 # 登录时触发成就检测

client/src/
├── App.tsx                         # 添加成就页面路由
├── lib/api.ts                      # 添加成就API调用
├── pages/HomePage.tsx              # 添加成就入口
├── pages/InterviewResultPage.tsx   # 显示获得的成就
├── components/index.ts             # 导出新组件
```

---

## 6. 实现优先级

### P0 - 核心功能
1. 数据库表创建与初始数据
2. 成就检测服务
3. 面试结束触发检测
4. 成就列表API
5. 成就列表页面

### P1 - 用户体验
1. 成就解锁弹窗
2. 解锁动画效果
3. 首页成就入口

### P2 - 增强功能
1. 缓存优化
2. 成就详情页
3. 成就分享功能
