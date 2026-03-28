# 智能任务清单系统 - 任务分发记录

## 一、现状分析

### 1.1 已有基础设施

| 模块 | 文件 | 现状 |
|------|------|------|
| 任务模型 | `server/app/models/__init__.py:70` | DailyTask 表已存在，支持 task_type, description, reward |
| 任务API | `server/app/routers/task.py` | 随机任务生成，无个性化逻辑 |
| 成就系统 | `server/app/services/achievement.py` | 完善，支持 interview/login/streak 检测 |
| 用户画像 | `server/app/models/__init__.py:28-38` | career, weakness, goals 等字段已有 |
| 用户标签 | `server/app/models/user_tag.py` | UserTag 表支持动态标签 |
| NPC组件 | `client/src/components/CompanionNPC.tsx` | 仅提示型NPC，无对话能力 |
| 前端任务面板 | `client/src/pages/HomePage.tsx:433-443` | 占位面板，未实现 |

### 1.2 缺失部分

- 无AI陪跑老师聊天API
- 无个性化任务生成服务
- 无任务推荐/接受流程
- 无前端聊天界面
- 奖励未与成就联动

---

## 二、数据库设计

### 2.1 新增表

```sql
-- AI聊天会话表
CREATE TABLE ai_chat_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    npc_type VARCHAR(20) DEFAULT 'teacher',  -- teacher/career_coach
    status VARCHAR(20) DEFAULT 'active',      -- active/ended
    context JSON,                              -- 对话上下文
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- AI聊天消息表
CREATE TABLE ai_chat_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,                 -- user/assistant
    content TEXT NOT NULL,
    recommended_task_id INTEGER,               -- 关联推荐的任务
    metadata JSON,                             -- 额外信息
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务推荐表
CREATE TABLE task_recommendations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    task_type VARCHAR(30) NOT NULL,            -- knowledge/project/interview
    title VARCHAR(200) NOT NULL,
    description TEXT,
    reason TEXT,                               -- AI推荐理由
    source_session_id VARCHAR(50),             -- 来源聊天会话
    status VARCHAR(20) DEFAULT 'pending',      -- pending/accepted/rejected/expired
    reward_power INTEGER DEFAULT 10,
    reward_mood INTEGER DEFAULT 5,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP,
    converted_task_id INTEGER                  -- 接受后转化的DailyTask ID
);

-- 任务完成记录表（扩展成就追踪）
CREATE TABLE task_completion_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    task_id INTEGER NOT NULL,
    task_type VARCHAR(30),
    power_gained INTEGER,
    mood_gained INTEGER,
    bonus_power INTEGER DEFAULT 0,             -- 连续完成奖励
    bonus_mood INTEGER DEFAULT 0,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 扩展 user_streaks 表（已存在，添加字段）
ALTER TABLE user_streaks ADD COLUMN task_streak INTEGER DEFAULT 0;
ALTER TABLE user_streaks ADD COLUMN last_task_date DATE;
```

### 2.2 修改现有表

```sql
-- DailyTask 添加字段
ALTER TABLE daily_tasks ADD COLUMN source VARCHAR(20) DEFAULT 'system';  -- system/recommended
ALTER TABLE daily_tasks ADD COLUMN recommendation_id INTEGER;
ALTER TABLE daily_tasks ADD COLUMN category VARCHAR(30);  -- knowledge/project/interview
```

---

## 三、后端任务分发

### 3.1 任务：创建AI聊天API

**文件**: `server/app/routers/ai_chat.py` (新建)

**功能**:
- `POST /ai-chat/sessions` - 创建聊天会话
- `POST /ai-chat/sessions/{session_id}/messages` - 发送消息
- `GET /ai-chat/sessions/{session_id}` - 获取会话历史
- `POST /ai-chat/sessions/{session_id}/end` - 结束会话

**依赖**:
- 用户画像数据 (User + UserTags)
- LLM服务（复用现有面试LLM逻辑）

**负责人**: 后端开发A

**预估工时**: 1天

---

### 3.2 任务：创建智能任务生成服务

**文件**: `server/app/services/task_generator.py` (新建)

**核心类**: `TaskGeneratorService`

**方法**:
```python
async def generate_personalized_tasks(user_id: str) -> List[TaskRecommendation]:
    """根据用户画像生成个性化任务"""
    
async def analyze_weakness(user_id: str) -> Dict:
    """分析用户短板，返回知识图谱gap"""
    
async def recommend_by_goals(user_id: str) -> List[TaskTemplate]:
    """根据目标职位推荐任务"""
    
async def get_daily_focus(user_id: str) -> str:
    """获取今日重点推荐"""
```

**任务分类规则**:
| 类别 | 触发条件 | 示例任务 |
|------|----------|----------|
| knowledge | weakness包含某技能 | "学习Redis基础" |
| project | experience="初级" | "完成一个mini项目" |
| interview | goals包含"大厂" | "模拟系统设计面试" |

**负责人**: 后端开发B

**预估工时**: 1.5天

---

### 3.3 任务：创建任务推荐API

**文件**: `server/app/routers/task.py` (扩展)

**新增接口**:
- `GET /tasks/recommendations` - 获取推荐任务列表
- `POST /tasks/recommendations/{id}/accept` - 接受推荐任务
- `POST /tasks/recommendations/{id}/reject` - 拒绝推荐任务
- `GET /tasks/today-focus` - 获取今日重点

**负责人**: 后端开发A

**预估工时**: 0.5天

---

### 3.4 任务：创建奖励计算服务

**文件**: `server/app/services/reward.py` (新建)

**核心类**: `RewardService`

**方法**:
```python
async def calculate_task_reward(user_id: str, task: DailyTask) -> RewardResult:
    """计算任务奖励，包含连续完成加成"""
    
async def apply_bonus(user_id: str, base_power: int, base_mood: int) -> BonusResult:
    """计算并应用连续完成奖励"""
    
async def check_task_achievements(user_id: str, task_data: Dict) -> List[Achievement]:
    """检查任务相关成就"""
```

**连续奖励规则**:
| 连续天数 | 额外奖励 |
|----------|----------|
| 3天 | +10% |
| 7天 | +25% |
| 14天 | +50% |

**成就联动**:
- 首次完成推荐任务 → "听从建议"
- 连续7天完成任务 → "持之以恒"
- 单日完成所有任务 → "效率达人"

**负责人**: 后端开发B

**预估工时**: 1天

---

### 3.5 任务：创建数据模型

**文件**: 
- `server/app/models/ai_chat.py` (新建)
- `server/app/models/task_recommendation.py` (新建)
- `server/app/models/__init__.py` (修改，导入新模型)

**负责人**: 后端开发A

**预估工时**: 0.5天

---

### 3.6 任务：创建Schema

**文件**: 
- `server/app/schemas/ai_chat.py` (新建)
- `server/app/schemas/task.py` (扩展)

**负责人**: 后端开发A

**预估工时**: 0.5天

---

## 四、前端任务分发

### 4.1 任务：创建AI聊天页面

**文件**: `client/src/pages/AiChatPage.tsx` (新建)

**功能**:
- 聊天气泡界面（类似微信）
- NPC头像和名称显示
- 任务推荐卡片（可点击接受/拒绝）
- 输入框和发送按钮

**UI设计**:
```
┌─────────────────────────┐
│  👨‍🏫 导师小π         [×] │
├─────────────────────────┤
│                         │
│  NPC: 你好！我看你的    │
│  画像，发现你在算法    │
│  方面可以加强...        │
│                         │
│  ┌─────────────────┐    │
│  │ 📚 学习二叉树   │    │
│  │ 推荐理由：...   │    │
│  │ [接受] [拒绝]   │    │
│  └─────────────────┘    │
│                         │
│  用户: 好的，我接受     │
│                         │
├─────────────────────────┤
│ [输入消息...]      [发送]│
└─────────────────────────┘
```

**负责人**: 前端开发A

**预估工时**: 1.5天

---

### 4.2 任务：创建任务推荐卡片组件

**文件**: `client/src/components/TaskRecommendCard.tsx` (新建)

**Props**:
```typescript
interface TaskRecommendCardProps {
  task: TaskRecommendation;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  isLoading?: boolean;
}
```

**功能**:
- 显示任务标题、描述、推荐理由
- 接受/拒绝按钮
- 动画效果

**负责人**: 前端开发A

**预估工时**: 0.5天

---

### 4.3 任务：改造任务面板组件

**文件**: `client/src/pages/HomePage.tsx` (修改)

**改造内容**:
- 实现任务列表展示（当前是占位）
- 添加进度条
- 添加完成动画
- 添加领取奖励按钮
- 添加"与导师对话"入口按钮

**负责人**: 前端开发B

**预估工时**: 1天

---

### 4.4 任务：创建奖励弹窗组件

**文件**: `client/src/components/RewardPopup.tsx` (新建)

**功能**:
- 显示获得的武力值、心情值
- 显示连续完成奖励
- 显示解锁的成就
- 动画效果（金币飞入等）

**负责人**: 前端开发B

**预估工时**: 0.5天

---

### 4.5 任务：扩展API封装

**文件**: `client/src/lib/api.ts` (修改)

**新增API**:
```typescript
export const aiChatApi = {
  createSession: () => api.post('/ai-chat/sessions'),
  sendMessage: (sessionId: string, message: string) => 
    api.post(`/ai-chat/sessions/${sessionId}/messages`, { message }),
  getHistory: (sessionId: string) => 
    api.get(`/ai-chat/sessions/${sessionId}`),
};

export const taskApi = {
  // ... 保留现有
  getRecommendations: () => api.get('/tasks/recommendations'),
  acceptRecommendation: (id: number) => 
    api.post(`/tasks/recommendations/${id}/accept`),
  rejectRecommendation: (id: number) => 
    api.post(`/tasks/recommendations/${id}/reject`),
  getTodayFocus: () => api.get('/tasks/today-focus'),
};
```

**负责人**: 前端开发A

**预估工时**: 0.5天

---

### 4.6 任务：添加路由

**文件**: `client/src/App.tsx` (修改)

**新增路由**:
```tsx
<Route path="/ai-chat" element={<AiChatPage />} />
```

**负责人**: 前端开发A

**预估工时**: 0.1天

---

## 五、AI对话逻辑设计

### 5.1 对话流程

```
用户进入 → 加载用户画像 → 生成开场白
     ↓
用户发送消息 → 分析意图 → 调用LLM生成回复
     ↓                        ↓
   普通对话 ←─────────→ 触发任务推荐
     ↓
用户接受/拒绝 → 更新推荐状态 → 追踪进度
```

### 5.2 Prompt模板

**系统Prompt**:
```
你是求职导师"小π"，帮助用户进行求职准备。
用户画像：
- 职业：{career}
- 经验：{experience}
- 目标职位：{target_position}
- 薄弱环节：{weakness}
- 求职目标：{goals}

你的职责：
1. 分析用户短板，给出针对性建议
2. 推荐个性化学习任务（知识补充、项目实战、面试练习）
3. 激励用户完成每日任务

回复格式：根据情况决定是否推荐任务。如需推荐，使用以下JSON格式：
{
  "message": "对话内容",
  "recommend_task": {
    "type": "knowledge|project|interview",
    "title": "任务标题",
    "description": "任务描述",
    "reason": "推荐理由"
  }
}
```

### 5.3 意图识别

| 用户意图 | 响应策略 |
|----------|----------|
| 询问建议 | 分析画像 → 推荐任务 |
| 分享进度 | 鼓励 → 推荐下一步 |
| 表达困惑 | 安抚 → 给出具体指导 |
| 接受任务 | 确认 → 添加到每日任务 |
| 拒绝任务 | 理解 → 记录偏好 |

---

## 六、任务生成逻辑

### 6.1 个性化规则

```python
def generate_tasks(user_profile):
    tasks = []
    
    # 基于薄弱环节
    for weakness in user_profile.weakness:
        tasks.append({
            "type": "knowledge",
            "title": f"学习{weakness}基础",
            "priority": "high"
        })
    
    # 基于目标职位
    if "大厂" in user_profile.goals:
        tasks.append({
            "type": "interview",
            "title": "模拟系统设计面试",
            "priority": "medium"
        })
    
    # 基于经验水平
    if user_profile.experience == "应届":
        tasks.append({
            "type": "project",
            "title": "完成一个完整项目",
            "priority": "medium"
        })
    
    return prioritize(tasks)
```

### 6.2 任务模板库

**知识补充类**:
- 学习[技术]基础
- 阅读[领域]相关文章
- 完成[技能]练习题

**项目实战类**:
- 设计一个[类型]系统
- 实现[功能]模块
- 优化[性能]瓶颈

**面试练习类**:
- 模拟[类型]面试
- 练习[公司]真题
- 准备行为面试问题

---

## 七、奖励与成就联动

### 7.1 奖励计算流程

```python
async def complete_task(user_id, task_id):
    task = await get_task(task_id)
    user = await get_user(user_id)
    
    # 基础奖励
    power = task.reward_power
    mood = task.reward_mood
    
    # 连续完成加成
    streak = await get_task_streak(user_id)
    bonus_rate = calculate_bonus_rate(streak)
    power = int(power * (1 + bonus_rate))
    mood = int(mood * (1 + bonus_rate))
    
    # 更新用户属性
    user.power = min(100, user.power + power)
    user.mood = min(100, user.mood + mood)
    
    # 检查成就
    achievements = await check_achievements(user_id, task)
    
    # 记录日志
    await log_completion(user_id, task, power, mood)
    
    return {
        "power_gained": power,
        "mood_gained": mood,
        "achievements": achievements
    }
```

### 7.2 新增成就定义

| Code | 名称 | 描述 | 条件 |
|------|------|------|------|
| task_first_accept | 从善如流 | 首次接受推荐任务 | 完成1次接受 |
| task_streak_7 | 持之以恒 | 连续7天完成任务 | streak>=7 |
| task_all_daily | 效率达人 | 单日完成所有任务 | 当日任务全完成 |
| task_master | 任务大师 | 累计完成50个任务 | 总完成数>=50 |

---

## 八、任务分配汇总

| 任务编号 | 任务名称 | 负责人 | 工时 | 依赖 |
|----------|----------|--------|------|------|
| BE-01 | 创建数据模型 | 后端A | 0.5天 | - |
| BE-02 | 创建Schema | 后端A | 0.5天 | BE-01 |
| BE-03 | 创建AI聊天API | 后端A | 1天 | BE-01, BE-02 |
| BE-04 | 创建任务推荐API | 后端A | 0.5天 | BE-01 |
| BE-05 | 创建任务生成服务 | 后端B | 1.5天 | - |
| BE-06 | 创建奖励计算服务 | 后端B | 1天 | BE-01 |
| FE-01 | 扩展API封装 | 前端A | 0.5天 | BE-03, BE-04 |
| FE-02 | 创建聊天页面 | 前端A | 1.5天 | FE-01 |
| FE-03 | 创建任务推荐卡片 | 前端A | 0.5天 | FE-02 |
| FE-04 | 改造任务面板 | 前端B | 1天 | FE-01 |
| FE-05 | 创建奖励弹窗 | 前端B | 0.5天 | - |
| FE-06 | 添加路由 | 前端A | 0.1天 | FE-02 |

**总工时估算**: 约10天（后端5天 + 前端4天 + 联调1天）

---

## 九、开发顺序建议

**第一阶段（后端基础）**:
1. BE-01 → BE-02 → BE-05（任务生成服务可并行开发）
2. BE-06

**第二阶段（后端API）**:
1. BE-03 → BE-04

**第三阶段（前端）**:
1. FE-01（等后端API完成）
2. FE-02 → FE-03（并行）
3. FE-04 → FE-05（并行）

**第四阶段（联调测试）**:
1. 端到端测试
2. 成就联动测试
3. 奖励计算验证

---

## 十、注意事项

1. **LLM服务复用**: AI聊天可复用现有面试LLM调用逻辑
2. **迁移脚本**: 需编写数据库迁移脚本添加新表和字段
3. **缓存策略**: 用户画像可缓存，减少数据库查询
4. **错误处理**: LLM调用需有超时和降级策略
5. **测试覆盖**: 核心服务需要单元测试

---

*文档创建时间: 2026-03-27*
*最后更新: 2026-03-27*
