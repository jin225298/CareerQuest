# 前后端接口协议文档

> 版本: v1.0
> 更新时间: 2026-03-26
> 基础路径: `/api/v1`

---

## 1. 通信协议概述

### 1.1 基础信息

| 项目 | 值 |
|------|-----|
| HTTP API 基础URL | `https://api.example.com/api/v1` |
| WebSocket URL | `wss://ws.example.com` |
| 协议 | HTTPS / WSS |
| 数据格式 | JSON (HTTP) / MessagePack (WebSocket) |
| 字符编码 | UTF-8 |

### 1.2 认证方式

采用 **Bearer JWT** 认证：

- `access_token`: 有效期 24 小时，用于接口访问
- `refresh_token`: 有效期 7 天，用于刷新 access_token

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 1.3 限流策略

| 类型 | 限制 | 说明 |
|------|------|------|
| HTTP API | 60 req/min (单用户) | 超出返回 429 |
| WebSocket | 独立通道 | 不计入HTTP限流 |
| IP级别 | 1000 req/min | 防止恶意请求 |

---

## 2. 通用规范

### 2.1 请求头

```http
Authorization: Bearer <access_token>
Content-Type: application/json
X-Request-ID: <uuid>
X-Client-Version: 1.0.0
X-Device-ID: <device_id>
Accept-Language: zh-CN
```

### 2.2 响应格式

#### 成功响应

```typescript
interface ApiResponse<T> {
  code: "00000";
  message: "success";
  data: T;
  trace_id: string;
}
```

```json
{
  "code": "00000",
  "message": "success",
  "data": { ... },
  "trace_id": "abc123def456"
}
```

### 2.3 错误处理

#### 错误响应格式

```typescript
interface ErrorResponse {
  code: string;
  message: string;
  detail?: string;
  trace_id: string;
  timestamp: string;
  suggestion?: string;
}
```

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

#### 错误码定义

| 错误码 | HTTP状态 | 错误名称 | 说明 |
|--------|---------|---------|------|
| 00000 | 200 | SUCCESS | 成功 |
| 10001 | 400 | INVALID_REQUEST | 无效请求 |
| 10002 | 400 | INVALID_PARAM | 参数校验失败 |
| 10003 | 429 | RATE_LIMITED | 请求过于频繁 |
| 10004 | 503 | SERVICE_UNAVAILABLE | 服务暂时不可用 |
| 20001 | 401 | UNAUTHORIZED | 未登录 |
| 20002 | 401 | TOKEN_EXPIRED | Token已过期 |
| 20003 | 401 | TOKEN_INVALID | Token无效 |
| 20004 | 403 | PERMISSION_DENIED | 权限不足 |
| 20005 | 403 | ACCOUNT_LOCKED | 账号已被锁定 |
| 20006 | 401 | LOGIN_FAILED | 登录失败 |
| 30001 | 404 | USER_NOT_FOUND | 用户不存在 |
| 30002 | 409 | USER_EXISTS | 用户已存在 |
| 30003 | 409 | PHONE_EXISTS | 手机号已注册 |
| 30004 | 409 | EMAIL_EXISTS | 邮箱已注册 |
| 40001 | 404 | INTERVIEW_NOT_FOUND | 面试不存在 |
| 40002 | 410 | INTERVIEW_EXPIRED | 面试已过期 |
| 40003 | 403 | INTERVIEW_LIMIT_EXCEEDED | 面试次数超限 |
| 40004 | 502 | ASR_FAILED | 语音识别失败 |
| 40005 | 502 | TTS_FAILED | 语音合成失败 |
| 40006 | 502 | LLM_FAILED | AI服务失败 |
| 50001 | 502 | PIXEL_GENERATION_FAILED | 像素生成失败 |
| 50002 | 404 | PIXEL_NOT_FOUND | 像素小人不存在 |
| 50003 | 403 | PIXEL_LIMIT_EXCEEDED | 生成次数超限 |
| 50004 | 400 | INVALID_IMAGE_FORMAT | 图片格式不支持 |
| 50005 | 400 | IMAGE_TOO_LARGE | 图片大小超过限制 |
| 60001 | 404 | TASK_NOT_FOUND | 任务不存在 |
| 60002 | 400 | TASK_NOT_COMPLETED | 任务未完成 |
| 60003 | 410 | TASK_EXPIRED | 任务已过期 |

### 2.4 分页规范

#### 请求参数

```typescript
interface PaginationParams {
  page?: number;      // 页码，从1开始，默认1
  page_size?: number; // 每页数量，默认20，最大100
}
```

#### 响应格式

```typescript
interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}
```

```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "total": 100,
    "page": 1,
    "page_size": 20,
    "items": [...]
  }
}
```

---

## 3. 认证接口

### 3.1 发送验证码

发送手机/邮箱验证码，用于注册或找回密码。

**请求**

```
POST /api/v1/auth/send-code
```

```typescript
interface SendCodeRequest {
  target: string;     // 手机号或邮箱
  type: "register" | "reset_password" | "login";
  captcha?: string;   // 图形验证码（可选）
}
```

**示例请求**

```json
{
  "target": "13800138000",
  "type": "register"
}
```

**响应**

```typescript
interface SendCodeResponse {
  code: string;
  message: string;
  data: {
    expires_in: number;  // 验证码有效期（秒）
    cooldown: number;    // 下次发送冷却时间（秒）
  };
}
```

**示例响应**

```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "expires_in": 300,
    "cooldown": 60
  }
}
```

---

### 3.2 注册

用户注册，支持手机号或邮箱。

**请求**

```
POST /api/v1/auth/register
```

```typescript
interface RegisterRequest {
  phone?: string;     // 手机号（二选一）
  email?: string;     // 邮箱（二选一）
  password: string;   // 密码，8-20位，需包含字母和数字
  code: string;       // 验证码
  nickname?: string;  // 昵称（可选）
  invite_code?: string; // 邀请码（可选）
}
```

**示例请求**

```json
{
  "phone": "13800138000",
  "password": "Password123!",
  "code": "123456",
  "nickname": "像素达人"
}
```

**响应**

```typescript
interface RegisterResponse {
  code: string;
  message: string;
  data: {
    user_id: string;
    phone?: string;    // 脱敏显示
    email?: string;    // 脱敏显示
    nickname: string;
    created_at: string;
  };
}
```

**示例响应**

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

---

### 3.3 登录

用户登录，支持手机号、邮箱或用户名。

**请求**

```
POST /api/v1/auth/login
```

```typescript
interface LoginRequest {
  account: string;    // 手机号/邮箱/用户名
  password: string;   // 密码
  device_id?: string; // 设备ID
  device_info?: {
    platform: "web" | "ios" | "android";
    os_version?: string;
    app_version?: string;
  };
}
```

**示例请求**

```json
{
  "account": "13800138000",
  "password": "Password123!",
  "device_id": "device_abc123",
  "device_info": {
    "platform": "web",
    "os_version": "macOS 14.0",
    "app_version": "1.0.0"
  }
}
```

**响应**

```typescript
interface LoginResponse {
  code: string;
  message: string;
  data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;     // access_token有效期（秒）
    token_type: "Bearer";
    user: UserBrief;
  };
}

interface UserBrief {
  user_id: string;
  nickname: string;
  avatar_url: string;
  power: number;
  mood: number;
  hp: number;
  wins: number;
}
```

**示例响应**

```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400,
    "token_type": "Bearer",
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

---

### 3.4 Token刷新

使用 refresh_token 获取新的 access_token。

**请求**

```
POST /api/v1/auth/refresh
```

```typescript
interface RefreshTokenRequest {
  refresh_token: string;
}
```

**示例请求**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应**

```typescript
interface RefreshTokenResponse {
  code: string;
  message: string;
  data: {
    access_token: string;
    refresh_token: string;  // 新的refresh_token
    expires_in: number;
  };
}
```

**示例响应**

```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400
  }
}
```

---

### 3.5 登出

用户登出，使当前Token失效。

**请求**

```
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

**响应**

```json
{
  "code": "00000",
  "message": "success",
  "data": null
}
```

---

## 4. 用户接口

### 4.1 获取当前用户

获取当前登录用户的详细信息。

**请求**

```
GET /api/v1/users/me
Authorization: Bearer <access_token>
```

**响应**

```typescript
interface UserDetail {
  user_id: string;
  nickname: string;
  phone?: string;           // 脱敏显示
  email?: string;           // 脱敏显示
  avatar_url: string;
  attributes: UserAttributes;
  membership?: Membership;
  pixel_avatar?: PixelAvatar;
  created_at: string;
  last_active_at: string;
}

interface UserAttributes {
  power: number;    // 武力值 0-100
  mood: number;     // 心情值 0-100
  hp: number;       // 健康值 0-100
  wins: number;     // 累计胜场
}

interface Membership {
  type: "free" | "premium";
  expires_at?: string;
}

interface PixelAvatar {
  pixel_id: string;
  sprite_url: string;
  animations: string[];
}
```

**示例响应**

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
      "sprite_url": "https://cdn.example.com/sprites/p_xyz789.png",
      "animations": ["idle", "talk", "listen", "nod", "nervous"]
    },
    "created_at": "2026-01-01T00:00:00Z",
    "last_active_at": "2026-03-26T10:00:00Z"
  }
}
```

---

### 4.2 更新用户信息

更新用户昵称、头像等信息。

**请求**

```
PUT /api/v1/users/me
Authorization: Bearer <access_token>
```

```typescript
interface UpdateUserRequest {
  nickname?: string;
  avatar_url?: string;
}
```

**示例请求**

```json
{
  "nickname": "新的昵称"
}
```

**响应**

返回更新后的用户信息，格式同 [4.1 获取当前用户](#41-获取当前用户)。

---

### 4.3 获取用户属性

获取用户游戏化属性的详细统计。

**请求**

```
GET /api/v1/users/me/stats
Authorization: Bearer <access_token>
```

**响应**

```typescript
interface UserStats {
  total_interviews: number;
  avg_score: number;
  highest_score: number;
  streak_days: number;      // 连续登录天数
  rank: number;             // 排名
  score_distribution: Array<{
    range: string;
    count: number;
  }>;
}
```

**示例响应**

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

## 5. 面试接口

### 5.1 创建面试

创建一个新的面试会话。

**请求**

```
POST /api/v1/interviews
Authorization: Bearer <access_token>
```

```typescript
interface CreateInterviewRequest {
  type: "behavioral" | "technical" | "hr";
  position?: string;         // 目标岗位
  difficulty: "easy" | "medium" | "hard";
  duration_minutes?: number; // 面试时长，默认15
  npc_type?: "friendly" | "strict" | "pressure";  // NPC风格
  enable_companion?: boolean; // 是否启用陪跑员
}
```

**示例请求**

```json
{
  "type": "behavioral",
  "position": "software_engineer",
  "difficulty": "medium",
  "duration_minutes": 15,
  "npc_type": "friendly",
  "enable_companion": true
}
```

**响应**

```typescript
interface CreateInterviewResponse {
  interview_id: string;
  type: string;
  status: "pending";
  npc: NPCBrief;
  questions_count: number;   // 预计问题数量
  created_at: string;
}

interface NPCBrief {
  npc_id: string;
  name: string;
  avatar_url: string;
  personality: string;
}
```

**示例响应**

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

---

### 5.2 开始面试

开始面试，获取WebSocket连接地址和第一个问题。

**请求**

```
POST /api/v1/interviews/{interview_id}/start
Authorization: Bearer <access_token>
```

**响应**

```typescript
interface StartInterviewResponse {
  interview_id: string;
  status: "in_progress";
  ws_url: string;           // WebSocket连接地址
  current_question: Question;
  started_at: string;
}

interface Question {
  question_id: string;
  text: string;
  audio_url?: string;       // 问题音频URL
  time_limit_seconds?: number; // 回答时限
}
```

**示例响应**

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

---

### 5.3 结束面试

手动结束面试，获取评分和反馈。

**请求**

```
POST /api/v1/interviews/{interview_id}/end
Authorization: Bearer <access_token>
```

```typescript
interface EndInterviewRequest {
  reason?: "completed" | "user_cancelled" | "timeout";
}
```

**示例请求**

```json
{
  "reason": "completed"
}
```

**响应**

```typescript
interface EndInterviewResponse {
  interview_id: string;
  status: "completed";
  duration_seconds: number;
  scores: InterviewScores;
  feedback: Feedback;
  attributes_change: AttributesChange;
  achievements?: Achievement[];
  completed_at: string;
}

interface InterviewScores {
  overall: number;
  dimensions: {
    expression: number;      // 表达能力
    logic: number;           // 逻辑思维
    professional: number;    // 专业能力
    adaptability: number;    // 应变能力
    emotion: number;         // 情绪管理
  };
}

interface Feedback {
  strengths: string[];
  improvements: string[];
}

interface AttributesChange {
  power?: number;    // 变化值，正数增加，负数减少
  mood?: number;
  wins?: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url?: string;
}
```

**示例响应**

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

### 5.4 面试列表

获取用户的历史面试记录列表。

**请求**

```
GET /api/v1/interviews?page=1&page_size=20&type=behavioral&status=completed
Authorization: Bearer <access_token>
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| page_size | number | 否 | 每页数量，默认20 |
| type | string | 否 | 面试类型筛选 |
| status | string | 否 | 状态筛选 |

**响应**

```typescript
interface InterviewListResponse {
  total: number;
  page: number;
  page_size: number;
  items: InterviewListItem[];
}

interface InterviewListItem {
  interview_id: string;
  type: string;
  status: string;
  score?: number;
  duration_seconds?: number;
  npc: {
    npc_id: string;
    name: string;
  };
  created_at: string;
  completed_at?: string;
}
```

**示例响应**

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

### 5.5 面试详情

获取单个面试的详细信息。

**请求**

```
GET /api/v1/interviews/{interview_id}
Authorization: Bearer <access_token>
```

**响应**

```typescript
interface InterviewDetail {
  interview_id: string;
  user_id: string;
  type: string;
  status: string;
  difficulty: string;
  npc: NPCBrief;
  turn_count: number;
  stress_level: number;      // 0-100
  scores?: InterviewScores;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
}
```

**示例响应**

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
      "avatar_url": "https://cdn.example.com/npc/npc_001.png",
      "personality": "friendly"
    },
    "turn_count": 5,
    "stress_level": 35,
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
    "created_at": "2026-03-26T10:00:00Z",
    "started_at": "2026-03-26T10:00:10Z",
    "completed_at": "2026-03-26T10:12:00Z",
    "duration_seconds": 720
  }
}
```

---

### 5.6 面试报告

获取面试的详细报告，包含每道题的评分和反馈。

**请求**

```
GET /api/v1/interviews/{interview_id}/report
Authorization: Bearer <access_token>
```

**响应**

```typescript
interface InterviewReport {
  interview_id: string;
  scores: {
    [key: string]: {
      score: number;
      feedback: string;
    };
  };
  total_score: number;
  highlights: string[];
  improvements: string[];
  qa_records: QARecord[];
  audio_url?: string;        // 完整录音URL
  created_at: string;
}

interface QARecord {
  question_id: string;
  question: string;
  answer_id: string;
  answer_transcript: string;
  audio_url?: string;
  duration_seconds: number;
}
```

**示例响应**

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
        "answer_transcript": "您好，我是张三，有3年后端开发经验...",
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

## 6. WebSocket协议

### 6.1 连接建立

**连接URL**

```
wss://ws.example.com/interview/{interview_id}?token={jwt_token}
```

**连接流程**

1. 客户端携带 JWT Token 发起 WebSocket 连接
2. 服务端验证 Token 有效性
3. 验证通过后建立连接，返回连接成功消息
4. 客户端开始发送音频数据

### 6.2 消息格式

采用 **MessagePack** 二进制格式，提升传输效率。

```typescript
interface WSMessage {
  type: MessageType;     // 消息类型
  seq: number;           // 序列号（递增）
  timestamp: number;     // 时间戳（毫秒）
  payload: any;          // 载荷（根据类型解析）
}

enum MessageType {
  AUDIO_DATA = 0,        // 音频数据（用户说话）
  AUDIO_END = 1,         // 音频结束标记
  TRANSCRIPT = 2,        // 语音识别结果
  NPC_TEXT = 3,          // NPC文本（流式）
  NPC_AUDIO = 4,         // NPC音频（流式）
  STRESS_UPDATE = 5,     // 压力值更新
  TURN_UPDATE = 6,       // 轮次更新
  HINT = 7,              // 陪跑员提示
  ERROR = 8,             // 错误消息
  HEARTBEAT = 9,         // 心跳
  INTERVIEW_END = 10,    // 面试结束
  CONNECTION_ACK = 11,   // 连接确认
}
```

### 6.3 客户端消息

#### 音频数据上传

```typescript
// 音频切片（每100ms一片）
{
  type: MessageType.AUDIO_DATA,
  seq: 1,
  timestamp: 1711453200000,
  payload: <binary>  // 16kHz, 16bit, mono PCM
}
```

**音频规格**

| 参数 | 值 |
|------|-----|
| 采样率 | 16000 Hz |
| 位深度 | 16 bit |
| 声道数 | 1 (mono) |
| 格式 | PCM |
| 切片间隔 | 100ms |

#### 音频结束标记

```typescript
{
  type: MessageType.AUDIO_END,
  seq: 10,
  timestamp: 171453210000,
  payload: null
}
```

#### 心跳消息

```typescript
{
  type: MessageType.HEARTBEAT,
  seq: 1000,
  timestamp: 171453240000,
  payload: null
}
```

- 客户端每 30 秒发送一次心跳
- 服务端收到后回复心跳消息
- 超过 60 秒无心跳，服务端主动断开连接

### 6.4 服务端消息

#### 连接确认

```typescript
{
  type: MessageType.CONNECTION_ACK,
  seq: 0,
  timestamp: 171453200000,
  payload: {
    interview_id: "i_def456",
    user_id: "u_abc123",
    server_time: 171453200000
  }
}
```

#### 语音识别结果

```typescript
{
  type: MessageType.TRANSCRIPT,
  seq: 50,
  timestamp: 171453210000,
  payload: {
    text: "你好，我是张三，有3年后端开发经验...",
    is_final: true,       // 是否最终结果
    confidence: 0.95      // 置信度
  }
}
```

#### NPC文本回复（流式）

```typescript
{
  type: MessageType.NPC_TEXT,
  seq: 100,
  timestamp: 171453210000,
  payload: {
    text: "请",           // 单个token
    is_final: false,      // 是否最后一个token
    turn: 2               // 当前轮次
  }
}
```

#### NPC音频回复（流式）

```typescript
{
  type: MessageType.NPC_AUDIO,
  seq: 101,
  timestamp: 171453210100,
  payload: <binary audio chunk>  // 音频切片
}
```

#### 陪跑员提示

```typescript
{
  type: MessageType.HINT,
  seq: 200,
  timestamp: 171453220000,
  payload: {
    hint: "可以谈谈你在这个项目中的具体贡献",
    emotion: "encouraging"   // encouraging/neutral/warning
  }
}
```

#### 压力值更新

```typescript
{
  type: MessageType.STRESS_UPDATE,
  seq: 300,
  timestamp: 171453230000,
  payload: {
    stress_level: 45    // 0-100
  }
}
```

#### 轮次更新

```typescript
{
  type: MessageType.TURN_UPDATE,
  seq: 301,
  timestamp: 171453240000,
  payload: {
    turn: 3,
    is_user_turn: true,
    question?: {
      question_id: "q_002",
      text: "请介绍一下你最有成就感的项目"
    }
  }
}
```

#### 面试结束

```typescript
{
  type: MessageType.INTERVIEW_END,
  seq: 500,
  timestamp: 171453300000,
  payload: {
    interview_id: "i_def456",
    duration_seconds: 720,
    scores: {
      overall: 78,
      dimensions: { ... }
    },
    report_url: "https://cdn.example.com/report/i_def456.pdf"
  }
}
```

#### 错误消息

```typescript
{
  type: MessageType.ERROR,
  seq: 0,
  timestamp: 171453310000,
  payload: {
    code: "40006",
    message: "LLM服务暂时不可用",
    suggestion: "正在切换到备用服务，请稍候...",
    retry_after: 5,      // 建议重试等待时间（秒）
    fallback_mode?: "text_input" | "pre_recorded"  // 降级模式
  }
}
```

### 6.5 面试流程示例

```
┌──────────────────────────────────────────────────────────────────────┐
│ 客户端                                           服务端              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ──────── CONNECT ──────────────────────────────────────────────▶    │
│                                                                      │
│  ◀─────── CONNECTION_ACK ────────────────────────────────────────    │
│                                                                      │
│  ◀─────── TURN_UPDATE (问题1) ────────────────────────────────────   │
│                                                                      │
│  ──────── AUDIO_DATA (切片1) ───────────────────────────────────▶    │
│  ──────── AUDIO_DATA (切片2) ───────────────────────────────────▶    │
│  ...                                                                 │
│  ──────── AUDIO_END ─────────────────────────────────────────────▶   │
│                                                                      │
│  ◀─────── TRANSCRIPT (识别结果) ─────────────────────────────────    │
│                                                                      │
│  ◀─────── NPC_TEXT (流式token) ──────────────────────────────────    │
│  ◀─────── NPC_TEXT (流式token) ──────────────────────────────────    │
│  ...                                                                 │
│  ◀─────── NPC_AUDIO (音频切片) ──────────────────────────────────    │
│  ◀─────── NPC_AUDIO (音频切片) ──────────────────────────────────    │
│                                                                      │
│  ◀─────── TURN_UPDATE (问题2) ───────────────────────────────────    │
│                                                                      │
│  ... (重复上述流程)                                                   │
│                                                                      │
│  ──────── HEARTBEAT ─────────────────────────────────────────────▶   │
│  ◀─────── HEARTBEAT ─────────────────────────────────────────────    │
│                                                                      │
│  ◀─────── INTERVIEW_END ─────────────────────────────────────────    │
│                                                                      │
│  ──────── CLOSE ─────────────────────────────────────────────────▶   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. 像素模块接口

### 7.1 生成像素小人（问卷方式）

通过问卷调查数据生成像素小人。

**请求**

```
POST /api/v1/pixels/generate
Authorization: Bearer <access_token>
```

```typescript
interface GeneratePixelRequest {
  method: "survey";
  survey_data: {
    career: string;          // 职业方向
    personality?: string;    // 性格类型
    tags?: string[];         // 标签（眼镜、咖啡、笔记本等）
    style?: "professional" | "casual" | "creative";
  };
}
```

**示例请求**

```json
{
  "method": "survey",
  "survey_data": {
    "career": "software_engineer",
    "personality": "introvert",
    "tags": ["glasses", "coffee", "laptop"],
    "style": "professional"
  }
}
```

**响应**

```typescript
interface GeneratePixelResponse {
  task_id: string;
  status: "processing";
  estimated_time: number;    // 预计完成时间（秒）
}
```

**示例响应**

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

### 7.2 生成像素小人（照片方式）

通过上传照片生成像素小人。

**请求**

```
POST /api/v1/pixels/generate-from-photo
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**表单字段**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| photo | file | 是 | 照片文件，支持 jpg/png，最大 5MB |
| style | string | 否 | 风格：professional/casual/creative |

**响应**

返回格式同 [7.1 生成像素小人（问卷方式）](#71-生成像素小人问卷方式)。

---

### 7.3 查询生成任务状态

查询像素小人生成任务的状态。

**请求**

```
GET /api/v1/pixels/task/{task_id}
Authorization: Bearer <access_token>
```

**响应（处理中）**

```typescript
interface PixelTaskProcessing {
  task_id: string;
  status: "processing";
  progress: number;    // 0-100
}
```

**示例响应**

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

**响应（完成）**

```typescript
interface PixelTaskCompleted {
  task_id: string;
  status: "completed";
  result: {
    pixel_id: string;
    spritesheet_url: string;
    animations: string[];
    created_at: string;
  };
}
```

**示例响应**

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

**响应（失败）**

```typescript
interface PixelTaskFailed {
  task_id: string;
  status: "failed";
  error: {
    code: string;
    message: string;
  };
}
```

---

### 7.4 获取像素小人信息

获取已生成的像素小人详细信息。

**请求**

```
GET /api/v1/pixels/{pixel_id}
Authorization: Bearer <access_token>
```

**响应**

```typescript
interface PixelDetail {
  pixel_id: string;
  user_id: string;
  spritesheet_url: string;
  animations: {
    [key: string]: {
      frame_count: number;
      fps: number;
    };
  };
  metadata?: {
    career?: string;
    tags?: string[];
    generated_from: "survey" | "photo";
  };
  created_at: string;
}
```

**示例响应**

```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "pixel_id": "p_xyz789",
    "user_id": "u_abc123",
    "spritesheet_url": "https://cdn.example.com/sprites/p_xyz789.png",
    "animations": {
      "idle": { "frame_count": 4, "fps": 8 },
      "talk": { "frame_count": 6, "fps": 12 },
      "listen": { "frame_count": 2, "fps": 4 },
      "nod": { "frame_count": 4, "fps": 8 },
      "nervous": { "frame_count": 6, "fps": 10 }
    },
    "metadata": {
      "career": "software_engineer",
      "tags": ["glasses", "coffee"],
      "generated_from": "survey"
    },
    "created_at": "2026-03-26T10:00:00Z"
  }
}
```

---

## 8. NPC模块接口

### 8.1 获取NPC列表

获取所有可用的NPC角色列表。

**请求**

```
GET /api/v1/npcs?type=interviewer
Authorization: Bearer <access_token>
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | NPC类型：interviewer/companion |

**响应**

```typescript
interface NPCListResponse {
  npcs: NPC[];
}

interface NPC {
  npc_id: string;
  name: string;
  type: "interviewer" | "companion";
  style: "friendly" | "strict" | "pressure" | "encouraging";
  avatar_url: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  unlocked: boolean;          // 用户是否已解锁
  unlock_condition?: string;  // 解锁条件描述
}
```

**示例响应**

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
        "name": "技术大牛",
        "type": "interviewer",
        "style": "strict",
        "avatar_url": "https://cdn.example.com/npc/npc_002.png",
        "description": "技术专家，深入追问",
        "difficulty": "hard",
        "unlocked": false,
        "unlock_condition": "武力值达到60"
      },
      {
        "npc_id": "npc_003",
        "name": "陪跑员小明",
        "type": "companion",
        "style": "encouraging",
        "avatar_url": "https://cdn.example.com/npc/npc_003.png",
        "description": "温暖有同理心，面试中提供支持",
        "unlocked": true
      }
    ]
  }
}
```

---

### 8.2 获取NPC详情

获取单个NPC的详细信息。

**请求**

```
GET /api/v1/npcs/{npc_id}
Authorization: Bearer <access_token>
```

**响应**

```typescript
interface NPCDetail {
  npc_id: string;
  name: string;
  type: "interviewer" | "companion";
  style: string;
  avatar_url: string;
  description: string;
  difficulty: string;
  animations: {
    idle: string;
    talk: string;
    listen: string;
    nod?: string;
    nervous?: string;
  };
  stats?: {
    total_interviews: number;
    avg_score: number;
  };
  created_at: string;
}
```

**示例响应**

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
    "description": "资深HR，注重综合素质，善于引导候选人表达",
    "difficulty": "medium",
    "animations": {
      "idle": "https://cdn.example.com/npc/npc_001_idle.png",
      "talk": "https://cdn.example.com/npc/npc_001_talk.png",
      "listen": "https://cdn.example.com/npc/npc_001_listen.png",
      "nod": "https://cdn.example.com/npc/npc_001_nod.png"
    },
    "stats": {
      "total_interviews": 1234,
      "avg_score": 75.5
    },
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

---

## 9. 任务模块接口

### 9.1 获取每日任务

获取当天的每日任务列表。

**请求**

```
GET /api/v1/tasks/daily
Authorization: Bearer <access_token>
```

**响应**

```typescript
interface DailyTasksResponse {
  date: string;
  tasks: DailyTask[];
  completed_count: number;
  total_count: number;
}

interface DailyTask {
  task_id: string;
  type: "daily" | "weekly";
  title: string;
  description: string;
  reward: TaskReward;
  progress: {
    current: number;
    target: number;
  };
  status: "pending" | "in_progress" | "completed" | "claimed";
  expires_at: string;
}

interface TaskReward {
  power?: number;
  mood?: number;
  hp?: number;
  achievement_id?: string;
}
```

**示例响应**

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
        "title": "连续登录",
        "description": "每日登录APP",
        "reward": {
          "mood": 1,
          "hp": 5
        },
        "progress": {
          "current": 1,
          "target": 1
        },
        "status": "completed",
        "expires_at": "2026-03-26T23:59:59Z"
      }
    ],
    "completed_count": 2,
    "total_count": 5
  }
}
```

---

### 9.2 领取任务奖励

领取已完成的任务奖励。

**请求**

```
POST /api/v1/tasks/{task_id}/claim
Authorization: Bearer <access_token>
```

**响应**

```typescript
interface ClaimTaskResponse {
  task_id: string;
  rewards_received: TaskReward;
  new_attributes: UserAttributes;
  achievements_unlocked?: Achievement[];
}
```

**示例响应**

```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "task_id": "t_001",
    "rewards_received": {
      "power": 5,
      "mood": 2
    },
    "new_attributes": {
      "power": 80,
      "mood": 82,
      "hp": 100,
      "wins": 12
    },
    "achievements_unlocked": [
      {
        "id": "ach_002",
        "name": "勤奋练习",
        "description": "累计完成10次面试"
      }
    ]
  }
}
```

---

### 9.3 获取成就列表

获取用户已获得和可获得的成就列表。

**请求**

```
GET /api/v1/achievements
Authorization: Bearer <access_token>
```

**响应**

```typescript
interface AchievementListResponse {
  achievements: AchievementItem[];
  unlocked_count: number;
  total_count: number;
}

interface AchievementItem {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  unlocked: boolean;
  unlocked_at?: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  category: "interview" | "streak" | "special";
}
```

**示例响应**

```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "achievements": [
      {
        "id": "ach_001",
        "name": "初出茅庐",
        "description": "完成第一次面试",
        "icon_url": "https://cdn.example.com/achievements/ach_001.png",
        "unlocked": true,
        "unlocked_at": "2026-03-20T10:00:00Z",
        "rarity": "common",
        "category": "interview"
      },
      {
        "id": "ach_002",
        "name": "勤奋练习",
        "description": "累计完成10次面试",
        "icon_url": "https://cdn.example.com/achievements/ach_002.png",
        "unlocked": false,
        "rarity": "rare",
        "category": "interview"
      }
    ],
    "unlocked_count": 1,
    "total_count": 20
  }
}
```

---

## 10. 数据结构定义

### 10.1 用户对象

```typescript
interface User {
  user_id: string;
  phone?: string;           // 加密存储，脱敏展示
  email?: string;           // 加密存储，脱敏展示
  nickname: string;
  avatar_url: string;
  
  attributes: {
    power: number;          // 武力值 0-100
    mood: number;           // 心情值 0-100
    hp: number;             // 健康值 0-100
    wins: number;           // 累计胜场
  };
  
  pixel_avatar?: {
    pixel_id: string;
    sprite_url: string;
    animations: string[];
  };
  
  membership?: {
    type: "free" | "premium";
    expires_at?: string;
  };
  
  created_at: string;       // ISO 8601
  last_active_at: string;
  updated_at?: string;
}
```

### 10.2 用户属性对象

```typescript
interface UserAttributes {
  power: number;            // 武力值 0-100
                            // 影响：解锁高难度面试、NPC态度
  
  mood: number;             // 心情值 0-100
                            // 影响：动画表情、暴击率
                            // 恢复：每日登录+1，面试成功+3
  
  hp: number;               // 健康值 0-100
                            // 影响：动画状态、可用功能
                            // 消耗：高强度面试-5
                            // 恢复：休息（离线8小时）+20
  
  wins: number;             // 累计胜场
                            // 影响：成就解锁、排行榜
}
```

### 10.3 面试对象

```typescript
interface Interview {
  interview_id: string;
  user_id: string;
  
  type: "behavioral" | "technical" | "hr";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  difficulty: "easy" | "medium" | "hard";
  
  npc: {
    npc_id: string;
    name: string;
    style: string;
  };
  
  position?: string;        // 目标岗位
  duration_minutes?: number;
  
  turn_count: number;       // 对话轮次
  stress_level: number;     // 压力值 0-100
  
  scores?: {
    overall: number;
    dimensions: {
      expression: number;   // 表达能力
      logic: number;        // 逻辑思维
      professional: number; // 专业能力
      adaptability: number; // 应变能力
      emotion: number;      // 情绪管理
    };
  };
  
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
}

interface InterviewRecord {
  record_id: string;
  interview_id: string;
  user_id: string;
  
  messages: Array<{
    role: "user" | "npc" | "companion";
    content: string;
    timestamp: number;
    audio_url?: string;
  }>;
  
  audio_url?: string;       // 完整录音
  
  scores: {
    overall: number;
    dimensions: {
      [key: string]: {
        score: number;
        feedback: string;
      };
    };
  };
  
  highlights: string[];
  improvements: string[];
  
  created_at: string;
}
```

### 10.4 NPC对象

```typescript
interface NPC {
  npc_id: string;
  name: string;
  type: "interviewer" | "companion";
  
  style: "friendly" | "strict" | "pressure" | "encouraging";
  difficulty: "easy" | "medium" | "hard";
  
  avatar_url: string;
  description: string;
  
  animations: {
    idle: string;
    talk: string;
    listen: string;
    nod?: string;
    nervous?: string;
  };
  
  system_prompt?: string;   // 系统提示词（内部使用）
  sample_questions?: string[];
  
  unlock_condition?: string;
  
  stats?: {
    total_interviews: number;
    avg_score: number;
  };
  
  created_at: string;
  updated_at?: string;
}
```

### 10.5 任务对象

```typescript
interface Task {
  task_id: string;
  type: "daily" | "weekly" | "achievement";
  
  title: string;
  description: string;
  
  condition: {
    type: string;           // interview_count, streak_days, etc.
    target: number;
    params?: Record<string, any>;
  };
  
  reward: {
    power?: number;
    mood?: number;
    hp?: number;
    achievement_id?: string;
  };
  
  priority: number;
  is_active: boolean;
  
  created_at: string;
}

interface UserTask {
  user_id: string;
  task_id: string;
  
  progress: number;
  status: "pending" | "in_progress" | "completed" | "claimed";
  
  started_at?: string;
  completed_at?: string;
  claimed_at?: string;
  expires_at?: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  
  rarity: "common" | "rare" | "epic" | "legendary";
  category: "interview" | "streak" | "special";
  
  condition: {
    type: string;
    target: number;
  };
  
  created_at: string;
}

interface UserAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}
```

### 10.6 像素小人对象

```typescript
interface PixelAvatar {
  pixel_id: string;
  user_id: string;
  
  spritesheet_url: string;  // 精灵图URL
  
  animations: {
    [key: string]: {
      frames: number;       // 帧数
      fps: number;          // 帧率
      loop: boolean;        // 是否循环
    };
  };
  
  metadata: {
    generated_from: "survey" | "photo";
    career?: string;
    personality?: string;
    tags?: string[];
    style?: string;
  };
  
  created_at: string;
  updated_at?: string;
}

// 标准动画列表
type StandardAnimations = 
  | "idle"      // 呼吸/待机
  | "talk"      // 说话
  | "listen"    // 聆听
  | "nod"       // 点头
  | "nervous";  // 紧张/流汗
```

---

## 11. 附录

### 11.1 HTTP状态码使用规范

| 状态码 | 使用场景 |
|--------|----------|
| 200 | 请求成功 |
| 201 | 资源创建成功 |
| 202 | 请求已接受（异步处理） |
| 400 | 请求参数错误 |
| 401 | 未认证或Token无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 410 | 资源已过期 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
| 502 | 上游服务错误 |
| 503 | 服务暂时不可用 |

### 11.2 日期时间格式

所有日期时间字段使用 **ISO 8601** 格式：

```
2026-03-26T10:00:00Z
```

时区统一使用 UTC。

### 11.3 国际化支持

响应中的 `message` 字段支持国际化，根据请求头 `Accept-Language` 返回对应语言：

```http
Accept-Language: zh-CN
```

### 11.4 API版本控制

- URL路径版本控制：`/api/v1/`
- 向后兼容的小版本更新不改变URL
- 大版本更新时发布新路径 `/api/v2/`

### 11.5 Mock服务

开发阶段可使用以下Mock服务地址：

| 环境 | HTTP API | WebSocket |
|------|----------|-----------|
| 开发 | `http://localhost:8080/api/v1` | `ws://localhost:8080/ws` |
| 测试 | `https://api-test.example.com/api/v1` | `wss://ws-test.example.com` |

---

## 12. 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-03-26 | 初始版本 |

---

*文档维护：前后端团队*
*联系方式：dev@example.com*
