# 后端开发文档

> 文档版本: v1.0  
> 更新时间: 2026-03-26  
> 基于文档: Evolved_ARCH.md, PSEUDO_CODE.md

---

## 1. 项目概述

### 1.1 技术栈

| 模块 | 技术选型 | 版本 | 说明 |
|------|----------|------|------|
| 语言 | Go | 1.21+ | 高并发原生支持，类型安全 |
| HTTP框架 | Gin | 1.x | 最小开销路由 |
| 内部通信 | gRPC | - | Protobuf序列化，快5-10倍 |
| WebSocket | gorilla/websocket | - | 成熟稳定 |
| 消息队列 | NATS JetStream | - | 单机百万msg/s，延迟<1ms |
| ORM | GORM | - | 类型安全 |
| 认证 | JWT | - | 无状态，易扩展 |

### 1.2 目录结构

```
server/
├── cmd/
│   ├── api/                # API服务入口
│   │   └── main.go
│   ├── ws/                 # WebSocket服务入口
│   │   └── main.go
│   └── worker/             # 异步任务Worker入口
│       └── main.go
├── internal/
│   ├── handler/            # HTTP处理器
│   │   ├── auth.go
│   │   ├── user.go
│   │   ├── interview.go
│   │   ├── pixel.go
│   │   ├── npc.go
│   │   └── task.go
│   ├── service/            # 业务逻辑层
│   │   ├── auth_service.go
│   │   ├── user_service.go
│   │   ├── interview_service.go
│   │   ├── scoring_service.go
│   │   ├── attribute_service.go
│   │   ├── pixel_service.go
│   │   ├── npc_service.go
│   │   └── task_service.go
│   ├── repository/         # 数据访问层
│   │   ├── user_repo.go
│   │   ├── interview_repo.go
│   │   ├── record_repo.go
│   │   ├── npc_repo.go
│   │   └── task_repo.go
│   ├── model/              # 数据模型
│   │   ├── user.go
│   │   ├── interview.go
│   │   ├── npc.go
│   │   └── task.go
│   ├── ws/                 # WebSocket处理
│   │   ├── handler.go
│   │   ├── session.go
│   │   └── message.go
│   ├── external/           # 外部服务客户端
│   │   ├── llm_client.go
│   │   ├── asr_client.go
│   │   ├── tts_client.go
│   │   └── pixel_client.go
│   ├── middleware/         # 中间件
│   │   ├── auth.go
│   │   ├── ratelimit.go
│   │   ├── circuitbreaker.go
│   │   └── logging.go
│   └── pkg/                # 公共包
│       ├── cache/
│       ├── crypto/
│       ├── jwt/
│       └── response/
├── pkg/                    # 可导出包
│   └── errors/
├── config/
│   ├── config.yaml
│   └── config.go
├── migrations/             # 数据库迁移
├── scripts/
├── go.mod
└── go.sum
```

### 1.3 环境要求

| 组件 | 最低版本 | 推荐版本 |
|------|---------|---------|
| Go | 1.21 | 1.22+ |
| PostgreSQL | 14 | 15+ |
| Redis | 6.2 | 7.0+ |
| MongoDB | 5.0 | 6.0+ |

---

## 2. 数据模型

### 2.1 PostgreSQL 表结构

#### 2.1.1 users 用户表

```sql
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    user_id         VARCHAR(32) UNIQUE NOT NULL,  -- u_xxx 格式
    phone           VARCHAR(128),                  -- AES加密存储
    email           VARCHAR(256),                  -- AES加密存储
    password_hash   VARCHAR(128) NOT NULL,         -- bcrypt加密
    nickname        VARCHAR(64) NOT NULL,
    avatar_url      VARCHAR(512),
    status          VARCHAR(16) DEFAULT 'active',  -- active/locked/deleted
    membership_type VARCHAR(16) DEFAULT 'free',    -- free/premium
    membership_expires_at TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at  TIMESTAMP,
    version         INT DEFAULT 1                  -- 乐观锁版本号
);

CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

#### 2.1.2 user_attributes 用户属性表

```sql
CREATE TABLE user_attributes (
    id          BIGSERIAL PRIMARY KEY,
    user_id     VARCHAR(32) NOT NULL REFERENCES users(user_id),
    power       INT DEFAULT 50 CHECK (power >= 0 AND power <= 100),
    mood        INT DEFAULT 50 CHECK (mood >= 0 AND mood <= 100),
    hp          INT DEFAULT 100 CHECK (hp >= 0 AND hp <= 100),
    wins        INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version     INT DEFAULT 1,
    
    UNIQUE(user_id)
);
```

#### 2.1.3 pixel_avatars 像素小人表

```sql
CREATE TABLE pixel_avatars (
    id              BIGSERIAL PRIMARY KEY,
    pixel_id        VARCHAR(32) UNIQUE NOT NULL,
    user_id         VARCHAR(32) NOT NULL REFERENCES users(user_id),
    spritesheet_url VARCHAR(512) NOT NULL,
    animations      JSONB,                         -- ["idle", "talk", "listen", ...]
    style           VARCHAR(32),                   -- professional/casual/...
    status          VARCHAR(16) DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pixel_avatars_user_id ON pixel_avatars(user_id);
```

#### 2.1.4 interviews 面试表

```sql
CREATE TABLE interviews (
    id              BIGSERIAL PRIMARY KEY,
    interview_id    VARCHAR(32) UNIQUE NOT NULL,   -- i_xxx 格式
    user_id         VARCHAR(32) NOT NULL REFERENCES users(user_id),
    type            VARCHAR(16) NOT NULL,          -- behavioral/technical/hr
    status          VARCHAR(16) DEFAULT 'pending', -- pending/in_progress/completed/cancelled
    difficulty      VARCHAR(16) DEFAULT 'medium',  -- easy/medium/hard
    npc_id          VARCHAR(32) NOT NULL,
    npc_config      JSONB,                         -- NPC配置快照
    turn_count      INT DEFAULT 0,
    stress_level    INT DEFAULT 0,
    scores          JSONB,                         -- 评分结果
    duration_seconds INT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP
);

CREATE INDEX idx_interviews_user_id ON interviews(user_id);
CREATE INDEX idx_interviews_status ON interviews(status);
CREATE INDEX idx_interviews_created_at ON interviews(created_at);
CREATE INDEX idx_interviews_user_status ON interviews(user_id, status);
```

#### 2.1.5 npcs NPC表

```sql
CREATE TABLE npcs (
    id              BIGSERIAL PRIMARY KEY,
    npc_id          VARCHAR(32) UNIQUE NOT NULL,
    name            VARCHAR(64) NOT NULL,
    type            VARCHAR(16) NOT NULL,          -- interviewer/companion
    style           VARCHAR(16) NOT NULL,          -- friendly/strict/pressure/encouraging
    avatar_url      VARCHAR(512) NOT NULL,
    description     TEXT,
    difficulty      VARCHAR(16) DEFAULT 'medium',
    animations      JSONB,
    system_prompt   TEXT NOT NULL,
    sample_questions JSONB,
    unlock_condition TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.1.6 tasks 任务表

```sql
CREATE TABLE tasks (
    id              BIGSERIAL PRIMARY KEY,
    task_id         VARCHAR(32) UNIQUE NOT NULL,
    type            VARCHAR(16) NOT NULL,          -- daily/weekly/achievement
    title           VARCHAR(128) NOT NULL,
    description     TEXT,
    reward          JSONB,                         -- {"power": 5, "mood": 2}
    target_count    INT DEFAULT 1,
    start_at        TIMESTAMP,
    end_at          TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_active ON tasks(is_active, start_at, end_at);
```

#### 2.1.7 user_tasks 用户任务表

```sql
CREATE TABLE user_tasks (
    id              BIGSERIAL PRIMARY KEY,
    user_id         VARCHAR(32) NOT NULL REFERENCES users(user_id),
    task_id         VARCHAR(32) NOT NULL REFERENCES tasks(task_id),
    progress        INT DEFAULT 0,
    status          VARCHAR(16) DEFAULT 'pending', -- pending/completed/claimed
    completed_at    TIMESTAMP,
    claimed_at      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, task_id, DATE(created_at))
);

CREATE INDEX idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX idx_user_tasks_status ON user_tasks(user_id, status);
```

#### 2.1.8 achievements 成就表

```sql
CREATE TABLE achievements (
    id              BIGSERIAL PRIMARY KEY,
    achievement_id  VARCHAR(32) UNIQUE NOT NULL,
    name            VARCHAR(64) NOT NULL,
    description     TEXT,
    icon_url        VARCHAR(512),
    condition       JSONB,                         -- 解锁条件
    reward          JSONB,
    category        VARCHAR(32),
    rarity          VARCHAR(16),                   -- common/rare/epic/legendary
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.1.9 user_achievements 用户成就表

```sql
CREATE TABLE user_achievements (
    id              BIGSERIAL PRIMARY KEY,
    user_id         VARCHAR(32) NOT NULL REFERENCES users(user_id),
    achievement_id  VARCHAR(32) NOT NULL REFERENCES achievements(achievement_id),
    unlocked_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, achievement_id)
);
```

### 2.2 MongoDB 文档结构

#### 2.2.1 interview_records 面试记录

```javascript
{
    "_id": ObjectId("..."),
    "interview_id": "i_def456",
    "user_id": "u_abc123",
    "messages": [
        {
            "role": "npc",              // user/npc/companion
            "content": "请做一个简单的自我介绍",
            "timestamp": 1714532000000,
            "audio_url": "https://cdn.example.com/audio/q_001.mp3"
        },
        {
            "role": "user",
            "content": "您好，我是张三...",
            "timestamp": 1714532100000,
            "audio_url": "https://cdn.example.com/audio/a_001.mp3",
            "duration_ms": 45000
        }
    ],
    "scores": {
        "expression": {"score": 80, "feedback": "表达清晰..."},
        "logic": {"score": 75, "feedback": "思路清晰..."},
        "professional": {"score": 82, "feedback": "专业知识扎实..."},
        "adaptability": {"score": 70, "feedback": "应对能力良好..."},
        "emotion": {"score": 85, "feedback": "情绪稳定..."}
    },
    "highlights": ["专业知识扎实", "表达清晰"],
    "improvements": ["建议放慢语速", "准备更多案例"],
    "audio_url": "https://cdn.example.com/audio/i_def456.mp3",
    "created_at": ISODate("2026-03-26T10:00:00Z"),
    "updated_at": ISODate("2026-03-26T10:12:00Z")
}

// 索引
db.interview_records.createIndex({"interview_id": 1}, {unique: true})
db.interview_records.createIndex({"user_id": 1, "created_at": -1})
```

#### 2.2.2 memories 用户记忆

```javascript
{
    "_id": ObjectId("..."),
    "user_id": "u_abc123",
    "type": "interview",            // interview/feedback/achievement
    "content": "...",
    "interview_id": "i_def456",
    "score": 78,
    "tags": ["technical", "backend"],
    "created_at": ISODate("2026-03-26T10:12:00Z")
}

// 索引
db.memories.createIndex({"user_id": 1, "created_at": -1})
db.memories.createIndex({"user_id": 1, "type": 1})
```

### 2.3 Redis 缓存结构

#### 2.3.1 缓存Key设计

| Key模式 | 数据类型 | TTL | 说明 |
|---------|---------|-----|------|
| `user:account:{account}` | String | 30min | 用户账号→用户信息缓存 |
| `user:attrs:{user_id}` | Hash | 30min | 用户属性缓存 |
| `user:session:{user_id}` | Hash | 24h | 用户Session |
| `interview:session:{interview_id}` | Hash | 30min | 面试会话缓存 |
| `npc:config:{npc_id}` | Hash | 永久 | NPC配置缓存 |
| `question:template:{type}` | List | 永久 | 题目模板缓存 |
| `ws:conn:{interview_id}` | String | 面试期间 | WS连接映射 |
| `rate:limit:{user_id}` | String | 1min | 限流计数器 |
| `lock:attrs:{user_id}` | String | 10s | 属性更新分布式锁 |

#### 2.3.2 缓存策略

```go
// 缓存失效策略
// 1. 写操作: 先更新DB → Redis Pub/Sub广播 → L1本地缓存删除
// 2. 布隆过滤器防穿透
// 3. TTL随机化(基础5min + 0-60s偏移)防雪崩
// 4. singleflight防击穿

// NPC配置: 全量加载到L1本地缓存(bigcache)，永不过期
// 用户Session: L2 Redis, TTL 30分钟
// 题目模板: L2 Redis, 永不过期(手动更新)
// 面试数据: 面试结束后删除
```

---

## 3. API接口规范

### 基础信息

- **基础路径**: `/api/v1`
- **协议**: HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8
- **认证方式**: Bearer JWT

### 通用请求头

```
Authorization: Bearer <token>
Content-Type: application/json
X-Request-ID: <uuid>
X-Client-Version: 1.0.0
```

### 通用响应格式

```json
{
    "code": "00000",
    "message": "success",
    "data": { },
    "trace_id": "abc123"
}
```

### 通用错误响应

```json
{
    "code": "40006",
    "message": "AI服务暂时不可用",
    "detail": "LLM服务响应超时",
    "trace_id": "abc123",
    "timestamp": "2026-03-26T10:30:00Z",
    "suggestion": "请稍后再试，或切换为文字模式继续面试"
}
```

---

### 3.1 认证模块

#### POST /api/v1/auth/register

用户注册

**请求参数 (Body)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 二选一 | 手机号 |
| email | string | 二选一 | 邮箱 |
| password | string | 是 | 密码(8-32位，含大小写字母和数字) |
| code | string | 是 | 验证码(6位) |
| nickname | string | 否 | 昵称(默认生成) |

**请求示例**

```json
{
    "phone": "13800138000",
    "password": "Password123!",
    "code": "123456",
    "nickname": "像素达人"
}
```

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "user_id": "u_abc123",
        "phone": "138****8000",
        "nickname": "像素达人",
        "created_at": "2026-03-26T10:00:00Z"
    }
}
```

**错误码**

| 错误码 | HTTP状态 | 说明 |
|--------|---------|------|
| 10002 | 400 | 参数校验失败 |
| 30003 | 409 | 手机号已注册 |
| 30004 | 409 | 邮箱已注册 |
| 10005 | 400 | 验证码错误 |

---

#### POST /api/v1/auth/login

用户登录

**请求参数 (Body)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| account | string | 是 | 手机号或邮箱 |
| password | string | 是 | 密码 |
| device_id | string | 否 | 设备ID |

**请求示例**

```json
{
    "account": "13800138000",
    "password": "Password123!",
    "device_id": "device_abc"
}
```

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expires_in": 86400,
        "user": {
            "user_id": "u_abc123",
            "nickname": "像素达人",
            "avatar_url": "https://cdn.example.com/pixel/u_abc123.png",
            "power": 75,
            "mood": 80,
            "hp": 100,
            "wins": 12
        }
    }
}
```

**错误码**

| 错误码 | HTTP状态 | 说明 |
|--------|---------|------|
| 20006 | 401 | 登录失败(账号或密码错误) |
| 20005 | 403 | 账号已被锁定 |
| 30001 | 404 | 用户不存在 |

---

#### POST /api/v1/auth/refresh

刷新Token

**请求参数 (Body)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| refresh_token | string | 是 | 刷新令牌 |

**请求示例**

```json
{
    "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expires_in": 86400
    }
}
```

**错误码**

| 错误码 | HTTP状态 | 说明 |
|--------|---------|------|
| 20003 | 401 | Token无效 |
| 20002 | 401 | Token已过期 |

---

#### POST /api/v1/auth/logout

用户登出

**认证**: 需要Bearer Token

**请求参数**: 无

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": null
}
```

---

#### POST /api/v1/auth/send-code

发送验证码

**请求参数 (Body)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 二选一 | 手机号 |
| email | string | 二选一 | 邮箱 |
| type | string | 是 | 用途: register/login/reset |

**请求示例**

```json
{
    "phone": "13800138000",
    "type": "register"
}
```

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "expires_in": 300
    }
}
```

**错误码**

| 错误码 | HTTP状态 | 说明 |
|--------|---------|------|
| 10003 | 429 | 请求过于频繁(60秒内只能发1次) |

---

### 3.2 用户模块

#### GET /api/v1/users/me

获取当前用户信息

**认证**: 需要Bearer Token

**请求参数**: 无

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "user_id": "u_abc123",
        "nickname": "像素达人",
        "phone": "138****8000",
        "email": "us***@example.com",
        "avatar_url": "https://cdn.example.com/pixel/u_abc123.png",
        "attributes": {
            "power": 75,
            "mood": 80,
            "hp": 100,
            "wins": 12
        },
        "membership": {
            "type": "premium",
            "expires_at": "2026-12-31T23:59:59Z"
        },
        "pixel_avatar": {
            "pixel_id": "p_xyz789",
            "sprite_url": "https://cdn.example.com/sprites/u_abc123.png",
            "animations": ["idle", "talk", "listen", "nod", "nervous"]
        },
        "created_at": "2026-01-01T00:00:00Z"
    }
}
```

---

#### PUT /api/v1/users/me

更新用户信息

**认证**: 需要Bearer Token

**请求参数 (Body)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 否 | 昵称(2-32位) |
| avatar_url | string | 否 | 头像URL |

**请求示例**

```json
{
    "nickname": "面试达人"
}
```

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "user_id": "u_abc123",
        "nickname": "面试达人",
        "updated_at": "2026-03-26T11:00:00Z"
    }
}
```

---

#### GET /api/v1/users/me/attributes

获取用户属性

**认证**: 需要Bearer Token

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "power": 75,
        "mood": 80,
        "hp": 100,
        "wins": 12,
        "level": 5,
        "exp": 1250,
        "next_level_exp": 1500
    }
}
```

---

#### GET /api/v1/users/me/stats

获取用户统计数据

**认证**: 需要Bearer Token

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "total_interviews": 50,
        "avg_score": 78.5,
        "highest_score": 95,
        "streak_days": 7,
        "rank": 128,
        "score_distribution": [
            {"range": "90-100", "count": 5},
            {"range": "80-89", "count": 15},
            {"range": "70-79", "count": 20},
            {"range": "60-69", "count": 8},
            {"range": "0-59", "count": 2}
        ]
    }
}
```

---

### 3.3 面试模块

#### POST /api/v1/interviews

创建面试会话

**认证**: 需要Bearer Token

**请求参数 (Body)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 面试类型: behavioral/technical/hr |
| difficulty | string | 否 | 难度: easy/medium/hard，默认medium |
| duration_minutes | int | 否 | 时长(分钟)，默认15 |
| npc_type | string | 否 | NPC类型: friendly/strict/pressure，默认friendly |

**请求示例**

```json
{
    "type": "behavioral",
    "difficulty": "medium",
    "duration_minutes": 15,
    "npc_type": "friendly"
}
```

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "interview_id": "i_def456",
        "type": "behavioral",
        "status": "pending",
        "npc": {
            "npc_id": "npc_001",
            "name": "HR小王",
            "avatar_url": "https://cdn.example.com/npc/npc_001.png",
            "personality": "friendly"
        },
        "questions_count": 5,
        "created_at": "2026-03-26T10:00:00Z"
    }
}
```

**错误码**

| 错误码 | HTTP状态 | 说明 |
|--------|---------|------|
| 40003 | 403 | 面试次数超限(免费用户每日3次) |

---

#### POST /api/v1/interviews/{interview_id}/start

开始面试

**认证**: 需要Bearer Token

**路径参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| interview_id | string | 是 | 面试ID |

**请求参数**: 无

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "interview_id": "i_def456",
        "status": "in_progress",
        "ws_url": "wss://ws.example.com/interview/i_def456?token=xxx",
        "current_question": {
            "question_id": "q_001",
            "text": "请做一个简单的自我介绍",
            "audio_url": "https://cdn.example.com/audio/q_001.mp3",
            "time_limit_seconds": 120
        },
        "started_at": "2026-03-26T10:00:00Z"
    }
}
```

**错误码**

| 错误码 | HTTP状态 | 说明 |
|--------|---------|------|
| 40001 | 404 | 面试不存在 |
| 40002 | 410 | 面试已过期 |

---

#### GET /api/v1/interviews

获取面试记录列表

**认证**: 需要Bearer Token

**查询参数 (Query)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认1 |
| page_size | int | 否 | 每页数量，默认20，最大100 |
| type | string | 否 | 面试类型筛选 |
| status | string | 否 | 状态筛选 |

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "total": 50,
        "page": 1,
        "page_size": 20,
        "items": [
            {
                "interview_id": "i_def456",
                "type": "behavioral",
                "status": "completed",
                "score": 78,
                "duration_seconds": 720,
                "npc": {
                    "npc_id": "npc_001",
                    "name": "HR小王"
                },
                "created_at": "2026-03-26T10:00:00Z",
                "completed_at": "2026-03-26T10:12:00Z"
            }
        ]
    }
}
```

---

#### GET /api/v1/interviews/{interview_id}

获取面试详情

**认证**: 需要Bearer Token

**路径参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| interview_id | string | 是 | 面试ID |

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "interview_id": "i_def456",
        "user_id": "u_abc123",
        "type": "behavioral",
        "status": "completed",
        "difficulty": "medium",
        "npc": {
            "npc_id": "npc_001",
            "name": "HR小王",
            "style": "friendly"
        },
        "turn_count": 5,
        "stress_level": 45,
        "scores": {
            "overall": 78,
            "dimensions": {
                "expression": 80,
                "logic": 75,
                "professional": 82,
                "adaptability": 70,
                "emotion": 85
            }
        },
        "duration_seconds": 720,
        "created_at": "2026-03-26T10:00:00Z",
        "started_at": "2026-03-26T10:00:00Z",
        "completed_at": "2026-03-26T10:12:00Z"
    }
}
```

---

#### POST /api/v1/interviews/{interview_id}/end

结束面试

**认证**: 需要Bearer Token

**路径参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| interview_id | string | 是 | 面试ID |

**请求参数 (Body)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| reason | string | 否 | 结束原因: completed/cancelled |

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "interview_id": "i_def456",
        "status": "completed",
        "duration_seconds": 720,
        "scores": {
            "overall": 78,
            "dimensions": {
                "expression": 80,
                "logic": 75,
                "professional": 82,
                "adaptability": 70,
                "emotion": 85
            }
        },
        "feedback": {
            "strengths": ["表达清晰，逻辑性强", "专业知识点扎实"],
            "improvements": ["可以增加具体的量化数据", "应变能力有待提升"]
        },
        "attributes_change": {
            "power": 5,
            "mood": 3,
            "wins": 1
        },
        "achievements": [
            {
                "id": "ach_001",
                "name": "初出茅庐",
                "description": "完成第一次面试"
            }
        ],
        "completed_at": "2026-03-26T10:12:00Z"
    }
}
```

---

#### GET /api/v1/interviews/{interview_id}/report

获取面试报告

**认证**: 需要Bearer Token

**路径参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| interview_id | string | 是 | 面试ID |

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "interview_id": "i_def456",
        "scores": {
            "expression": {
                "score": 80,
                "feedback": "表达清晰，逻辑性强，但语速稍快"
            },
            "logic": {
                "score": 75,
                "feedback": "思路清晰，但部分论点缺乏支撑"
            },
            "professional": {
                "score": 82,
                "feedback": "专业知识扎实，回答准确"
            },
            "adaptability": {
                "score": 70,
                "feedback": "应对能力良好，但压力面表现稍弱"
            },
            "emotion": {
                "score": 85,
                "feedback": "整体情绪稳定"
            }
        },
        "total_score": 78,
        "highlights": ["专业知识扎实", "表达清晰"],
        "improvements": ["建议放慢语速", "准备更多案例"],
        "qa_records": [
            {
                "question_id": "q_001",
                "question": "请做一个简单的自我介绍",
                "answer_id": "a_001",
                "answer_transcript": "您好，我是张三...",
                "audio_url": "https://cdn.example.com/audio/a_001.mp3",
                "duration_seconds": 45
            }
        ],
        "audio_url": "https://cdn.example.com/audio/i_def456.mp3",
        "created_at": "2026-03-26T10:00:00Z"
    }
}
```

---

### 3.4 像素模块

#### POST /api/v1/pixels/generate

生成像素小人(问卷方式)

**认证**: 需要Bearer Token

**请求参数 (Body)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| method | string | 是 | 生成方式: survey |
| survey_data | object | 是 | 问卷数据 |

**survey_data 结构**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| career | string | 是 | 职业: software_engineer/designer/... |
| personality | string | 是 | 性格: introvert/extrovert/ambivert |
| tags | []string | 否 | 标签: ["glasses", "coffee", "laptop"] |

**请求示例**

```json
{
    "method": "survey",
    "survey_data": {
        "career": "software_engineer",
        "personality": "introvert",
        "tags": ["glasses", "coffee", "laptop"]
    }
}
```

**响应示例 (202)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "task_id": "task_xyz789",
        "status": "processing",
        "estimated_time": 10
    }
}
```

---

#### POST /api/v1/pixels/generate-from-photo

生成像素小人(照片方式)

**认证**: 需要Bearer Token

**Content-Type**: multipart/form-data

**请求参数 (Form)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| photo | file | 是 | 照片文件(jpg/png，最大5MB) |
| style | string | 否 | 风格: professional/casual，默认professional |

**响应示例 (202)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "task_id": "task_xyz789",
        "status": "processing",
        "estimated_time": 10
    }
}
```

**错误码**

| 错误码 | HTTP状态 | 说明 |
|--------|---------|------|
| 50004 | 400 | 图片格式不支持 |
| 50005 | 400 | 图片大小超过限制 |

---

#### GET /api/v1/pixels/task/{task_id}

查询生成任务状态

**认证**: 需要Bearer Token

**路径参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| task_id | string | 是 | 任务ID |

**响应示例 - 处理中 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "task_id": "task_xyz789",
        "status": "processing",
        "progress": 60
    }
}
```

**响应示例 - 完成 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "task_id": "task_xyz789",
        "status": "completed",
        "result": {
            "pixel_id": "p_xyz789",
            "spritesheet_url": "https://cdn.example.com/sprites/p_xyz789.png",
            "animations": ["idle", "talk", "listen", "nod", "nervous"],
            "created_at": "2026-03-26T10:00:00Z"
        }
    }
}
```

---

#### GET /api/v1/pixels/{pixel_id}

获取像素小人信息

**认证**: 需要Bearer Token

**路径参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pixel_id | string | 是 | 像素ID |

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "pixel_id": "p_xyz789",
        "user_id": "u_abc123",
        "spritesheet_url": "https://cdn.example.com/sprites/p_xyz789.png",
        "animations": ["idle", "talk", "listen", "nod", "nervous"],
        "style": "professional",
        "created_at": "2026-03-26T10:00:00Z"
    }
}
```

---

### 3.5 NPC模块

#### GET /api/v1/npcs

获取NPC列表

**认证**: 需要Bearer Token

**查询参数 (Query)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 类型筛选: interviewer/companion |

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "npcs": [
            {
                "npc_id": "npc_001",
                "name": "HR小王",
                "type": "interviewer",
                "style": "friendly",
                "avatar_url": "https://cdn.example.com/npc/npc_001.png",
                "description": "资深HR，注重综合素质",
                "difficulty": "medium",
                "unlocked": true
            },
            {
                "npc_id": "npc_002",
                "name": "陪跑员小明",
                "type": "companion",
                "style": "encouraging",
                "avatar_url": "https://cdn.example.com/npc/npc_002.png",
                "description": "温暖有同理心，面试中提供支持",
                "unlocked": true
            }
        ]
    }
}
```

---

#### GET /api/v1/npcs/{npc_id}

获取NPC详情

**认证**: 需要Bearer Token

**路径参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| npc_id | string | 是 | NPC ID |

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "npc_id": "npc_001",
        "name": "HR小王",
        "type": "interviewer",
        "style": "friendly",
        "avatar_url": "https://cdn.example.com/npc/npc_001.png",
        "description": "资深HR，注重综合素质",
        "difficulty": "medium",
        "animations": {
            "idle": "https://cdn.example.com/npc/npc_001_idle.png",
            "talk": "https://cdn.example.com/npc/npc_001_talk.png",
            "listen": "https://cdn.example.com/npc/npc_001_listen.png"
        },
        "unlocked": true
    }
}
```

---

### 3.6 任务模块

#### GET /api/v1/tasks/daily

获取每日任务

**认证**: 需要Bearer Token

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "date": "2026-03-26",
        "tasks": [
            {
                "task_id": "t_001",
                "type": "daily",
                "title": "完成1次模拟面试",
                "description": "进行任意类型的模拟面试",
                "reward": {
                    "power": 5,
                    "mood": 2
                },
                "progress": {
                    "current": 0,
                    "target": 1
                },
                "status": "pending",
                "expires_at": "2026-03-26T23:59:59Z"
            },
            {
                "task_id": "t_002",
                "type": "daily",
                "title": "获得80分以上评价",
                "description": "在面试中获得80分及以上的评价",
                "reward": {
                    "power": 10
                },
                "progress": {
                    "current": 0,
                    "target": 1
                },
                "status": "pending",
                "expires_at": "2026-03-26T23:59:59Z"
            }
        ],
        "completed_count": 2,
        "total_count": 5
    }
}
```

---

#### POST /api/v1/tasks/{task_id}/claim

领取任务奖励

**认证**: 需要Bearer Token

**路径参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| task_id | string | 是 | 任务ID |

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "task_id": "t_001",
        "status": "claimed",
        "reward": {
            "power": 5,
            "mood": 2
        },
        "attributes_after": {
            "power": 80,
            "mood": 82
        }
    }
}
```

**错误码**

| 错误码 | HTTP状态 | 说明 |
|--------|---------|------|
| 60001 | 404 | 任务不存在 |
| 60002 | 400 | 任务未完成 |
| 60003 | 410 | 任务已过期 |

---

#### GET /api/v1/achievements

获取成就列表

**认证**: 需要Bearer Token

**查询参数 (Query)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category | string | 否 | 分类筛选 |
| unlocked | bool | 否 | 是否已解锁筛选 |

**响应示例 (200)**

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "achievements": [
            {
                "achievement_id": "ach_001",
                "name": "初出茅庐",
                "description": "完成第一次面试",
                "icon_url": "https://cdn.example.com/ach/001.png",
                "category": "interview",
                "rarity": "common",
                "unlocked": true,
                "unlocked_at": "2026-03-26T10:12:00Z"
            },
            {
                "achievement_id": "ach_002",
                "name": "百战百胜",
                "description": "累计完成100次面试",
                "icon_url": "https://cdn.example.com/ach/002.png",
                "category": "interview",
                "rarity": "legendary",
                "unlocked": false,
                "progress": {
                    "current": 50,
                    "target": 100
                }
            }
        ],
        "total_unlocked": 12,
        "total_count": 50
    }
}
```

---

## 4. WebSocket协议

### 4.1 连接认证

**连接URL**

```
wss://ws.example.com/interview/{interview_id}?token={jwt_token}
```

**Token验证**

```go
// WebSocket Token使用JWT RS256签名
type WSJWTClaims struct {
    InterviewID string `json:"interview_id"`
    UserID      string `json:"user_id"`
    jwt.StandardClaims
}

// Token有效期: 5分钟
// 过期后需要重新获取(调用POST /interviews/{id}/start)
```

### 4.2 消息格式

**MessagePack二进制格式**

```typescript
interface WSMessage {
    type: number;        // 消息类型
    seq: number;         // 序列号（递增）
    timestamp: number;   // 时间戳（毫秒）
    payload: any;        // 载荷（根据类型解析）
}
```

**消息类型枚举**

| 类型码 | 名称 | 方向 | 说明 |
|--------|------|------|------|
| 0 | AUDIO_DATA | C→S | 音频数据切片 |
| 1 | AUDIO_END | C→S | 音频结束标记 |
| 2 | TRANSCRIPT | S→C | 语音识别结果 |
| 3 | NPC_TEXT | S→C | NPC文本(流式) |
| 4 | NPC_AUDIO | S→C | NPC音频(流式) |
| 5 | STRESS_UPDATE | S→C | 压力值更新 |
| 6 | TURN_UPDATE | S→C | 轮次更新 |
| 7 | HINT | S→C | 陪跑员提示 |
| 8 | ERROR | S→C | 错误消息 |
| 9 | HEARTBEAT | 双向 | 心跳 |
| 10 | INTERVIEW_END | S→C | 面试结束 |

### 4.3 客户端消息

#### AUDIO_DATA (0) - 音频数据

```typescript
{
    type: 0,
    seq: 1,
    timestamp: 1711453200000,
    payload: <binary audio data>  // 16kHz, 16bit, mono PCM
}
```

**音频规格**
- 采样率: 16000 Hz
- 位深: 16 bit
- 声道: 单声道(mono)
- 格式: PCM
- 切片大小: 100ms (~3200 bytes)
- 最大消息: 512KB

#### AUDIO_END (1) - 音频结束

```typescript
{
    type: 1,
    seq: 10,
    timestamp: 171453210000,
    payload: null
}
```

#### HEARTBEAT (9) - 心跳

```typescript
{
    type: 9,
    seq: 1000,
    timestamp: 171453240000,
    payload: null
}
```

- 发送间隔: 30秒
- 超时断开: 60秒无响应

### 4.4 服务端消息

#### TRANSCRIPT (2) - 语音识别结果

```typescript
{
    type: 2,
    seq: 50,
    timestamp: 171453210000,
    payload: {
        text: "你好，我是张三，有3年后端开发经验...",
        is_final: true,
        confidence: 0.95
    }
}
```

#### NPC_TEXT (3) - NPC文本(流式)

```typescript
{
    type: 3,
    seq: 100,
    timestamp: 171453210000,
    payload: {
        text: "请",          // 单个token
        is_final: false,    // 是否最后一个token
        turn: 2             // 当前轮次
    }
}
```

#### NPC_AUDIO (4) - NPC音频(流式)

```typescript
{
    type: 4,
    seq: 101,
    timestamp: 171453210100,
    payload: <binary audio chunk>
}
```

#### STRESS_UPDATE (5) - 压力值更新

```typescript
{
    type: 5,
    seq: 300,
    timestamp: 171453230000,
    payload: {
        stress_level: 45    // 0-100
    }
}
```

#### TURN_UPDATE (6) - 轮次更新

```typescript
{
    type: 6,
    seq: 301,
    timestamp: 171453240000,
    payload: {
        turn: 3,
        is_user_turn: true
    }
}
```

#### HINT (7) - 陪跑员提示

```typescript
{
    type: 7,
    seq: 200,
    timestamp: 171453220000,
    payload: {
        hint: "可以谈谈你在这个项目中的具体贡献",
        emotion: "encouraging"
    }
}
```

#### ERROR (8) - 错误消息

```typescript
{
    type: 8,
    seq: 0,
    timestamp: 171453310000,
    payload: {
        code: "40006",
        message: "LLM服务暂时不可用",
        suggestion: "正在切换到备用服务，请稍候...",
        retry_after: 5
    }
}
```

#### INTERVIEW_END (10) - 面试结束

```typescript
{
    type: 10,
    seq: 500,
    timestamp: 171453300000,
    payload: {
        interview_id: "i_def456",
        duration_seconds: 720,
        scores: {
            overall: 78,
            dimensions: {
                expression: 80,
                logic: 75,
                professional: 82,
                adaptability: 70,
                emotion: 85
            }
        },
        report_url: "https://cdn.example.com/report/i_def456.pdf"
    }
}
```

### 4.5 心跳机制

| 参数 | 值 |
|------|-----|
| 客户端发送间隔 | 30秒 |
| 服务端响应超时 | 60秒 |
| 断开重连等待 | 5秒 |
| 最大重连次数 | 3次 |

### 4.6 面试流程消息序列

```
客户端                              服务端
   │                                   │
   │────── 连接请求(token) ────────────▶│
   │◀───── 连接成功/错误 ───────────────│
   │                                   │
   │◀───── NPC_TEXT(首个问题) ─────────│
   │◀───── NPC_AUDIO(问题音频) ────────│
   │                                   │
   │────── AUDIO_DATA(切片1) ─────────▶│
   │────── AUDIO_DATA(切片2) ─────────▶│
   │      ...                          │
   │────── AUDIO_END ─────────────────▶│
   │                                   │
   │◀───── TRANSCRIPT(识别结果) ───────│
   │                                   │
   │◀───── NPC_TEXT(token流) ─────────│
   │◀───── NPC_AUDIO(音频流) ──────────│
   │◀───── TURN_UPDATE ────────────────│
   │                                   │
   │      ... (循环)                   │
   │                                   │
   │◀───── INTERVIEW_END ──────────────│
   │                                   │
   │────── 关闭连接 ──────────────────▶│
```

---

## 5. 外部服务集成

### 5.1 通义千问LLM

**服务信息**
- 提供商: 阿里云
- 模型: qwen-max
- 用途: 面试对话、评分分析

**调用方式**

```go
type LLMClient struct {
    apiKey       string
    endpoint     string
    model        string              // qwen-max
    maxTokens    int                 // 4096
    temperature  float64             // 0.7
}

// 流式调用
func (c *LLMClient) StreamingChat(ctx context.Context, req *LLMRequest) (LLMStream, error)
```

**熔断配置**

```go
CircuitBreakerConfig{
    Name:               "llm-circuit",
    ErrorRateThreshold: 0.3,          // 30%错误率触发
    MinRequestCount:    50,
    OpenDuration:       60 * time.Second,
}
```

**重试配置**

```go
RetryConfig{
    MaxRetries:   3,
    InitialDelay: 500 * time.Millisecond,
    MaxDelay:     5 * time.Second,
    Multiplier:   2.0,
}
```

**降级策略**
- L1: 延迟>5s → 返回简化问题
- L2: 完全不可用 → 切换文心一言备用
- L3: 全部不可用 → 预录视频面试(50题库)

---

### 5.2 阿里云语音ASR/TTS

**ASR服务(语音识别)**

```go
type ASRClient struct {
    appKey      string
    accessKey   string
    endpoint    string
    format      string              // pcm
    sampleRate  int                 // 16000
}

// 流式识别
func (c *ASRClient) StreamingRecognize(ctx context.Context, req *ASRRequest) (*ASRResponse, error)
```

**ASR熔断配置**

```go
CircuitBreakerConfig{
    Name:               "asr-circuit",
    ErrorRateThreshold: 0.4,          // 40%错误率触发
    MinRequestCount:    30,
    OpenDuration:       30 * time.Second,
}
```

**ASR降级**: 切换文字输入模式

**TTS服务(语音合成)**

```go
type TTSClient struct {
    appKey      string
    accessKey   string
    endpoint    string
    voiceID     string              // NPC对应音色
    format      string              // pcm
    speed       float64             // 1.0
}

// 流式合成
func (c *TTSClient) StreamingSynthesize(ctx context.Context, req *TTSRequest) (TTSStream, error)
```

**TTS降级**: 仅显示文字，无语音

---

### 5.3 Seedance像素生成

**服务信息**
- 提供商: Seedance 5.0
- 用途: 像素小人生成

**调用方式**

```go
type PixelClient struct {
    apiKey      string
    endpoint    string
    timeout     time.Duration       // 60s
}

// 问卷方式生成
func (c *PixelClient) GenerateFromSurvey(ctx context.Context, req *SurveyRequest) (*PixelResult, error)

// 照片方式生成
func (c *PixelClient) GenerateFromPhoto(ctx context.Context, photo []byte) (*PixelResult, error)
```

**熔断配置**

```go
CircuitBreakerConfig{
    Name:               "pixel-circuit",
    ErrorRateThreshold: 0.5,          // 50%错误率触发
    MinRequestCount:    20,
    OpenDuration:       120 * time.Second,
}
```

**降级策略**: 使用预设模板

---

### 5.4 内容审核

**服务信息**
- 提供商: 阿里云绿网
- 用途: 图片审核、语音审核

**审核场景**
- 图片: 头像上传时审核
- 语音: 面试录音审核(异步)

**处理策略**
- 审核通过: 正常存储
- 审核拒绝: 拒绝上传，返回错误
- 审核不确定: 人工复核队列

---

## 6. 错误码定义

### 6.1 通用错误码 (1xxxx)

| 错误码 | HTTP状态 | 错误名称 | 说明 |
|--------|---------|---------|------|
| 10001 | 400 | INVALID_REQUEST | 无效请求 |
| 10002 | 400 | INVALID_PARAM | 参数校验失败 |
| 10003 | 429 | RATE_LIMITED | 请求过于频繁 |
| 10004 | 503 | SERVICE_UNAVAILABLE | 服务暂时不可用 |
| 10005 | 400 | CODE_INVALID | 验证码错误 |

### 6.2 认证错误码 (2xxxx)

| 错误码 | HTTP状态 | 错误名称 | 说明 |
|--------|---------|---------|------|
| 20001 | 401 | UNAUTHORIZED | 未登录 |
| 20002 | 401 | TOKEN_EXPIRED | Token已过期 |
| 20003 | 401 | TOKEN_INVALID | Token无效 |
| 20004 | 403 | PERMISSION_DENIED | 权限不足 |
| 20005 | 403 | ACCOUNT_LOCKED | 账号已被锁定 |
| 20006 | 401 | LOGIN_FAILED | 登录失败 |

### 6.3 用户错误码 (3xxxx)

| 错误码 | HTTP状态 | 错误名称 | 说明 |
|--------|---------|---------|------|
| 30001 | 404 | USER_NOT_FOUND | 用户不存在 |
| 30002 | 409 | USER_EXISTS | 用户已存在 |
| 30003 | 409 | PHONE_EXISTS | 手机号已注册 |
| 30004 | 409 | EMAIL_EXISTS | 邮箱已注册 |

### 6.4 面试错误码 (4xxxx)

| 错误码 | HTTP状态 | 错误名称 | 说明 |
|--------|---------|---------|------|
| 40001 | 404 | INTERVIEW_NOT_FOUND | 面试不存在 |
| 40002 | 410 | INTERVIEW_EXPIRED | 面试已过期 |
| 40003 | 403 | INTERVIEW_LIMIT_EXCEEDED | 面试次数超限 |
| 40004 | 502 | ASR_FAILED | 语音识别失败 |
| 40005 | 502 | TTS_FAILED | 语音合成失败 |
| 40006 | 502 | LLM_FAILED | AI服务失败 |

### 6.5 像素错误码 (5xxxx)

| 错误码 | HTTP状态 | 错误名称 | 说明 |
|--------|---------|---------|------|
| 50001 | 502 | PIXEL_GENERATION_FAILED | 像素生成失败 |
| 50002 | 404 | PIXEL_NOT_FOUND | 像素小人不存在 |
| 50003 | 403 | PIXEL_LIMIT_EXCEEDED | 生成次数超限 |
| 50004 | 400 | INVALID_IMAGE_FORMAT | 图片格式不支持 |
| 50005 | 400 | IMAGE_TOO_LARGE | 图片大小超过限制 |

### 6.6 任务错误码 (6xxxx)

| 错误码 | HTTP状态 | 错误名称 | 说明 |
|--------|---------|---------|------|
| 60001 | 404 | TASK_NOT_FOUND | 任务不存在 |
| 60002 | 400 | TASK_NOT_COMPLETED | 任务未完成 |
| 60003 | 410 | TASK_EXPIRED | 任务已过期 |

### 6.7 其他错误码

| 错误码 | HTTP状态 | 错误名称 | 说明 |
|--------|---------|---------|------|
| 70001 | 402 | PAYMENT_FAILED | 支付失败 |
| 80001 | 503 | EXTERNAL_SERVICE_UNAVAILABLE | 外部服务不可用 |

---

## 7. 安全要求

### 7.1 认证授权

**JWT配置**

```go
type JWTConfig struct {
    AccessTokenTTL   time.Duration  // 24小时
    RefreshTokenTTL  time.Duration  // 7天
    SigningMethod    string         // RS256
    Issuer           string         // "pixel-interview"
}

// JWT Claims
type Claims struct {
    UserID    string `json:"user_id"`
    SessionID string `json:"session_id"`
    jwt.StandardClaims
}
```

**WebSocket Token**

```go
type WSJWTClaims struct {
    InterviewID string `json:"interview_id"`
    UserID      string `json:"user_id"`
    jwt.StandardClaims
}
// 有效期: 5分钟
// 签名方式: RS256
```

### 7.2 数据加密

| 数据类型 | 存储方式 | 传输方式 |
|---------|---------|---------|
| 用户密码 | bcrypt (cost=12) | 不传输 |
| 手机号 | AES-256-GCM加密 | HTTPS |
| 邮箱 | AES-256-GCM加密 | HTTPS |
| 语音数据 | OSS加密存储 | HTTPS |
| JWT密钥 | KMS管理 | 内部服务 |

**AES加密示例**

```go
func EncryptAES(key []byte, plaintext string) (string, error) {
    block, err := aes.NewCipher(key)
    if err != nil {
        return "", err
    }
    
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }
    
    nonce := make([]byte, gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return "", err
    }
    
    ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
    return base64.StdEncoding.EncodeToString(ciphertext), nil
}
```

### 7.3 限流策略

| 限制类型 | 阈值 | 说明 |
|---------|------|------|
| HTTP API (用户级) | 60 req/min | 单用户请求限制 |
| HTTP API (IP级) | 1000 req/min | 单IP请求限制 |
| WebSocket | 独立通道 | 不计入HTTP限流 |
| 验证码发送 | 1 req/60s | 单手机/邮箱 |
| 登录尝试 | 5次/15min | 失败后锁定 |

**限流中间件**

```go
func RateLimitMiddleware(rdb *redis.Client) gin.HandlerFunc {
    limiter := rate.NewLimiter(rate.Every(time.Second), 1)
    
    return func(c *gin.Context) {
        userID := c.GetString("user_id")
        key := fmt.Sprintf("rate:limit:%s", userID)
        
        count, _ := rdb.Incr(c, key).Result()
        if count == 1 {
            rdb.Expire(c, key, time.Minute)
        }
        
        if count > 60 {
            respondError(c, ErrRateLimited)
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

### 7.4 输入验证

**必检项**
- 类型检查
- 长度限制
- 格式校验(邮箱、手机号)
- XSS过滤
- SQL注入防护

```go
type LoginRequest struct {
    Account  string `json:"account" binding:"required,min=6,max=64"`
    Password string `json:"password" binding:"required,min=8,max=32"`
    DeviceID string `json:"device_id" binding:"omitempty,alphanum,max=64"`
}
```

---

## 8. 部署说明

### 8.1 环境变量

```bash
# 服务配置
SERVICE_NAME=api-server
SERVICE_PORT=8080
SERVICE_ENV=production

# 数据库配置
DATABASE_URL=postgres://user:pass@host:5432/dbname?sslmode=require
MONGODB_URL=mongodb://user:pass@host:27017/dbname
REDIS_URL=redis://host:6379/0

# JWT配置
JWT_PRIVATE_KEY=<base64-encoded-rsa-private-key>
JWT_PUBLIC_KEY=<base64-encoded-rsa-public-key>

# 外部服务
QWEN_API_KEY=<api-key>
WENXIN_API_KEY=<api-key>
ALIYUN_ACCESS_KEY=<access-key>
ALIYUN_SECRET_KEY=<secret-key>
SEEDANCE_API_KEY=<api-key>

# OSS配置
OSS_BUCKET=<bucket-name>
OSS_ENDPOINT=<endpoint>
OSS_ACCESS_KEY=<access-key>
OSS_SECRET_KEY=<secret-key>

# 加密配置
AES_KEY=<32-byte-key>
```

### 8.2 健康检查

**HTTP健康检查**

```
GET /health
```

```json
{
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2026-03-26T10:00:00Z",
    "dependencies": {
        "database": "healthy",
        "redis": "healthy",
        "mongodb": "healthy"
    }
}
```

**就绪检查**

```
GET /ready
```

### 8.3 优雅关闭

```go
func gracefulShutdown(server *http.Server, quit chan os.Signal) {
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    
    log.Info("Shutting down server...")
    
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    if err := server.Shutdown(ctx); err != nil {
        log.Error("Server forced to shutdown", "error", err)
    }
    
    log.Info("Server exited")
}
```

### 8.4 MVP部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Vercel (前端托管)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Railway (后端托管)                         │
│                   $5/月起                                   │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  Supabase     │ │  阿里云       │ │  通义千问     │
│  (数据库/认证)│ │  (OSS/语音)   │ │  (LLM)        │
└───────────────┘ └───────────────┘ └───────────────┘
```

### 8.5 生产部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                      CDN (全球加速)                          │
│                      Cloudflare/阿里云CDN                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Kubernetes 集群                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Ingress │  │  API    │  │  WS     │  │ Worker  │        │
│  │ (Nginx) │  │ Service │  │ Service │  │ Service │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              服务网格 (Istio/Linkerd)                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  PostgreSQL   │ │  Redis        │ │  MongoDB      │
│  (主从)       │ │  Cluster      │ │  (分片)       │
└───────────────┘ └───────────────┘ └───────────────┘
```

---

*文档版本: v1.0*  
*更新时间: 2026-03-26*
