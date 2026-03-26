# 架构设计文档 v1.0 - 性能优先版

> 设计理念：性能第一，可读性第二，开发效率第三
> 
> 作者：性能狂人
> 日期：2026-03-26

---

## 1. 核心设计理念

### 1.1 性能优先原则

```
┌─────────────────────────────────────────────────────────────┐
│                     性能优先三角                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        响应时间                              │
│                       < 100ms                                │
│                          ▲                                  │
│                         /│\                                 │
│                        / │ \                                │
│                       /  │  \                               │
│                      /   │   \                              │
│               并发能力    │    资源利用率                     │
│              10000+ QPS   │    CPU > 70%                     │
│                           │    MEM < 80%                     │
│                           │                                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 性能目标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| API 响应时间 | P99 < 100ms | 所有接口 |
| 面试首字延迟 | < 1.5s | 用户说话到AI回复首字 |
| Lip Sync 延迟 | < 50ms | 语音到动画同步 |
| 像素生成时间 | < 10s | 含上传处理 |
| 并发面试支持 | 1000+ | 同时进行 |
| WebSocket 连接数 | 50000+ | 单机 |
| 内存占用 | < 2GB | 单进程 |

### 1.3 性能 vs 其他权衡

| 决策点 | 性能选择 | 牺牲 |
|--------|----------|------|
| 内存管理 | 对象池 + 预分配 | 开发复杂度 |
| 序列化 | Protobuf/MessagePack | 可读性 |
| 缓存策略 | 多级缓存 + 预热 | 内存成本 |
| 数据库 | 读写分离 + 分库分表 | 架构复杂度 |
| 长连接 | WebSocket 全双工 | 断线重连逻辑 |
| 音频处理 | 边录边传 | 本地存储 |

---

## 2. 系统架构图

### 2.1 整体架构

```
                                    ┌─────────────────────────────────────────────────────────────────┐
                                    │                        客户端层                                   │
                                    ├─────────────────────────────────────────────────────────────────┤
                                    │                                                                 │
                                    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
                                    │  │   Web App    │  │   PWA App    │  │  Mini Program │            │
                                    │  │   (React)    │  │  (Offline)   │  │   (微信)      │            │
                                    │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
                                    │         │                 │                 │                    │
                                    │         └────────────────┬┴─────────────────┘                    │
                                    │                          │                                       │
                                    │                          ▼                                       │
                                    │                 ┌────────────────┐                               │
                                    │                 │  Service Worker │  (离线缓存 + 预加载)          │
                                    │                 └────────┬───────┘                               │
                                    │                          │                                       │
                                    └──────────────────────────┼───────────────────────────────────────┘
                                                               │
                                                               │ WSS / HTTPS
                                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           接入层                                                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│    ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐                            │
│    │  CDN (全球加速)  │      │  L7 负载均衡    │      │  API Gateway    │                            │
│    │  Cloudflare     │──────▶  Nginx/Envoy   │──────▶  Kong/APISIX    │                            │
│    │  (静态资源+缓存) │      │  (SSL卸载+限流) │      │  (路由+鉴权+熔断)│                            │
│    └─────────────────┘      └─────────────────┘      └────────┬────────┘                            │
│                                                                │                                     │
└────────────────────────────────────────────────────────────────┼─────────────────────────────────────┘
                                                                 │
                                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         服务层                                                        │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              WebSocket 集群 (面试实时通信)                                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐                              │   │
│  │  │  WS Node 1 │  │  WS Node 2 │  │  WS Node 3 │  │  WS Node N │  (水平扩展)                   │   │
│  │  │  50k 连接  │  │  50k 连接  │  │  50k 连接  │  │  50k 连接  │                              │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘                              │   │
│  │        │               │               │               │                                      │   │
│  │        └───────────────┴───────┬───────┴───────────────┘                                      │   │
│  │                                │                                                              │   │
│  │                                ▼                                                              │   │
│  │                       ┌─────────────────┐                                                     │   │
│  │                       │  Redis Pub/Sub  │  (集群内消息广播)                                    │   │
│  │                       └─────────────────┘                                                     │   │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              API 服务集群 (无状态)                                              │   │
│  │                                                                                              │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐             │   │
│  │  │ 用户服务   │  │ 面试服务   │  │ 评分服务   │  │ NPC服务    │  │ 任务服务   │             │   │
│  │  │            │  │            │  │            │  │            │  │            │             │   │
│  │  │ - 认证    │  │ - 面试流   │  │ - 实时评   │  │ - NPC对话  │  │ - 任务调度 │             │   │
│  │  │ - 用户数据│  │ - 题目管理│  │ - 报告生成│  │ - 状态机   │  │ - 成就系统 │             │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘             │   │
│  │        │               │               │               │               │                    │   │
│  │        └───────────────┴───────┬───────┴───────────────┴───────────────┘                    │   │
│  │                                │                                                              │   │
│  │                                ▼                                                              │   │
│  │                       ┌─────────────────┐                                                     │   │
│  │                       │  gRPC 内部通信  │  (服务间高性能调用)                                  │   │
│  │                       └─────────────────┘                                                     │   │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              异步任务集群 (CPU密集型)                                          │   │
│  │                                                                                              │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                                              │   │
│  │  │ 像素生成   │  │ 音频处理   │  │ AI推理    │  (独立部署，弹性伸缩)                          │   │
│  │  │ Worker    │  │ Worker    │  │ Worker    │                                                │   │
│  │  │           │  │           │  │           │                                                │   │
│  │  │ Seedance  │  │ ASR/TTS   │  │ LLM调用   │                                                │   │
│  │  │ 调用      │  │ 边缘计算  │  │ 批处理    │                                                │   │
│  │  └───────────┘  └───────────┘  └───────────┘                                                │   │
│  │                                                                                              │   │
│  │                        ┌─────────────────┐                                                   │   │
│  │                        │  消息队列集群   │                                                   │   │
│  │                        │  NATS/Kafka    │  (高性能消息传递)                                  │   │
│  │                        └─────────────────┘                                                   │   │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                 │
                                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         数据层                                                        │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              缓存层 (多级缓存)                                                 │   │
│  │                                                                                              │   │
│  │   ┌────────────┐      ┌────────────┐      ┌────────────┐                                     │   │
│  │   │  L1 本地   │      │  L2 Redis  │      │  L3 Redis  │                                     │   │
│  │   │  进程缓存  │──────▶  Cluster   │──────▶  持久化    │                                     │   │
│  │   │  (LRU)    │      │  (热数据)  │      │  (冷数据)  │                                     │   │
│  │   │  <10ms    │      │  <5ms      │      │  <50ms     │                                     │   │
│  │   └───────────┘      └────────────┘      └────────────┘                                     │   │
│  │                                                                                              │   │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              数据库层 (读写分离 + 分片)                                        │   │
│  │                                                                                              │   │
│  │   ┌────────────┐      ┌────────────┐      ┌────────────┐                                     │   │
│  │   │ PostgreSQL │      │ PostgreSQL │      │  ClickHouse│                                     │   │
│  │   │  主库      │─────▶│  只读副本  │      │  分析库    │                                     │   │
│  │   │  (写入)    │      │  (读取)    │      │  (日志/统计)│                                     │   │
│  │   └────────────┘      └────────────┘      └────────────┘                                     │   │
│  │                                                                                              │   │
│  │   ┌────────────┐      ┌────────────┐      ┌────────────┐                                     │   │
│  │   │  MongoDB   │      │   MinIO    │      │ Elasticsearch│                                    │   │
│  │   │  (文档)    │      │  (对象存储)│      │  (搜索)    │                                     │   │
│  │   │  面试记录  │      │  音频/图片 │      │  题目搜索  │                                     │   │
│  │   └────────────┘      └────────────┘      └────────────┘                                     │   │
│  │                                                                                              │   │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                                      │
                                                                                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         外部服务层                                                    │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐                   │
│   │  通义千问  │  │  文心一言  │  │  讯飞ASR   │  │  阿里TTS   │  │  Seedance  │                   │
│   │  LLM API   │  │  LLM API   │  │  语音识别  │  │  语音合成  │  │  像素生成  │                   │
│   │  国内      │  │  国内备选  │  │  国内      │  │  国内      │  │  图片生成  │                   │
│   └────────────┘  └────────────┘  └────────────┘  └────────────┘  └────────────┘                   │
│                                                                                                      │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐                                                   │
│   │  OpenAI    │  │  ElevenLabs│  │  AWS Polly │  (海外版本)                                      │
│   │  LLM API   │  │  TTS API   │  │  TTS API   │                                                   │
│   └────────────┘  └────────────┘  └────────────┘                                                   │
│                                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流架构

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    面试实时交互数据流                                                  │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                       │
│   用户说话                                                                                            │
│      │                                                                                                │
│      ▼                                                                                                │
│   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐                                      │
│   │  Web Audio  │───────▶│   VAD检测   │───────▶│  音频切片   │                                      │
│   │  API录音    │        │  (端点检测) │        │  (100ms)    │                                      │
│   └─────────────┘        └──────┬──────┘        └──────┬──────┘                                      │
│                                 │                      │                                             │
│                                 ▼                      ▼                                             │
│                          ┌─────────────┐        ┌─────────────┐                                      │
│                          │  Lip Sync   │        │  WS流式上传 │                                      │
│                          │  本地动画   │        │  (二进制)   │                                      │
│                          │  <10ms      │        └──────┬──────┘                                      │
│                          └─────────────┘               │                                             │
│                                                        ▼                                             │
│                                                 ┌─────────────┐                                      │
│                                                 │  ASR服务    │                                      │
│                                                 │  (流式识别) │                                      │
│                                                 │  <200ms首字 │                                      │
│                                                 └──────┬──────┘                                      │
│                                                        │                                             │
│                                                        ▼                                             │
│                                                 ┌─────────────┐                                      │
│                                                 │  LLM推理    │                                      │
│                                                 │  (流式输出) │                                      │
│                                                 │  <1s首字    │                                      │
│                                                 └──────┬──────┘                                      │
│                                                        │                                             │
│                                    ┌───────────────────┴───────────────────┐                         │
│                                    │                                       │                         │
│                                    ▼                                       ▼                         │
│                             ┌─────────────┐                         ┌─────────────┐                   │
│                             │  TTS服务    │                         │  评分服务   │                   │
│                             │  (流式合成) │                         │  (异步)     │                   │
│                             │  <200ms首音 │                         │  面试结束后 │                   │
│                             └──────┬──────┘                         └─────────────┘                   │
│                                    │                                                                   │
│                                    ▼                                                                   │
│                             ┌─────────────┐                                                           │
│                             │  WS推送给   │                                                           │
│                             │  前端播放   │                                                           │
│                             │  (流式)     │                                                           │
│                             └─────────────┘                                                           │
│                                                                                                       │
│   总延迟目标：< 1.5s (用户说话到AI回复首字)                                                            │
│                                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 关键技术选型

### 3.1 后端技术栈

| 层级 | 技术选型 | 性能理由 |
|------|----------|----------|
| **语言** | Go (主) + Rust (关键路径) | Go: 高并发原生支持，Goroutine轻量；Rust: 零成本抽象，极致性能 |
| **框架** | Gin (HTTP) + gRPC (内部) | Gin: 最小开销路由；gRPC: Protobuf序列化，比JSON快5-10倍 |
| **WebSocket** | gorilla/websocket + 自研连接池 | 单机50k连接，内存占用<2GB |
| **消息队列** | NATS JetStream | 单机百万msg/s，延迟<1ms，比Kafka快10倍 |
| **缓存** | Redis Cluster + bigcache | bigcache: 无GC压力本地缓存，<1μs延迟 |
| **数据库** | PostgreSQL + Citus | Citus: 水平扩展，支持分布式查询 |
| **文档存储** | MongoDB (分片集群) | 面试记录、用户行为日志 |
| **时序数据** | ClickHouse | 面试统计、用户行为分析，列式存储 |
| **搜索** | Elasticsearch | 题目搜索，倒排索引 |
| **对象存储** | MinIO | 音频、图片，S3兼容，自建高性能 |

### 3.2 前端技术栈

| 模块 | 技术选型 | 性能理由 |
|------|----------|----------|
| **框架** | React 18 + Concurrent Mode | 并发渲染，优先级调度 |
| **动画** | Framer Motion + CSS GPU动画 | GPU加速，60fps保证 |
| **状态管理** | Zustand + Immer | 极小bundle，无Provider开销 |
| **音频** | Web Audio API + AudioWorklet | 独立线程处理音频，不阻塞主线程 |
| **WebSocket** | 自研重连库 + 心跳优化 | 断线重连<100ms，心跳间隔30s |
| **数据序列化** | MessagePack + Protobuf | 比JSON小50%，解析快3倍 |
| **懒加载** | React.lazy + Intersection Observer | 按需加载，首屏<2s |
| **离线** | Service Worker + IndexedDB | 离线可用，缓存策略 |

### 3.3 AI服务选型

| 服务 | 国内 | 海外 | 性能考虑 |
|------|------|------|----------|
| **LLM** | 通义千问-Max / 文心一言-4 | Claude-3-Sonnet | 流式输出，首字延迟<1s |
| **ASR** | 讯飞实时语音识别 | Google Speech-to-Text | 流式识别，<200ms首字 |
| **TTS** | 阿里云智能语音 | ElevenLabs | 流式合成，<200ms首音 |
| **像素生成** | Seedance 5.0 | Seedance 5.0 | 异步生成，预期<10s |

### 3.4 序列化协议对比

| 协议 | 序列化速度 | 反序列化速度 | 大小 | 适用场景 |
|------|-----------|-------------|------|----------|
| JSON | 1x | 1x | 100% | 调试、公开API |
| MessagePack | 3x | 2.5x | 60% | 内部API、WS消息 |
| Protobuf | 5x | 8x | 40% | gRPC、高频调用 |
| FlatBuffers | 10x | 20x | 50% | 零拷贝场景 |

**决策**：
- 外部API：JSON（兼容性）
- WebSocket消息：MessagePack（性能+可调试）
- gRPC内部调用：Protobuf（极致性能）

---

## 4. 数据结构设计

### 4.1 核心数据结构（极简设计）

```go
// 用户（精简字段，频繁访问字段放前面）
type User struct {
    ID           uint64    `json:"id"`              // 8 bytes
    Power        uint8     `json:"power"`           // 1 byte, 0-100
    Mood         uint8     `json:"mood"`            // 1 byte, 0-100
    HP           uint8     `json:"hp"`              // 1 byte, 0-100
    Wins         uint16    `json:"wins"`            // 2 bytes, 累计胜场
    CreatedAt    int64     `json:"created_at"`      // 8 bytes, Unix timestamp
    LastActiveAt int64     `json:"last_active_at"`  // 8 bytes
    
    // 以下字段冷数据，单独存储
    // Nickname, Avatar, Settings...
}
// 热数据总计: 29 bytes，单条记录对齐后 32 bytes

// 面试会话（面试过程中的状态）
type InterviewSession struct {
    ID           uint64    `json:"id"`
    UserID       uint64    `json:"user_id"`
    Status       uint8     `json:"status"`          // 0:待开始 1:进行中 2:已结束 3:已取消
    Type         uint8     `json:"type"`            // 0:行为面 1:技术面 2:HR面
    NPCID        uint16    `json:"npc_id"`          // 面试官ID
    StartTime    int64     `json:"start_time"`
    EndTime      int64     `json:"end_time"`
    
    // 实时状态（面试中频繁更新）
    TurnCount    uint16    `json:"turn_count"`      // 当前轮次
    StressLevel  uint8     `json:"stress_level"`    // 压力值 0-100
    
    // 内存指针，避免序列化
    audioBuffer  *ring.Buffer  // 音频环形缓冲
    messageQueue *queue.LockFree // 无锁消息队列
}

// 面试记录（面试结束后持久化）
type InterviewRecord struct {
    ID           primitive.ObjectID `bson:"_id"`
    SessionID    uint64             `bson:"session_id"`
    UserID       uint64             `bson:"user_id"`
    
    // 对话记录（压缩存储）
    Messages     []byte             `bson:"messages"`     // MessagePack压缩
    AudioURL     string             `bson:"audio_url"`    // MinIO地址
    
    // 评分（5维度）
    Scores       [5]uint8           `bson:"scores"`       // 5 bytes, 紧凑存储
    TotalScore   uint8              `bson:"total_score"`
    
    // 元数据
    CreatedAt    int64              `bson:"created_at"`
    Duration     uint16             `bson:"duration"`     // 秒
}

// NPC配置（只读，启动时加载到内存）
type NPCConfig struct {
    ID           uint16    `json:"id"`
    Type         uint8     `json:"type"`        // 0:面试官 1:陪跑员
    Style        uint8     `json:"style"`       // 0:严肃 1:友善 2:压力
    Name         string    `json:"name"`
    Avatar       string    `json:"avatar"`
    
    // Prompt模板（预编译）
    SystemPrompt string    `json:"system_prompt"`
    
    // 动画资源（预加载URL）
    Animations   []string  `json:"animations"`
}

// 任务（内存中高效查找）
type Task struct {
    ID           uint32    `json:"id"`          // 使用uint32而非string ID
    Type         uint8     `json:"type"`        // 0:日常 1:周常 2:成就
    Reward       uint16    `json:"reward"`      // 武力值奖励
    Condition    uint32    `json:"condition"`   // 条件编码
    
    // 位图索引（快速查找）
    Tags         uint16    `json:"tags"`        // 位图: bit0=新手, bit1=高级...
}
```

### 4.2 数据库Schema（性能优化）

```sql
-- 用户表（主表，热数据）
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    power           SMALLINT NOT NULL DEFAULT 0,
    mood            SMALLINT NOT NULL DEFAULT 50,
    hp              SMALLINT NOT NULL DEFAULT 100,
    wins            INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引策略
CREATE INDEX idx_users_last_active ON users(last_active_at DESC);  -- 活跃用户查询
CREATE INDEX idx_users_power ON users(power DESC);                  -- 排行榜

-- 分区策略（按时间分区）
CREATE TABLE interview_sessions (
    id              BIGSERIAL,
    user_id         BIGINT NOT NULL,
    status          SMALLINT NOT NULL,
    type            SMALLINT NOT NULL,
    npc_id          INTEGER NOT NULL,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ,
    turn_count      INTEGER DEFAULT 0,
    stress_level    SMALLINT DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- 月度分区
CREATE TABLE interview_sessions_202603 PARTITION OF interview_sessions
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- 索引（每个分区自动继承）
CREATE INDEX idx_sessions_user ON interview_sessions(user_id);
CREATE INDEX idx_sessions_status ON interview_sessions(status);
```

### 4.3 Redis数据结构

```
# 用户热数据（Hash，O(1)访问）
user:{id} -> {power, mood, hp, wins}

# 在线用户集合（Sorted Set，按活跃时间排序）
online_users -> {user_id: timestamp}

# 面试房间（Hash，面试期间存在）
interview:{session_id} -> {user_id, status, turn, stress}

# WebSocket连接映射（Hash）
ws:conn:{conn_id} -> {user_id, session_id}

# 消息队列（List，LPUSH/RPOP）
msg:queue:{user_id} -> [message1, message2, ...]

# 分布式锁（String + TTL）
lock:interview:{session_id} -> {owner_id, expire_at}

# 限流器（Sorted Set，滑动窗口）
ratelimit:{user_id}:{action} -> {timestamp: 1}

# 题目缓存（Hash，按类型分组）
questions:{type} -> {id: content, ...}

# NPC配置缓存（Hash，全量加载）
npc:configs -> {id: config_json, ...}
```

### 4.4 内存数据结构优化

```go
// 对象池（减少GC压力）
var (
    sessionPool = sync.Pool{
        New: func() interface{} {
            return &InterviewSession{
                audioBuffer:  ring.New(1024 * 1024), // 1MB环形缓冲
                messageQueue: queue.NewLockFree(1024),
            }
        },
    }
    
    messagePool = sync.Pool{
        New: func() interface{} {
            return &Message{
                Data: make([]byte, 0, 4096), // 预分配4KB
            }
        },
    }
)

// 字符串Intern（减少重复字符串内存）
var stringIntern = sync.Map{}

func intern(s string) string {
    if v, ok := stringIntern.Load(s); ok {
        return v.(string)
    }
    stringIntern.Store(s, s)
    return s
}

// 位图索引（快速标签查询）
type BitSet struct {
    data []uint64
}

func (b *BitSet) Set(i int) {
    b.data[i/64] |= 1 << (i % 64)
}

func (b *BitSet) Has(i int) bool {
    return b.data[i/64]&(1<<(i%64)) != 0
}

// 使用位图存储用户完成任务状态
// user:tasks:{user_id} -> BitSet (每个bit代表一个任务)
```

---

## 5. 并发模型

### 5.1 Goroutine模型

```go
// WebSocket连接处理
func (s *Server) handleWebSocket(conn *websocket.Conn) {
    // 每个连接一个Goroutine读取
    go func() {
        defer conn.Close()
        
        // 读缓冲区复用
        buf := bufferPool.Get().([]byte)
        defer bufferPool.Put(buf)
        
        for {
            n, err := conn.Read(buf)
            if err != nil {
                return
            }
            
            // 零拷贝消息处理
            msg := buf[:n]
            
            // 投递到工作池（避免阻塞读Goroutine）
            s.msgCh <- msg
        }
    }()
    
    // 写Goroutine（独立，避免读写互斥）
    go func() {
        defer conn.Close()
        
        for msg := range s.writeCh {
            conn.WriteMessage(websocket.BinaryMessage, msg)
        }
    }()
}

// 工作池模式（控制并发度）
type WorkerPool struct {
    workers   int
    taskQueue chan func()
}

func (p *WorkerPool) Start() {
    for i := 0; i < p.workers; i++ {
        go func() {
            for task := range p.taskQueue {
                task()
            }
        }()
    }
}

// 使用
pool := &WorkerPool{
    workers:   runtime.NumCPU() * 2,  // CPU核心数 * 2
    taskQueue: make(chan func(), 10000),
}

// AI推理任务投递
pool.Submit(func() {
    result := llmClient.StreamGenerate(ctx, prompt)
    // 推送结果
    wsConn.WriteJSON(result)
})
```

### 5.2 无锁数据结构

```go
// 无锁队列（面试消息队列）
type LockFreeQueue struct {
    head unsafe.Pointer
    tail unsafe.Pointer
}

type node struct {
    value interface{}
    next  unsafe.Pointer
}

func (q *LockFreeQueue) Enqueue(v interface{}) {
    n := &node{value: v}
    for {
        tail := atomic.LoadPointer(&q.tail)
        next := atomic.LoadPointer(&(*node)(tail).next)
        if next == nil {
            if atomic.CompareAndSwapPointer(&(*node)(tail).next, next, unsafe.Pointer(n)) {
                atomic.CompareAndSwapPointer(&q.tail, tail, unsafe.Pointer(n))
                return
            }
        } else {
            atomic.CompareAndSwapPointer(&q.tail, tail, next)
        }
    }
}

// 原子计数器（高性能统计）
type AtomicCounter struct {
    counters [256]uint64 // 伪共享优化，每个CPU核心独立计数器
    pad      [256 * 8]byte
}

func (c *AtomicCounter) Inc() {
    idx := goroutineID() % 256
    atomic.AddUint64(&c.counters[idx], 1)
}

func (c *AtomicCounter) Get() uint64 {
    var total uint64
    for i := range c.counters {
        total += atomic.LoadUint64(&c.counters[i])
    }
    return total
}
```

### 5.3 连接池管理

```go
// Redis连接池
var redisPool = &redis.Pool{
    MaxIdle:     100,
    MaxActive:   200,
    IdleTimeout: 300 * time.Second,
    Dial: func() (redis.Conn, error) {
        return redis.Dial("tcp", "redis:6379",
            redis.DialConnectTimeout(100*time.Millisecond),
            redis.DialReadTimeout(200*time.Millisecond),
            redis.DialWriteTimeout(200*time.Millisecond),
        )
    },
}

// HTTP客户端连接池
var httpClient = &http.Client{
    Transport: &http.Transport{
        MaxIdleConns:        1000,
        MaxIdleConnsPerHost: 100,
        IdleConnTimeout:     90 * time.Second,
        DialContext: (&net.Dialer{
            Timeout:   100 * time.Millisecond,
            KeepAlive: 30 * time.Second,
        }).DialContext,
    },
    Timeout: 5 * time.Second,
}

// gRPC连接池（长连接复用）
var grpcConnPool = map[string]*grpc.ClientConn{}

func getGRPCConn(target string) *grpc.ClientConn {
    if conn, ok := grpcConnPool[target]; ok {
        return conn
    }
    
    conn, _ := grpc.Dial(target,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithDefaultCallOptions(
            grpc.MaxCallRecvMsgSize(10*1024*1024),
            grpc.MaxCallSendMsgSize(10*1024*1024),
        ),
        grpc.WithKeepaliveParams(keepalive.ClientParameters{
            Time:                30 * time.Second,
            Timeout:             10 * time.Second,
            PermitWithoutStream: true,
        }),
    )
    
    grpcConnPool[target] = conn
    return conn
}
```

### 5.4 并发限流

```go
// 令牌桶限流器
type TokenBucket struct {
    rate       float64       // 每秒产生令牌数
    capacity   float64       // 桶容量
    tokens     float64       // 当前令牌数
    lastUpdate int64         // 上次更新时间戳（纳秒）
    mu         sync.Mutex
}

func (tb *TokenBucket) Allow() bool {
    tb.mu.Lock()
    defer tb.mu.Unlock()
    
    now := time.Now().UnixNano()
    elapsed := float64(now-tb.lastUpdate) / 1e9
    tb.tokens = min(tb.capacity, tb.tokens+elapsed*tb.rate)
    tb.lastUpdate = now
    
    if tb.tokens >= 1 {
        tb.tokens--
        return true
    }
    return false
}

// 分布式限流（Redis + Lua脚本）
const rateLimitScript = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window * 1000)
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, now)
    redis.call('PEXPIRE', key, window * 1000)
    return 1
end
return 0
`

func (r *RedisRateLimiter) Allow(ctx context.Context, key string, limit int, window time.Duration) bool {
    now := time.Now().UnixMilli()
    result, _ := r.client.Eval(ctx, rateLimitScript, []string{key}, limit, window.Seconds(), now).Int()
    return result == 1
}

// 使用：每用户每分钟最多10次面试
if !rateLimiter.Allow(ctx, fmt.Sprintf("interview:%d", userID), 10, time.Minute) {
    return errors.New("rate limit exceeded")
}
```

---

## 6. 性能优化策略

### 6.1 缓存策略

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  多级缓存架构                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              L1 进程内缓存                                        │   │
│   │                                                                                  │   │
│   │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                       │   │
│   │   │   bigcache   │    │  sync.Map    │    │   对象池     │                       │   │
│   │   │  (热点数据)  │    │  (配置数据)  │    │  (频繁创建)  │                       │   │
│   │   │   <1μs      │    │   <100ns     │    │   GC优化     │                       │   │
│   │   └──────────────┘    └──────────────┘    └──────────────┘                       │   │
│   │                                                                                  │   │
│   │   适用场景：                                                                     │   │
│   │   - NPC配置（全量加载）                                                          │   │
│   │   - 题目模板（高频访问）                                                          │   │
│   │   - 用户Session（活跃用户）                                                       │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                               │
│                                        │ 未命中                                        │
│                                        ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              L2 Redis集群缓存                                     │   │
│   │                                                                                  │   │
│   │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                       │   │
│   │   │   Master     │    │   Slave 1    │    │   Slave 2    │                       │   │
│   │   │  (读写)      │───▶│  (只读)      │    │  (只读)      │                       │   │
│   │   └──────────────┘    └──────────────┘    └──────────────┘                       │   │
│   │                                                                                  │   │
│   │   数据分片策略：                                                                 │   │
│   │   - user:{id}      → 按user_id分片                                               │   │
│   │   - interview:{id} → 按session_id分片                                            │   │
│   │   - questions:*    → 独立分片（只读）                                             │   │
│   │                                                                                  │   │
│   │   过期策略：                                                                     │   │
│   │   - 用户热数据：30分钟                                                           │   │
│   │   - Session数据：面试结束即删除                                                   │   │
│   │   - 配置数据：永不过期（手动更新）                                                 │   │
│   │                                                                                  │   │
│   │   访问延迟：< 5ms                                                                │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                               │
│                                        │ 未命中                                        │
│                                        ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              L3 数据库层                                          │   │
│   │                                                                                  │   │
│   │   ┌──────────────┐    ┌──────────────┐                                          │   │
│   │   │  PostgreSQL  │    │   MongoDB    │                                          │   │
│   │   │  (主从复制)  │    │  (分片集群)  │                                          │   │
│   │   └──────────────┘    └──────────────┘                                          │   │
│   │                                                                                  │   │
│   │   优化策略：                                                                     │   │
│   │   - 读写分离                                                                     │   │
│   │   - 索引覆盖                                                                     │   │
│   │   - 分区表                                                                       │   │
│   │   - 连接池                                                                       │   │
│   │                                                                                  │   │
│   │   访问延迟：< 50ms                                                               │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 预加载策略

```go
// 启动时预加载
func (s *Server) Preload() error {
    // 1. NPC配置全量加载到内存
    npcs, _ := s.db.GetAllNPCs()
    for _, npc := range npcs {
        s.npcCache.Store(npc.ID, npc)
    }
    
    // 2. 热门题目预加载到Redis
    questions, _ := s.db.GetHotQuestions(1000)
    pipe := s.redis.Pipeline()
    for _, q := range questions {
        pipe.HSet(ctx, fmt.Sprintf("questions:%d", q.Type), q.ID, q.Content)
    }
    pipe.Exec(ctx)
    
    // 3. 最近活跃用户预加载
    users, _ := s.db.GetRecentActiveUsers(10000)
    for _, u := range users {
        s.redis.HSet(ctx, fmt.Sprintf("user:%d", u.ID), u)
    }
    
    // 4. 动画资源URL预生成签名
    s.animationURLs = s.minio.GenerateSignedURLs(s.animations)
    
    return nil
}

// 智能预取（预测用户下一步操作）
func (s *Server) PredictivePrefetch(userID uint64) {
    // 用户进入面试准备页 → 预加载面试官数据
    go func() {
        npc := s.selectNPC(userID)
        s.redis.WarmUp(fmt.Sprintf("npc:%d", npc.ID))
    }()
    
    // 用户开始面试 → 预加载可能的问题
    go func() {
        questions := s.predictQuestions(userID)
        s.redis.WarmUp(questions...)
    }()
}
```

### 6.3 音频流优化

```go
// 音频分片流式传输
type AudioStreamer struct {
    chunkSize int // 100ms
    buffer    *ring.Buffer
}

func (s *AudioStreamer) Stream(audio []byte, callback func([]byte)) {
    // 分片发送，避免大包阻塞
    for i := 0; i < len(audio); i += s.chunkSize {
        end := i + s.chunkSize
        if end > len(audio) {
            end = len(audio)
        }
        callback(audio[i:end])
        
        // 控制发送速率
        time.Sleep(100 * time.Millisecond)
    }
}

// 客户端：Web Audio API零延迟播放
const AudioContextConfig = `
const audioContext = new AudioContext({
    sampleRate: 16000,
    latencyHint: 'interactive'  // 最低延迟
});

// AudioWorklet处理（独立线程）
audioContext.audioWorklet.addModule('audio-processor.js');

class AudioProcessor extends AudioWorkletProcessor {
    process(inputs, outputs) {
        const output = outputs[0];
        const input = inputs[0];
        
        // 直接拷贝，无主线程通信
        output[0].set(input[0]);
        
        return true;
    }
}
registerProcessor('audio-processor', AudioProcessor);
`;

// Lip Sync实时同步（客户端计算）
const LipSyncAlgo = `
// 音量实时计算
function calculateVolume(audioData) {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
        sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
}

// 映射到嘴型帧
function volumeToFrame(volume) {
    // 0-1 归一化 → 0-5 帧索引
    return Math.floor(volume * 5);
}

// 实时更新（60fps）
function animate() {
    analyser.getFloatTimeDomainData(dataArray);
    const volume = calculateVolume(dataArray);
    const frame = volumeToFrame(volume);
    updateMouthFrame(frame);
    requestAnimationFrame(animate);
}
`;
```

### 6.4 数据库优化

```sql
-- 读写分离
-- 写操作：主库
INSERT INTO users (power, mood, hp) VALUES (0, 50, 100);

-- 读操作：从库（自动路由）
SELECT * FROM users WHERE id = 123;

-- 批量插入优化（面试记录）
INSERT INTO interview_records (session_id, user_id, messages, scores)
VALUES 
    (1, 100, '\x...', '\x...'),
    (2, 101, '\x...', '\x...'),
    (3, 102, '\x...', '\x...');

-- 索引覆盖查询
CREATE INDEX idx_users_active_covering ON users(last_active_at DESC) INCLUDE (power, mood, hp);

-- 查询只走索引
SELECT power, mood, hp FROM users ORDER BY last_active_at DESC LIMIT 100;

-- 分区裁剪
EXPLAIN ANALYZE SELECT * FROM interview_sessions 
WHERE created_at >= '2026-03-01' AND created_at < '2026-04-01';
-- 只扫描 interview_sessions_202603 分区
```

### 6.5 网络优化

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  网络传输优化                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              HTTP/2 + Server Push                                 │   │
│   │                                                                                  │   │
│   │   客户端请求 index.html                                                          │   │
│   │       │                                                                          │   │
│   │       ▼                                                                          │   │
│   │   服务器主动推送：                                                                │   │
│   │   - main.js (缓存)                                                               │   │
│   │   - main.css (缓存)                                                              │   │
│   │   - npc-config.json (预热)                                                       │   │
│   │   - sprite.png (像素动画)                                                         │   │
│   │                                                                                  │   │
│   │   减少RTT，首屏加载快30%                                                          │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              数据压缩                                             │   │
│   │                                                                                  │   │
│   │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                       │   │
│   │   │   Gzip       │    │   Brotli     │    │   MessagePack│                       │   │
│   │   │  (文本资源)  │    │  (比Gzip快   │    │  (二进制)    │                       │   │
│   │   │  压缩率70%   │    │  20%，解压   │    │  比JSON小    │                       │   │
│   │   │              │    │  快2倍)      │    │  50%)        │                       │   │
│   │   └──────────────┘    └──────────────┘    └──────────────┘                       │   │
│   │                                                                                  │   │
│   │   配置：                                                                         │   │
│   │   - JS/CSS/JSON: Brotli (level 11)                                              │   │
│   │   - WebSocket消息: MessagePack                                                   │   │
│   │   - 静态资源: Gzip (level 6, CPU与压缩率平衡)                                      │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              CDN加速                                              │   │
│   │                                                                                  │   │
│   │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                       │   │
│   │   │   静态资源   │    │   API加速    │    │   图片优化   │                       │   │
│   │   │  (全球节点)  │    │  (边缘计算)  │    │  (WebP/AVIF) │                       │   │
│   │   │  延迟<50ms   │    │  缓存热点API │    │  体积减小70% │                       │   │
│   │   └──────────────┘    └──────────────┘    └──────────────┘                       │   │
│   │                                                                                  │   │
│   │   缓存策略：                                                                     │   │
│   │   - 像素动画: Cache-Control: max-age=31536000, immutable                        │   │
│   │   - NPC配置: Cache-Control: max-age=3600, stale-while-revalidate=86400         │   │
│   │   - 用户数据: Cache-Control: no-cache (必须验证)                                  │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. 性能指标预估

### 7.1 接口性能目标

| 接口 | P50 | P90 | P99 | QPS | 说明 |
|------|-----|-----|-----|-----|------|
| POST /api/auth/login | 20ms | 50ms | 100ms | 1000 | 缓存token |
| GET /api/user/profile | 5ms | 15ms | 30ms | 5000 | Redis缓存 |
| POST /api/interview/start | 50ms | 100ms | 200ms | 500 | 含NPC选择 |
| WebSocket消息 | 10ms | 30ms | 50ms | 10000 | 实时通信 |
| POST /api/pixel/generate | 200ms | 500ms | 1000ms | 100 | 异步任务 |
| GET /api/questions | 10ms | 20ms | 50ms | 2000 | Redis缓存 |
| POST /api/interview/end | 100ms | 200ms | 500ms | 500 | 含评分 |

### 7.2 系统容量预估

| 指标 | 目标值 | 说明 |
|------|--------|------|
| DAU | 10万 | 日活用户 |
| 并发在线 | 1万 | 同时在线 |
| 并发面试 | 1000 | 同时面试中 |
| 日面试次数 | 5万 | 每日面试总数 |
| 存储量 | 100TB | 音频+图片+数据 |
| 带宽 | 10Gbps | 峰值带宽 |

### 7.3 资源配置

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  生产环境资源配置                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              接入层 (3节点)                                       │   │
│   │                                                                                  │   │
│   │   Nginx/Envoy: 4C8G × 3                                                         │   │
│   │   - CPU: 4核                                                                    │   │
│   │   - 内存: 8GB                                                                   │   │
│   │   - 带宽: 1Gbps                                                                 │   │
│   │   - 预估QPS: 30000/节点                                                         │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              WebSocket集群 (5节点)                                │   │
│   │                                                                                  │   │
│   │   Go WS Server: 8C16G × 5                                                       │   │
│   │   - CPU: 8核                                                                    │   │
│   │   - 内存: 16GB                                                                  │   │
│   │   - 连接数: 50000/节点                                                          │   │
│   │   - 总连接: 250000                                                              │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              API服务集群 (10节点)                                 │   │
│   │                                                                                  │   │
│   │   Go API Server: 4C8G × 10                                                      │   │
│   │   - CPU: 4核                                                                    │   │
│   │   - 内存: 8GB                                                                   │   │
│   │   - QPS: 5000/节点                                                              │   │
│   │   - 总QPS: 50000                                                                │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              异步Worker集群 (弹性伸缩)                            │   │
│   │                                                                                  │   │
│   │   像素生成: GPU实例 × 2 (按需扩容)                                               │   │
│   │   - GPU: NVIDIA T4                                                              │   │
│   │   - CPU: 8核                                                                    │   │
│   │   - 内存: 32GB                                                                  │   │
│   │                                                                                  │   │
│   │   AI推理: GPU实例 × 5 (按需扩容)                                                 │   │
│   │   - GPU: NVIDIA A10                                                             │   │
│   │   - CPU: 16核                                                                   │   │
│   │   - 内存: 64GB                                                                  │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              数据库集群                                           │   │
│   │                                                                                  │   │
│   │   PostgreSQL: 16C64G × 3 (1主2从)                                               │   │
│   │   - CPU: 16核                                                                   │   │
│   │   - 内存: 64GB                                                                  │   │
│   │   - 存储: NVMe SSD 2TB                                                          │   │
│   │   - QPS: 20000 (读写分离后)                                                      │   │
│   │                                                                                  │   │
│   │   MongoDB: 8C32G × 3 (分片集群)                                                  │   │
│   │   - CPU: 8核                                                                    │   │
│   │   - 内存: 32GB                                                                  │   │
│   │   - 存储: NVMe SSD 4TB                                                          │   │
│   │                                                                                  │   │
│   │   Redis Cluster: 8C32G × 6 (3主3从)                                             │   │
│   │   - CPU: 8核                                                                    │   │
│   │   - 内存: 32GB                                                                  │   │
│   │   - QPS: 100000+                                                                │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              对象存储                                             │   │
│   │                                                                                  │   │
│   │   MinIO: 分布式集群                                                             │   │
│   │   - 节点: 4 × 8C16G + 10TB NVMe                                                 │   │
│   │   - 总容量: 40TB                                                                │   │
│   │   - 吞吐: 10Gbps+                                                               │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 7.4 成本估算

| 资源 | 月成本 (国内) | 月成本 (海外) | 说明 |
|------|--------------|--------------|------|
| 接入层 | ¥2,000 | $300 | 阿里云SLB / AWS ALB |
| WS集群 | ¥8,000 | $1,200 | 按需实例 |
| API集群 | ¥10,000 | $1,500 | 按需实例 |
| 数据库 | ¥15,000 | $2,500 | RDS + Redis |
| 对象存储 | ¥3,000 | $500 | OSS / S3 |
| CDN | ¥5,000 | $800 | 流量费 |
| AI服务 | ¥20,000 | $3,000 | LLM + ASR + TTS |
| **总计** | **¥63,000** | **$9,800** | 约 $9K/月 |

---

## 8. 已知权衡

### 8.1 性能 vs 可维护性

| 决策 | 性能收益 | 可维护性损失 | 缓解措施 |
|------|----------|-------------|----------|
| 无锁数据结构 | 延迟降低50% | 代码复杂度高 | 详细注释 + 单元测试 |
| 对象池 | GC停顿降低80% | 内存泄漏风险 | 泄漏检测 + 压测 |
| Protobuf序列化 | 吞吐提升5倍 | 调试困难 | 开发环境用JSON |
| 分库分表 | QPS提升10倍 | 查询复杂 | 中间件封装 |

### 8.2 性能 vs 开发效率

| 决策 | 性能收益 | 开发效率损失 | 缓解措施 |
|------|----------|-------------|----------|
| Go + Rust混用 | 关键路径快30% | 学习成本高 | Rust只用于热点 |
| 自研WebSocket框架 | 内存降低50% | 维护成本高 | 参考成熟实现 |
| 手动内存管理 | GC停顿降低 | 开发慢 | 局部使用 |

### 8.3 性能 vs 功能完整性

| 决策 | 性能收益 | 功能损失 | 缓解措施 |
|------|----------|---------|----------|
| 异步任务处理 | API响应快 | 实时性降低 | WebSocket推送结果 |
| 边录边传 | 内存降低 | 断线丢数据 | 本地缓存兜底 |
| 预加载题目 | 响应快 | 动态性降低 | 定时刷新缓存 |

---

## 9. 接口定义

### 9.1 API规范

- **协议**: HTTPS (REST)
- **认证**: Bearer Token (JWT)
- **格式**: JSON (外部) / MessagePack (WebSocket)
- **版本**: URL前缀 `/api/v1/`
- **编码**: UTF-8

### 9.2 认证接口

#### POST /api/v1/auth/login

```json
// Request
{
  "phone": "13800138000",
  "code": "123456"
}

// Response 200
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": 1711449600,
    "user": {
      "id": 10001,
      "power": 0,
      "mood": 50,
      "hp": 100,
      "wins": 0
    }
  }
}

// Response 400
{
  "code": 40001,
  "message": "验证码错误"
}
```

#### POST /api/v1/auth/send-code

```json
// Request
{
  "phone": "13800138000",
  "type": "login"
}

// Response 200
{
  "code": 0,
  "data": {
    "expires_in": 300
  }
}
```

### 9.3 用户接口

#### GET /api/v1/user/profile

```json
// Response 200
{
  "code": 0,
  "data": {
    "id": 10001,
    "nickname": "面试达人",
    "avatar": "https://cdn.example.com/avatar/10001.png",
    "power": 85,
    "mood": 70,
    "hp": 90,
    "wins": 12,
    "pixel_avatar": {
      "sprite_url": "https://cdn.example.com/pixel/10001.png",
      "animations": {
        "idle": "https://cdn.example.com/pixel/10001/idle.png",
        "talk": "https://cdn.example.com/pixel/10001/talk.png",
        "listen": "https://cdn.example.com/pixel/10001/listen.png"
      }
    },
    "created_at": 1711449600,
    "last_active_at": 1711453200
  }
}
```

#### PUT /api/v1/user/profile

```json
// Request
{
  "nickname": "面试达人",
  "avatar": "https://cdn.example.com/avatar/new.png"
}

// Response 200
{
  "code": 0,
  "data": {
    "id": 10001,
    "nickname": "面试达人",
    "avatar": "https://cdn.example.com/avatar/new.png"
  }
}
```

#### GET /api/v1/user/stats

```json
// Response 200
{
  "code": 0,
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

### 9.4 面试接口

#### POST /api/v1/interview/start

```json
// Request
{
  "type": 0,  // 0:行为面 1:技术面 2:HR面
  "npc_id": 1,
  "difficulty": 1  // 0:简单 1:中等 2:困难
}

// Response 200
{
  "code": 0,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "ws_url": "wss://ws.example.com/interview/550e8400-e29b-41d4-a716-446655440000",
    "npc": {
      "id": 1,
      "name": "王面试官",
      "avatar": "https://cdn.example.com/npc/1.png",
      "style": 0
    },
    "expires_at": 1711456800
  }
}
```

#### GET /api/v1/interview/{session_id}

```json
// Response 200
{
  "code": 0,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": 1,  // 0:待开始 1:进行中 2:已结束 3:已取消
    "type": 0,
    "npc": {
      "id": 1,
      "name": "王面试官",
      "avatar": "https://cdn.example.com/npc/1.png"
    },
    "turn_count": 5,
    "stress_level": 30,
    "start_time": 1711453200,
    "duration": 600
  }
}
```

#### POST /api/v1/interview/{session_id}/end

```json
// Response 200
{
  "code": 0,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "duration": 600,
    "scores": {
      "expression": 85,
      "logic": 80,
      "professional": 90,
      "adaptability": 75,
      "emotion": 70
    },
    "total_score": 80,
    "power_gained": 5,
    "mood_change": 10,
    "achievements": [
      {
        "id": 1,
        "name": "初出茅庐",
        "description": "完成第一次面试"
      }
    ],
    "report_url": "https://cdn.example.com/report/550e8400-e29b-41d4-a716-446655440000.pdf"
  }
}
```

#### GET /api/v1/interview/{session_id}/report

```json
// Response 200
{
  "code": 0,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "scores": {
      "expression": {
        "score": 85,
        "feedback": "表达清晰，逻辑性强，但语速稍快"
      },
      "logic": {
        "score": 80,
        "feedback": "思路清晰，但部分论点缺乏支撑"
      },
      "professional": {
        "score": 90,
        "feedback": "专业知识扎实，回答准确"
      },
      "adaptability": {
        "score": 75,
        "feedback": "应对能力良好，但压力面表现稍弱"
      },
      "emotion": {
        "score": 70,
        "feedback": "整体情绪稳定，但在难题面前略显紧张"
      }
    },
    "total_score": 80,
    "highlights": [
      "专业知识扎实，回答准确",
      "表达清晰，逻辑性强"
    ],
    "improvements": [
      "建议放慢语速，给思考留出时间",
      "可以准备更多案例支撑论点",
      "压力面试场景需要更多练习"
    ],
    "messages": [
      {
        "role": "npc",
        "content": "请做一个简单的自我介绍",
        "timestamp": 1711453200
      },
      {
        "role": "user",
        "content": "您好，我叫...",
        "timestamp": 1711453210,
        "audio_url": "https://cdn.example.com/audio/xxx.mp3"
      }
    ],
    "audio_url": "https://cdn.example.com/audio/550e8400-e29b-41d4-a716-446655440000.mp3"
  }
}
```

### 9.5 WebSocket协议

#### 连接

```
wss://ws.example.com/interview/{session_id}?token={jwt_token}
```

#### 消息格式（MessagePack二进制）

```typescript
// 消息结构
interface WSMessage {
  type: uint8;        // 消息类型
  seq: uint32;        // 序列号（递增）
  timestamp: uint64;  // 时间戳（毫秒）
  payload: bytes;     // 载荷（根据类型解析）
}

// 消息类型
enum MessageType {
  AUDIO_DATA = 0;        // 音频数据（用户说话）
  AUDIO_END = 1;         // 音频结束标记
  NPC_TEXT = 2;          // NPC文本（AI回复）
  NPC_AUDIO = 3;         // NPC音频（流式）
  STRESS_UPDATE = 4;     // 压力值更新
  TURN_UPDATE = 5;       // 轮次更新
  ERROR = 6;             // 错误消息
  HEARTBEAT = 7;         // 心跳
}
```

#### 音频上传

```typescript
// 客户端发送音频切片（每100ms一片）
{
  type: 0,
  seq: 1,
  timestamp: 1711453200000,
  payload: <binary audio data>  // 16kHz, 16bit, mono PCM
}

// 音频结束标记
{
  type: 1,
  seq: 10,
  timestamp: 171453210000,
  payload: <empty>
}
```

#### NPC回复（流式）

```typescript
// NPC文本（流式token）
{
  type: 2,
  seq: 100,
  timestamp: 171453210000,
  payload: {
    text: "请",        // 单个token
    is_final: false,   // 是否最后一个token
    turn: 2            // 当前轮次
  }
}

// NPC音频（流式，配合文本）
{
  type: 3,
  seq: 101,
  timestamp: 171453210100,
  payload: <binary audio chunk>  // 音频切片
}
```

#### 状态更新

```typescript
// 压力值更新
{
  type: 4,
  seq: 200,
  timestamp: 171453215000,
  payload: {
    stress_level: 45
  }
}

// 轮次更新
{
  type: 5,
  seq: 201,
  timestamp: 171453220000,
  payload: {
    turn: 3,
    is_user_turn: true
  }
}
```

#### 错误消息

```typescript
{
  type: 6,
  seq: 0,
  timestamp: 171453230000,
  payload: {
    code: 50001,
    message: "ASR服务暂时不可用",
    retry_after: 5
  }
}
```

#### 心跳

```typescript
// 客户端发送（每30s）
{
  type: 7,
  seq: 1000,
  timestamp: 171453240000,
  payload: <empty>
}

// 服务端响应
{
  type: 7,
  seq: 1000,
  timestamp: 171453240100,
  payload: <empty>
}
```

### 9.6 像素小人生成接口

#### POST /api/v1/pixel/generate

```json
// Request
{
  "photo_url": "https://cdn.example.com/upload/xxx.jpg",  // 可选
  "questionnaire": {
    "job_type": "software_engineer",
    "personality": "outgoing",
    "style_preference": "casual"
  }
}

// Response 202 (异步任务)
{
  "code": 0,
  "data": {
    "task_id": "550e8400-e29b-41d4-a716-446655440001",
    "status": "processing",
    "estimated_time": 10
  }
}
```

#### GET /api/v1/pixel/task/{task_id}

```json
// Response 200 (处理中)
{
  "code": 0,
  "data": {
    "task_id": "550e8400-e29b-41d4-a716-446655440001",
    "status": "processing",
    "progress": 60
  }
}

// Response 200 (完成)
{
  "code": 0,
  "data": {
    "task_id": "550e8400-e29b-41d4-a716-446655440001",
    "status": "completed",
    "result": {
      "sprite_url": "https://cdn.example.com/pixel/10001.png",
      "animations": {
        "idle": "https://cdn.example.com/pixel/10001/idle.png",
        "talk": "https://cdn.example.com/pixel/10001/talk.png",
        "listen": "https://cdn.example.com/pixel/10001/listen.png",
        "nod": "https://cdn.example.com/pixel/10001/nod.png",
        "sweat": "https://cdn.example.com/pixel/10001/sweat.png"
      }
    }
  }
}
```

### 9.7 NPC接口

#### GET /api/v1/npc/list

```json
// Response 200
{
  "code": 0,
  "data": {
    "npcs": [
      {
        "id": 1,
        "name": "王面试官",
        "type": 0,  // 0:面试官 1:陪跑员
        "style": 0,  // 0:严肃 1:友善 2:压力
        "avatar": "https://cdn.example.com/npc/1.png",
        "description": "资深HR，注重综合素质",
        "difficulty": 1,
        "unlocked": true
      },
      {
        "id": 2,
        "name": "李技术",
        "type": 0,
        "style": 1,
        "avatar": "https://cdn.example.com/npc/2.png",
        "description": "技术大牛，关注专业能力",
        "difficulty": 2,
        "unlocked": false,
        "unlock_condition": "武力值达到50"
      }
    ]
  }
}
```

#### GET /api/v1/npc/{npc_id}

```json
// Response 200
{
  "code": 0,
  "data": {
    "id": 1,
    "name": "王面试官",
    "type": 0,
    "style": 0,
    "avatar": "https://cdn.example.com/npc/1.png",
    "description": "资深HR，注重综合素质",
    "difficulty": 1,
    "animations": {
      "idle": "https://cdn.example.com/npc/1/idle.png",
      "talk": "https://cdn.example.com/npc/1/talk.png",
      "listen": "https://cdn.example.com/npc/1/listen.png"
    },
    "sample_questions": [
      "请做一个简单的自我介绍",
      "你的优势和劣势是什么？",
      "为什么选择我们公司？"
    ]
  }
}
```

### 9.8 题目接口

#### GET /api/v1/questions

```json
// Query Parameters
// - type: 题目类型 (0:行为面 1:技术面 2:HR面)
// - category: 题目分类 (可选)
// - difficulty: 难度 (可选)
// - page: 页码 (默认1)
// - size: 每页数量 (默认20)

// Response 200
{
  "code": 0,
  "data": {
    "questions": [
      {
        "id": 1,
        "type": 0,
        "category": "self_intro",
        "content": "请做一个简单的自我介绍",
        "difficulty": 0,
        "tags": ["基础", "必考"]
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 100
    }
  }
}
```

#### GET /api/v1/questions/{question_id}

```json
// Response 200
{
  "code": 0,
  "data": {
    "id": 1,
    "type": 0,
    "category": "self_intro",
    "content": "请做一个简单的自我介绍",
    "difficulty": 0,
    "tags": ["基础", "必考"],
    "hints": [
      "时间控制在1-2分钟",
      "突出与岗位相关的经历",
      "避免流水账式罗列"
    ],
    "sample_answer": "您好，我叫XXX，毕业于...",
    "evaluation_criteria": [
      "表达清晰度",
      "逻辑结构",
      "与岗位匹配度"
    ]
  }
}
```

### 9.9 任务接口

#### GET /api/v1/tasks/daily

```json
// Response 200
{
  "code": 0,
  "data": {
    "tasks": [
      {
        "id": 1,
        "type": 0,  // 0:日常 1:周常 2:成就
        "title": "完成一次面试",
        "description": "完成任意类型的一次面试",
        "reward": {
          "power": 5,
          "mood": 10
        },
        "progress": {
          "current": 0,
          "target": 1
        },
        "status": 0  // 0:进行中 1:已完成 2:已领取
      },
      {
        "id": 2,
        "type": 0,
        "title": "获得高分评价",
        "description": "在一次面试中获得80分以上",
        "reward": {
          "power": 10,
          "mood": 15
        },
        "progress": {
          "current": 0,
          "target": 1
        },
        "status": 0
      }
    ],
    "refresh_at": 1711536000
  }
}
```

#### POST /api/v1/tasks/{task_id}/claim

```json
// Response 200
{
  "code": 0,
  "data": {
    "task_id": 1,
    "reward": {
      "power": 5,
      "mood": 10
    },
    "current_stats": {
      "power": 90,
      "mood": 80
    }
  }
}
```

#### GET /api/v1/achievements

```json
// Response 200
{
  "code": 0,
  "data": {
    "achievements": [
      {
        "id": 1,
        "name": "初出茅庐",
        "description": "完成第一次面试",
        "icon": "https://cdn.example.com/achievement/1.png",
        "unlocked": true,
        "unlocked_at": 1711453200
      },
      {
        "id": 2,
        "name": "面试达人",
        "description": "累计完成10次面试",
        "icon": "https://cdn.example.com/achievement/2.png",
        "unlocked": false,
        "progress": {
          "current": 5,
          "target": 10
        }
      }
    ]
  }
}
```

### 9.10 错误码定义

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 40001 | 参数错误 |
| 40002 | 验证码错误 |
| 40003 | Token无效 |
| 40004 | Token过期 |
| 40401 | 资源不存在 |
| 40301 | 无权限访问 |
| 40901 | 资源冲突 |
| 42901 | 请求频率超限 |
| 50001 | 内部服务错误 |
| 50002 | ASR服务错误 |
| 50003 | TTS服务错误 |
| 50004 | LLM服务错误 |
| 50005 | 存储服务错误 |
| 50301 | 服务暂时不可用 |
| 50302 | 系统维护中 |

---

## 10. 风险点

### 10.1 性能风险

| 风险 | 级别 | 影响 | 应对 |
|------|------|------|------|
| LLM首字延迟不稳定 | 高 | 面试体验差 | 流式输出 + 预测预加载 |
| WebSocket连接数突增 | 高 | 服务崩溃 | 限流 + 弹性伸缩 |
| Redis缓存雪崩 | 高 | 数据库压力暴增 | 多级缓存 + 熔断 |
| 音频流带宽占用大 | 中 | 成本增加 | 压缩 + 边缘计算 |
| 对象池内存泄漏 | 中 | OOM | 定期检查 + 压测 |

### 10.2 技术风险

| 风险 | 级别 | 影响 | 应对 |
|------|------|------|------|
| 第三方AI服务不稳定 | 高 | 核心功能不可用 | 多供应商 + 本地模型降级 |
| 并发Bug难以复现 | 高 | 线上事故 | 压测 + 混沌工程 |
| 无锁数据结构Bug | 高 | 数据竞争 | 单元测试 + 代码审查 |
| 分库分表查询慢 | 中 | 用户体验差 | 中间件优化 + 查询重写 |

### 10.3 成本风险

| 风险 | 级别 | 影响 | 应对 |
|------|------|------|------|
| AI API调用成本高 | 高 | 利润率低 | 缓存常见问答 + 批量调用 |
| GPU资源浪费 | 中 | 成本增加 | 按需伸缩 + 抢占式实例 |
| CDN流量成本 | 中 | 成本增加 | 缓存策略优化 + P2P |

### 10.4 监控与告警

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  监控体系                                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              基础设施监控                                        │   │
│   │                                                                                  │   │
│   │   Prometheus + Grafana                                                          │   │
│   │   - CPU使用率 > 80% (告警)                                                       │   │
│   │   - 内存使用率 > 85% (告警)                                                       │   │
│   │   - 磁盘IO > 90% (告警)                                                          │   │
│   │   - 网络延迟 > 100ms (告警)                                                       │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              应用性能监控 (APM)                                   │   │
│   │                                                                                  │   │
│   │   Jaeger / SkyWalking                                                           │   │
│   │   - API P99延迟 > 100ms (告警)                                                   │   │
│   │   - 错误率 > 1% (告警)                                                           │   │
│   │   - WebSocket断连率 > 5% (告警)                                                  │   │
│   │   - 全链路追踪                                                                   │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              业务指标监控                                         │   │
│   │                                                                                  │   │
│   │   ClickHouse + Grafana                                                          │   │
│   │   - DAU/MAU                                                                     │   │
│   │   - 面试完成率 < 30% (告警)                                                       │   │
│   │   - 平均面试时长                                                                 │   │
│   │   - 平均评分                                                                     │   │
│   │   - 用户流失率 > 10% (告警)                                                       │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              AI服务监控                                           │   │
│   │                                                                                  │   │
│   │   自研监控面板                                                                   │   │
│   │   - LLM首字延迟 > 2s (告警)                                                      │   │
│   │   - ASR错误率 > 5% (告警)                                                        │   │
│   │   - TTS生成失败率 > 3% (告警)                                                    │   │
│   │   - API调用成本（实时）                                                          │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 附录

### A. 技术名词解释

| 术语 | 说明 |
|------|------|
| QPS | 每秒查询数 (Queries Per Second) |
| P99 | 99%的请求响应时间在此值以下 |
| WebSocket | 全双工通信协议，适合实时场景 |
| gRPC | 高性能RPC框架，使用Protobuf序列化 |
| ASR | 自动语音识别 (Automatic Speech Recognition) |
| TTS | 文本转语音 (Text to Speech) |
| Lip Sync | 嘴型同步，根据语音驱动动画 |
| VAD | 语音活动检测 (Voice Activity Detection) |
| GC | 垃圾回收 (Garbage Collection) |
| CDN | 内容分发网络 (Content Delivery Network) |
| LRU | 最近最少使用缓存淘汰算法 |

### B. 参考资料

1. [Go高性能编程](https://github.com/dgryski/go-perfbook)
2. [WebSocket协议规范 RFC 6455](https://tools.ietf.org/html/rfc6455)
3. [PostgreSQL性能优化](https://www.postgresql.org/docs/current/performance-tips.html)
4. [Redis集群规范](https://redis.io/topics/cluster-spec)
5. [Web Audio API规范](https://www.w3.org/TR/webaudio/)

---

*文档版本: v1.0*
*更新时间: 2026-03-26*
*作者: 性能狂人*
