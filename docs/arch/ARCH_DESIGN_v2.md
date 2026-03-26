# 架构设计文档 v2.0

> 设计理念：**安全优先、稳定为王、可维护性第一**

---

## 1. 核心设计理念

### 1.1 三大原则

| 原则 | 含义 | 权衡取舍 |
|------|------|---------|
| **安全优先** | 用户数据保护、服务可用性高于一切 | 可牺牲部分性能换取安全边界 |
| **稳定为王** | 宁可降级不可崩溃，优雅失败优于硬性报错 | 可牺牲新功能上线速度 |
| **可维护性第一** | 代码清晰、文档完整、监控健全 | 可牺牲开发效率换取长期维护成本降低 |

### 1.2 设计决策依据

```
              安全性
                ▲
               /|\
              / | \
             /  |  \
    可维护性 <--+--> 稳定性
             \  |  /
              \ | /
               \|/
                ▼
              性能（次要）
```

---

## 2. 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户层 (Client)                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Web Browser│  │ iOS App     │  │ Android App │  │ 小程序       │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼───────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         接入层 (Gateway) [容错点1]                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  API Gateway (Kong/Nginx)                                             │  │
│  │  ├── 限流控制 (Rate Limiting)                                         │  │
│  │  ├── 请求鉴权 (JWT验证)                                               │  │
│  │  ├── 请求日志 (Audit Log)                                             │  │
│  │  └── 熔断降级 (Circuit Breaker)                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              ↓ HTTPS Only                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         服务层 (Microservices)                               │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ 用户服务      │  │ 面试服务      │  │ 像素服务      │  │ 任务服务      │   │
│  │ [容错点2]     │  │ [容错点3]     │  │ [容错点4]     │  │ [容错点5]     │   │
│  │              │  │              │  │              │  │              │   │
│  │ ├── 注册/登录 │  │ ├── ASR语音  │  │ ├── 问卷生成 │  │ ├── 每日任务  │   │
│  │ ├── 认证鉴权 │  │ ├── LLM对话  │  │ ├── 照片生成 │  │ ├── 成就系统  │   │
│  │ ├── 属性管理 │  │ ├── TTS合成  │  │ ├── 动画管理 │  │ └── 奖励发放  │   │
│  │ └── 画像存储 │  │ └── 评分系统 │  │ └── 精灵图CDN│  │              │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │                 │            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│  │ NPC服务      │  │ 支付服务      │  │ 内容服务      │                     │
│  │ [容错点6]     │  │ [容错点7]     │  │ [容错点8]     │                     │
│  │              │  │              │  │              │                     │
│  │ ├── 面试官   │  │ ├── 订单管理 │  │ ├── 题库管理 │                     │
│  │ ├── 陪跑员   │  │ ├── 支付回调 │  │ ├── JD解析   │                     │
│  │ └── 其他NPC │  │ └── 会员权益 │  │ └── 黑话词典 │                     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                     │
└─────────┼──────────────────┼──────────────────┼──────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         数据层 (Data Layer) [容错点9]                        │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ PostgreSQL   │  │ Redis Cluster│  │ OSS/S3       │  │ Elasticsearch│   │
│  │ (主数据)     │  │ (缓存/会话)  │  │ (文件存储)   │  │ (搜索/日志)  │   │
│  │              │  │              │  │              │  │              │   │
│  │ ├── 主从复制 │  │ ├── 哨兵模式 │  │ ├── 多区域   │  │ ├── 集群部署 │   │
│  │ ├── 定时备份 │  │ ├── 持久化   │  │ └── CDN加速 │  │ └── 索引优化 │   │
│  │ └── 加密存储 │  │ └── 集群分片 │  │              │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         外部服务层 (External Services) [容错点10]            │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ LLM服务商    │  │ ASR/TTS服务  │  │ 像素生成API  │  │ 支付网关     │   │
│  │              │  │              │  │              │  │              │   │
│  │ ├── 通义千问 │  │ ├── 阿里云   │  │ ├── Seedance │  │ ├── 微信支付 │   │
│  │ ├── 文心一言 │  │ ├── 讯飞     │  │ └── 备用方案 │  │ ├── 支付宝   │   │
│  │ └── 备用GPT  │  │ └── 腾讯云   │  │              │  │ └── Stripe   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  服务降级策略：                                                       │  │
│  │  ├── LLM不可用 --> 切换备用服务商 / 返回预设回复                      │  │
│  │  ├── ASR不可用 --> 提示用户文字输入                                   │  │
│  │  ├── TTS不可用 --> 文字模式运行                                       │  │
│  │  └── 像素生成不可用 --> 使用预设模板                                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         基础设施层 (Infrastructure)                          │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Kubernetes   │  │ 监控告警     │  │ 日志中心     │  │ 配置中心     │   │
│  │ (容器编排)   │  │ (Prometheus) │  │ (ELK)        │  │ (Nacos)      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

图例：
[容错点N] = 该模块实现了熔断、重试、降级机制
--->      = 同步调用（需超时控制）
- - ->    = 异步调用（消息队列）
```

---

## 3. 关键技术选型（安全角度论证）

### 3.1 技术选型总览

| 层级 | 技术选型 | 安全考量 | 备选方案 |
|------|---------|---------|---------|
| 前端框架 | React 18 + TypeScript | 类型安全减少运行时错误 | Vue 3 |
| 动画库 | Framer Motion | 无外部依赖，安全可控 | CSS Animation |
| 音频处理 | Web Audio API | 浏览器原生，无数据外泄 | WebRTC |
| API网关 | Kong / Nginx | 成熟的WAF能力、限流熔断 | APISIX |
| 后端语言 | Go 1.21+ / Node.js 20+ | 内存安全、并发安全 | Python |
| 数据库 | PostgreSQL 15 | 行级安全策略、透明加密 | MySQL 8.0 |
| 缓存 | Redis 7 (Cluster) | ACL权限控制、TLS加密 | KeyDB |
| 消息队列 | NATS / RabbitMQ | 消息持久化、确认机制 | Kafka |
| 容器编排 | Kubernetes | RBAC权限控制、网络策略 | Docker Swarm |
| 监控 | Prometheus + Grafana | 数据本地存储，无外部依赖 | Datadog |
| 日志 | ELK Stack | 敏感信息脱敏、审计追踪 | Fluentd |

### 3.2 核心服务选型论证

#### 3.2.1 LLM服务商（通义千问/文心一言）

| 维度 | 安全考量 |
|------|---------|
| 数据合规 | 国内服务商，符合《个人信息保护法》《数据安全法》 |
| 数据留存 | 明确服务协议中的数据使用范围和保留期限 |
| 备用机制 | 同时接入多家，避免单点故障；敏感数据可本地部署开源模型 |
| 内容安全 | 服务商自带内容审核能力，降低违规风险 |

#### 3.2.2 像素生成（Seedance 5.0）

| 维度 | 安全考量 |
|------|---------|
| 输入验证 | 上传照片需经过格式、大小、内容审核 |
| 输出隔离 | 生成的像素图存储在私有OSS，URL带签名过期时间 |
| 成本控制 | 单用户生成次数限制，防止资源滥用 |
| 备用方案 | 准备预设模板库，API不可用时降级使用 |

#### 3.2.3 语音服务（ASR/TTS）

| 维度 | 安全考量 |
|------|---------|
| 数据传输 | 全程HTTPS加密传输 |
| 数据留存 | 与服务商约定最小留存期，支持用户删除请求 |
| 本地优先 | Lip Sync使用Web Audio API本地处理，减少云端依赖 |
| 隐私告知 | 明确告知用户语音数据用途，提供关闭选项 |

---

## 4. 安全防护体系

### 4.1 安全架构层次

```
┌─────────────────────────────────────────────────────────────────┐
│                     应用层安全                                  │
│  ├── 输入验证（类型、长度、格式、XSS过滤）                       │
│  ├── 输出编码（防注入、防XSS）                                  │
│  ├── 业务逻辑安全（权限校验、防越权）                            │
│  └── 会话管理（JWT过期、刷新机制）                              │
├─────────────────────────────────────────────────────────────────┤
│                     接口层安全                                  │
│  ├── API网关（WAF、限流、熔断）                                 │
│  ├── 认证鉴权（OAuth2.0 / JWT）                                │
│  ├── 请求签名（防篡改、防重放）                                 │
│  └── HTTPS强制（TLS 1.3）                                      │
├─────────────────────────────────────────────────────────────────┤
│                     数据层安全                                  │
│  ├── 敏感数据加密（AES-256-GCM）                               │
│  ├── 数据库访问控制（最小权限原则）                             │
│  ├── 数据脱敏（日志、展示）                                    │
│  └── 备份加密                                                  │
├─────────────────────────────────────────────────────────────────┤
│                     基础设施安全                                │
│  ├── 网络隔离（VPC、安全组）                                   │
│  ├── 容器安全（镜像扫描、只读文件系统）                         │
│  ├── 密钥管理（KMS、Secret管理）                               │
│  └── 安全审计（操作日志、访问日志）                            │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 认证与授权

```
认证流程：
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  用户   │───►│ 登录认证 │───►│ JWT签发 │───►│ 返回Token│
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                    │
                    ▼
              ┌─────────────┐
              │ 多因素认证   │（可选，敏感操作）
              │ 邮箱/手机验证│
              └─────────────┘

授权流程：
┌─────────┐    ┌─────────────┐    ┌─────────────┐
│ 请求API │───►│ Gateway鉴权 │───►│ RBAC权限校验│
└─────────┘    └─────────────┘    └─────────────┘
                      │                  │
                      ▼                  ▼
                ┌───────────┐      ┌───────────┐
                │ JWT验证   │      │ 角色/权限 │
                │ - 签名    │      │ - 普通用户│
                │ - 过期    │      │ - 会员    │
                │ - 黑名单  │      │ - 管理员  │
                └───────────┘      └───────────┘
```

### 4.3 敏感数据保护

| 数据类型 | 存储方式 | 传输方式 | 访问控制 |
|---------|---------|---------|---------|
| 用户密码 | bcrypt加密（cost=12） | 不传输 | 仅存储，不可读取 |
| 手机号/邮箱 | AES-256-GCM加密 | HTTPS | 需验证身份后解密 |
| 语音数据 | OSS加密存储 | HTTPS | 用户本人+授权服务 |
| 面试记录 | 数据库加密列 | HTTPS | 用户本人+匿名分析 |
| 支付信息 | 不存储 | HTTPS | 交由支付网关处理 |
| JWT密钥 | KMS管理 | 内部服务 | 仅认证服务可访问 |

### 4.4 安全配置清单

```yaml
安全配置检查项：

传输安全：
  - [ ] 强制HTTPS（HSTS）
  - [ ] TLS 1.3优先
  - [ ] 证书有效期监控
  - [ ] 证书透明度日志

认证安全：
  - [ ] JWT过期时间 <= 24小时
  - [ ] Refresh Token过期时间 <= 7天
  - [ ] 登录失败锁定（5次/15分钟）
  - [ ] 密码复杂度要求

接口安全：
  - [ ] 请求签名验证
  - [ ] 请求时间戳校验（防重放）
  - [ ] 请求幂等性保证
  - [ ] 敏感操作二次验证

数据安全：
  - [ ] 敏感列加密
  - [ ] 日志脱敏
  - [ ] 定期备份
  - [ ] 备份加密存储

运维安全：
  - [ ] 最小权限原则
  - [ ] 操作审计日志
  - [ ] 定期安全扫描
  - [ ] 漏洞修复SLA
```

---

## 5. 容错机制

### 5.1 容错设计原则

```
                 容错层级
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
 ┌──────┐      ┌──────┐      ┌──────┐
 │ 预防 │      │ 检测 │      │ 恢复 │
 └──────┘      └──────┘      └──────┘
    │               │               │
    ▼               ▼               ▼
 ┌──────────┐ ┌──────────┐ ┌──────────┐
 │ 限流     │ │ 健康检查 │ │ 重试     │
 │ 熔断     │ │ 心跳检测 │ │ 降级     │
 │ 隔离     │ │ 监控告警 │ │ 熔断恢复 │
 │ 超时控制 │ │ 链路追踪 │ │ 数据恢复 │
 └──────────┘ └──────────┘ └──────────┘
```

### 5.2 熔断器配置

```go
type CircuitBreakerConfig struct {
    Name                string          // 熔断器名称
    ErrorRateThreshold  float64         // 触发熔断的错误比例阈值，默认 0.5 (50%)
    MinRequestCount     int             // 触发熔断的最小请求数，默认 100
    OpenDuration        time.Duration   // 熔断持续时间，默认 30s
    HalfOpenMaxRequests int             // 半开状态下允许的请求数，默认 10
    SlowCallDuration    time.Duration   // 慢调用阈值，默认 5s
    SlowCallRateThreshold float64       // 慢调用比例阈值，默认 0.8 (80%)
}

// 各服务熔断配置
var ServiceCircuitBreakers = map[string]CircuitBreakerConfig{
    "llm-service": {
        Name:                "llm-circuit",
        ErrorRateThreshold:  0.3,  // LLM容错率稍低
        MinRequestCount:     50,
        OpenDuration:        60 * time.Second,
        HalfOpenMaxRequests: 5,
        SlowCallDuration:    10 * time.Second,
    },
    "asr-service": {
        Name:                "asr-circuit",
        ErrorRateThreshold:  0.4,
        MinRequestCount:     30,
        OpenDuration:        30 * time.Second,
    },
    "pixel-service": {
        Name:                "pixel-circuit",
        ErrorRateThreshold:  0.5,
        MinRequestCount:     20,
        OpenDuration:        120 * time.Second,
    },
}
```

### 5.3 重试策略

```go
type RetryConfig struct {
    MaxRetries      int           // 最大重试次数
    InitialDelay    time.Duration // 初始等待时间
    MaxDelay        time.Duration // 最大等待时间
    Multiplier      float64       // 退避倍数
    RetryableErrors []error       // 可重试的错误类型
}

var ServiceRetryConfigs = map[string]RetryConfig{
    "llm-service": {
        MaxRetries:   3,
        InitialDelay: 500 * time.Millisecond,
        MaxDelay:     5 * time.Second,
        Multiplier:   2.0,
    },
    "asr-service": {
        MaxRetries:   2,
        InitialDelay: 300 * time.Millisecond,
        MaxDelay:     2 * time.Second,
        Multiplier:   2.0,
    },
    "database": {
        MaxRetries:   3,
        InitialDelay: 100 * time.Millisecond,
        MaxDelay:     1 * time.Second,
        Multiplier:   1.5,
    },
    "redis": {
        MaxRetries:   2,
        InitialDelay: 50 * time.Millisecond,
        MaxDelay:     500 * time.Millisecond,
        Multiplier:   2.0,
    },
}
```

### 5.4 限流策略

```yaml
限流配置：

全局限流：
  - API总请求：10000 req/s（集群级别）
  - 单IP请求：100 req/min
  - 单用户请求：60 req/min

服务级别限流：
  llm-service:
    strategy: token-bucket
    rate: 100 req/s
    burst: 200
    per_user: 10 req/min
    
  asr-service:
    strategy: sliding-window
    rate: 200 req/s
    burst: 300
    per_user: 30 req/min
    
  pixel-generation:
    strategy: token-bucket
    rate: 10 req/s
    burst: 20
    per_user: 5 req/day
    
  tts-service:
    strategy: token-bucket
    rate: 150 req/s
    burst: 250
    per_user: 100 req/day

限流响应：
  status_code: 429
  body:
    code: RATE_LIMIT_EXCEEDED
    message: "请求过于频繁，请稍后再试"
    retry_after: 60
```

### 5.5 降级策略

| 服务 | 触发条件 | 降级方案 | 用户体验 |
|------|---------|---------|---------|
| LLM服务 | 熔断器打开 | 返回预设回复 | 提示"AI服务暂时不可用，请稍后再试" |
| ASR服务 | 错误率>40% | 切换文字输入 | 提示"语音识别不可用，请使用文字输入" |
| TTS服务 | 熔断器打开 | 文字模式 | 仅显示文字，无语音播放 |
| 像素生成 | 错误率>50% | 使用预设模板 | 使用默认模板生成像素小人 |
| 数据库 | 连接池满 | 返回缓存数据 | 提示"数据加载中，请稍后" |

### 5.6 超时控制

| 服务 | 连接超时 | 读超时 | 写超时 | 总超时 |
|------|---------|-------|-------|-------|
| LLM服务 | 3s | 30s | 5s | 60s |
| ASR服务 | 2s | 15s | 10s | 30s |
| TTS服务 | 2s | 10s | 5s | 20s |
| 像素服务 | 3s | 60s | 10s | 90s |
| 数据库 | 1s | 3s | 5s | 10s |
| Redis | 500ms | 1s | 1s | 2s |

---

## 6. 异常处理规范

### 6.1 异常分类

| 分类 | 说明 | HTTP状态码范围 | 处理方式 |
|------|------|---------------|---------|
| 业务异常 | 正常业务流程中的预期错误 | 400-499 | 返回具体错误码和提示 |
| 参数校验异常 | 请求参数不符合要求 | 400 | 返回字段级错误信息 |
| 认证授权异常 | 身份验证或权限不足 | 401/403 | 返回认证/授权错误码 |
| 限流异常 | 超过访问频率限制 | 429 | 返回重试等待时间 |
| 外部服务异常 | 第三方服务不可用 | 502/503 | 触发降级策略 |
| 内部系统异常 | 系统内部错误 | 500 | 记录日志，返回通用错误 |

### 6.2 错误码规范

```
错误码格式：XXXXX（5位数字）
- 第1位：错误类别
- 后4位：具体错误编号

错误类别：
- 1xxxx：通用错误
- 2xxxx：认证授权错误
- 3xxxx：用户相关错误
- 4xxxx：面试相关错误
- 5xxxx：像素小人相关错误
- 6xxxx：任务相关错误
- 7xxxx：支付相关错误
- 8xxxx：外部服务错误
```

| 错误码 | 错误名称 | HTTP状态 | 说明 |
|--------|---------|---------|------|
| 10000 | UNKNOWN | 500 | 未知错误 |
| 10001 | INVALID_REQUEST | 400 | 无效请求 |
| 10002 | INVALID_PARAM | 400 | 参数校验失败 |
| 10003 | RATE_LIMITED | 429 | 请求过于频繁 |
| 10004 | SERVICE_UNAVAILABLE | 503 | 服务暂时不可用 |
| 20001 | UNAUTHORIZED | 401 | 未登录 |
| 20002 | TOKEN_EXPIRED | 401 | Token已过期 |
| 20003 | TOKEN_INVALID | 401 | Token无效 |
| 20004 | PERMISSION_DENIED | 403 | 权限不足 |
| 20005 | ACCOUNT_LOCKED | 403 | 账号已被锁定 |
| 30001 | USER_NOT_FOUND | 404 | 用户不存在 |
| 30002 | USER_EXISTS | 409 | 用户已存在 |
| 40001 | INTERVIEW_NOT_FOUND | 404 | 面试不存在 |
| 40002 | INTERVIEW_EXPIRED | 410 | 面试已过期 |
| 40003 | INTERVIEW_LIMIT_EXCEEDED | 403 | 面试次数超限 |
| 40004 | ASR_FAILED | 502 | 语音识别失败 |
| 40005 | TTS_FAILED | 502 | 语音合成失败 |
| 40006 | LLM_FAILED | 502 | AI服务失败 |
| 50001 | PIXEL_GENERATION_FAILED | 502 | 像素生成失败 |
| 50002 | PIXEL_NOT_FOUND | 404 | 像素小人不存在 |
| 50003 | PIXEL_LIMIT_EXCEEDED | 403 | 生成次数超限 |
| 70001 | PAYMENT_FAILED | 402 | 支付失败 |
| 80001 | EXTERNAL_SERVICE_UNAVAILABLE | 503 | 外部服务不可用 |

### 6.3 异常处理流程

```
请求入口
    │
    ▼
┌─────────────┐
│ 参数校验    │──► 校验失败 ──► 返回 INVALID_PARAM
└─────────────┘
    │
    ▼
┌─────────────┐
│ 认证鉴权    │──► 认证失败 ──► 返回 UNAUTHORIZED
└─────────────┘         │
    │                   └──► 权限不足 ──► 返回 PERMISSION_DENIED
    ▼
┌─────────────┐
│ 业务处理    │──► 业务异常 ──► 返回业务错误码
└─────────────┘
    │
    ├──► 外部服务调用失败 ──► 熔断/重试/降级
    │                            │
    │                            ├──► 重试成功 ──► 继续处理
    │                            ├──► 降级成功 ──► 返回降级结果
    │                            └──► 降级失败 ──► 返回 EXTERNAL_SERVICE_UNAVAILABLE
    │
    └──► 内部系统异常 ──► 记录日志 ──► 返回 SERVICE_UNAVAILABLE
                                    │
                                    ▼
                              ┌─────────────┐
                              │ 监控告警    │
                              └─────────────┘
```

### 6.4 异常响应格式

```json
{
    "code": "40006",
    "message": "AI服务暂时不可用",
    "detail": "LLM服务响应超时，已触发熔断",
    "trace_id": "abc123def456",
    "timestamp": "2026-03-26T10:30:00Z",
    "suggestion": "请稍后再试，或切换为文字模式继续面试"
}
```

### 6.5 异常日志规范

```json
{
    "timestamp": "2026-03-26T10:30:00.123Z",
    "level": "ERROR",
    "service": "interview-service",
    "trace_id": "abc123def456",
    "span_id": "span789",
    "user_id": "u_***1234",
    "request_id": "req456",
    "method": "POST",
    "path": "/api/v1/interview/start",
    "status_code": 503,
    "latency_ms": 1523,
    "error": {
        "code": "40006",
        "message": "LLM服务响应超时",
        "category": "external"
    },
    "stack_trace": "goroutine 1 [running]:\n..."
}
```

日志脱敏规则：
- user_id：仅保留后4位
- 手机号：仅保留前3位和后4位
- 邮箱：仅保留前2位和域名
- Token：不记录
- 密码：不记录

---

## 7. 可维护性设计

### 7.1 代码组织结构

```
project-root/
├── cmd/                          # 应用入口
│   ├── api-server/
│   │   └── main.go
│   └── worker/
│       └── main.go
├── internal/                     # 内部代码（不可被外部引用）
│   ├── domain/                   # 领域模型
│   │   ├── user/
│   │   │   ├── entity.go
│   │   │   ├── repository.go
│   │   │   └── service.go
│   │   ├── interview/
│   │   ├── pixel/
│   │   └── task/
│   ├── application/              # 应用服务（用例）
│   │   ├── user/
│   │   ├── interview/
│   │   ├── pixel/
│   │   └── task/
│   ├── infrastructure/           # 基础设施
│   │   ├── persistence/
│   │   │   ├── postgres/
│   │   │   └── redis/
│   │   ├── external/
│   │   │   ├── llm/
│   │   │   ├── asr/
│   │   │   └── pixel/
│   │   └── messaging/
│   └── interfaces/               # 接口层
│       ├── http/
│       │   ├── handler/
│       │   ├── middleware/
│       │   └── router.go
│       └── grpc/
├── pkg/                          # 可复用的公共库
│   ├── errors/
│   ├── logger/
│   ├── config/
│   ├── circuitbreaker/
│   ├── ratelimiter/
│   └── retry/
├── api/                          # API定义
│   ├── openapi/
│   │   └── openapi.yaml
│   └── proto/
│       └── *.proto
├── configs/                      # 配置文件
│   ├── dev.yaml
│   ├── staging.yaml
│   └── prod.yaml
├── deployments/                  # 部署相关
│   ├── kubernetes/
│   │   ├── base/
│   │   └── overlays/
│   └── docker/
│       └── Dockerfile
├── scripts/                      # 脚本
│   ├── migrate.sh
│   └── seed.sh
├── docs/                         # 文档
│   ├── arch/
│   └── api/
├── test/                         # 测试
│   ├── integration/
│   └── e2e/
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

### 7.2 配置管理

配置来源优先级：环境变量 > 配置文件 > 默认值

敏感配置必须使用环境变量或Secret管理：
- 数据库密码
- API密钥
- JWT密钥
- 加密密钥

### 7.3 监控指标

**核心监控指标：**

| 类别 | 指标 | 告警阈值 |
|------|------|---------|
| 服务健康 | 存活状态、就绪状态 | 服务不可用立即告警 |
| 请求 | QPS、延迟(P50/P90/P99)、错误率 | 错误率>5%告警 |
| 业务 | 活跃用户、面试完成数 | - |
| 外部服务 | 调用延迟、错误率、熔断状态 | 服务不可用立即告警 |
| 数据库 | 连接池使用率、慢查询 | 使用率>80%告警 |
| Redis | 内存使用、缓存命中率 | 内存>80%告警 |

### 7.4 文档要求

**必要文档清单：**

1. API文档（OpenAPI规范）
2. 架构文档（系统架构、数据流、部署架构）
3. 运维文档（部署指南、配置说明、故障排查手册）
4. 开发文档（环境搭建、代码规范、发布流程）
5. 安全文档（安全架构、数据分类、安全配置清单）

### 7.5 测试策略

```
测试金字塔：

          ┌─────────┐
          │   E2E   │  数量：少量 | 速度：慢 | 目的：验证关键业务流程
          │  Tests  │
          ├─────────┤
          │Integration│ 数量：中等 | 速度：中等 | 目的：验证模块集成
          │  Tests   │
          ├─────────┤
          │  Unit   │  数量：大量 | 速度：快 | 目的：验证单个函数
          │  Tests  │
          └─────────┘

测试覆盖率要求：
- 单元测试：核心业务逻辑 >= 80%
- 集成测试：API接口 100%
- E2E测试：关键业务流程 100%
```

---

## 8. 已知权衡

### 8.1 架构权衡决策记录（ADR）

| ID | 决策 | 选择方案 | 放弃方案 | 理由 |
|----|------|---------|---------|------|
| ADR-001 | 后端语言 | Go | Python/Node.js | 内存安全、并发安全、类型安全 |
| ADR-002 | 数据库 | PostgreSQL | MySQL | 行级安全策略、透明加密更完善 |
| ADR-003 | 缓存 | Redis Cluster | 单机Redis | 高可用、数据分片、故障转移 |
| ADR-004 | 消息队列 | NATS | Kafka | 轻量级、运维成本低，满足当前需求 |
| ADR-005 | 容器编排 | Kubernetes | Docker Swarm | 生态成熟、安全特性完善 |
| ADR-006 | API风格 | REST | GraphQL | 安全边界清晰、缓存友好 |
| ADR-007 | 认证方式 | JWT | Session | 无状态、易扩展、支持多端 |

### 8.2 性能vs安全权衡

| 场景 | 选择 | 影响 |
|------|------|------|
| 数据传输 | 全程HTTPS + 请求签名 | 延迟增加5-10ms |
| 数据存储 | 敏感数据加密存储 | 读写性能降低10-20% |
| 外部调用 | 熔断+重试+超时 | 最坏情况延迟增加3倍 |
| API响应 | 全字段校验 | 每请求增加1-3ms |

### 8.3 功能vs稳定权衡

| 场景 | 选择 | 影响 |
|------|------|------|
| 新功能发布 | 灰度发布+功能开关 | 上线周期延长 |
| 外部服务依赖 | 多服务商备份 | 成本增加 |
| 数据一致性 | 最终一致性 | 用户可能看到旧数据 |

### 8.4 开发效率vs可维护性权衡

| 场景 | 选择 | 影响 |
|------|------|------|
| 代码规范 | 强类型+lint+审查 | 开发速度降低20% |
| 文档要求 | 强制文档更新 | 开发时间增加10% |
| 测试要求 | 高覆盖率要求 | 开发时间增加30% |

---

## 9. 接口定义（前后端分离）

### 9.1 接口规范

**基础信息：**
- 基础路径：`/api/v1`
- 协议：HTTPS
- 数据格式：JSON
- 字符编码：UTF-8
- 认证方式：Bearer JWT

**通用请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
X-Request-ID: <uuid>
X-Client-Version: 1.0.0
```

**通用响应格式：**
```json
{
    "code": "00000",
    "message": "success",
    "data": { ... },
    "trace_id": "abc123"
}
```

**通用错误响应：**
```json
{
    "code": "40006",
    "message": "AI服务暂时不可用",
    "detail": "LLM服务响应超时",
    "trace_id": "abc123",
    "timestamp": "2026-03-26T10:30:00Z"
}
```

---

### 9.2 认证相关接口

#### 9.2.1 用户注册

**POST /auth/register**

请求体：
```json
{
    "phone": "13800138000",
    "email": "user@example.com",
    "password": "Password123!",
    "code": "123456"
}
```

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "user_id": "u_abc123",
        "phone": "138****8000",
        "email": "us***@example.com",
        "created_at": "2026-03-26T10:00:00Z"
    }
}
```

异常声明：
| 错误码 | 说明 |
|--------|------|
| 10002 | 参数校验失败（手机号/邮箱格式错误、密码不符合要求） |
| 30002 | 用户已存在 |
| 30004 | 手机号已注册 |
| 30005 | 邮箱已注册 |

#### 9.2.2 用户登录

**POST /auth/login**

请求体：
```json
{
    "account": "13800138000",
    "password": "Password123!",
    "device_id": "device_abc"
}
```

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "access_token": "eyJ...",
        "refresh_token": "eyJ...",
        "expires_in": 86400,
        "user": {
            "user_id": "u_abc123",
            "nickname": "像素达人",
            "avatar_url": "https://cdn.example.com/pixel/u_abc123.png"
        }
    }
}
```

异常声明：
| 错误码 | 说明 |
|--------|------|
| 20006 | 登录失败（账号或密码错误） |
| 20005 | 账号已被锁定 |
| 10003 | 请求过于频繁 |

#### 9.2.3 刷新Token

**POST /auth/refresh**

请求体：
```json
{
    "refresh_token": "eyJ..."
}
```

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "access_token": "eyJ...",
        "expires_in": 86400
    }
}
```

异常声明：
| 错误码 | 说明 |
|--------|------|
| 20002 | Token已过期 |
| 20003 | Token无效 |

#### 9.2.4 登出

**POST /auth/logout**

请求头：`Authorization: Bearer <token>`

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": null
}
```

---

### 9.3 用户相关接口

#### 9.3.1 获取用户信息

**GET /users/me**

请求头：`Authorization: Bearer <token>`

响应体：
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
        "created_at": "2026-01-01T00:00:00Z"
    }
}
```

异常声明：
| 错误码 | 说明 |
|--------|------|
| 20001 | 未登录 |
| 30001 | 用户不存在 |

#### 9.3.2 更新用户信息

**PUT /users/me**

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
    "nickname": "新昵称"
}
```

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "user_id": "u_abc123",
        "nickname": "新昵称",
        "updated_at": "2026-03-26T10:30:00Z"
    }
}
```

---

### 9.4 像素小人相关接口

#### 9.4.1 生成像素小人（问卷方式）

**POST /pixels/generate**

请求头：`Authorization: Bearer <token>`

请求体：
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

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "pixel_id": "p_xyz789",
        "spritesheet_url": "https://cdn.example.com/sprites/p_xyz789.png",
        "animations": ["idle", "talk", "listen", "nod", "nervous"],
        "created_at": "2026-03-26T10:00:00Z"
    }
}
```

异常声明：
| 错误码 | 说明 |
|--------|------|
| 50001 | 像素生成失败 |
| 50003 | 生成次数超限 |
| 10002 | 参数校验失败 |

#### 9.4.2 生成像素小人（照片方式）

**POST /pixels/generate-from-photo**

请求头：
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

请求体（form-data）：
- `photo`: 图片文件（支持jpg/png，最大5MB）
- `style`: 风格选项（可选）

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "pixel_id": "p_xyz789",
        "spritesheet_url": "https://cdn.example.com/sprites/p_xyz789.png",
        "preview_url": "https://cdn.example.com/preview/p_xyz789.png",
        "animations": ["idle", "talk", "listen", "nod", "nervous"],
        "expires_at": "2026-03-26T11:00:00Z"
    }
}
```

异常声明：
| 错误码 | 说明 |
|--------|------|
| 50001 | 像素生成失败 |
| 50003 | 生成次数超限 |
| 50004 | 图片格式不支持 |
| 50005 | 图片大小超过限制 |

#### 9.4.3 获取像素小人信息

**GET /pixels/{pixel_id}**

请求头：`Authorization: Bearer <token>`

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "pixel_id": "p_xyz789",
        "user_id": "u_abc123",
        "spritesheet_url": "https://cdn.example.com/sprites/p_xyz789.png",
        "animations": ["idle", "talk", "listen", "nod", "nervous"],
        "created_at": "2026-03-26T10:00:00Z"
    }
}
```

异常声明：
| 错误码 | 说明 |
|--------|------|
| 50002 | 像素小人不存在 |
| 20004 | 无权访问 |

---

### 9.5 面试相关接口

#### 9.5.1 创建面试会话

**POST /interviews**

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
    "type": "behavioral",
    "position": "software_engineer",
    "difficulty": "medium",
    "duration_minutes": 15,
    "npc_type": "friendly"
}
```

响应体：
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

异常声明：
| 错误码 | 说明 |
|--------|------|
| 40003 | 面试次数超限（非会员每日限制） |
| 10002 | 参数校验失败 |

#### 9.5.2 开始面试

**POST /interviews/{interview_id}/start**

请求头：`Authorization: Bearer <token>`

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "interview_id": "i_def456",
        "status": "in_progress",
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

异常声明：
| 错误码 | 说明 |
|--------|------|
| 40001 | 面试不存在 |
| 40002 | 面试已过期 |

#### 9.5.3 提交语音回答

**POST /interviews/{interview_id}/answers**

请求头：
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

请求体（form-data）：
- `question_id`: 问题ID
- `audio`: 音频文件（支持webm/wav/mp3，最大10MB）

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "answer_id": "a_ghi789",
        "transcript": "你好，我是张三，有3年后端开发经验...",
        "analysis": {
            "confidence": 0.85,
            "keywords": ["后端", "开发", "经验"]
        },
        "next_action": {
            "type": "follow_up",
            "content": {
                "question_id": "q_002",
                "text": "能详细说说你在项目中遇到的最大挑战吗？",
                "audio_url": "https://cdn.example.com/audio/q_002.mp3"
            }
        }
    }
}
```

异常声明：
| 错误码 | 说明 |
|--------|------|
| 40001 | 面试不存在 |
| 40004 | 语音识别失败 |
| 40006 | AI服务失败 |

#### 9.5.4 提交文字回答

**POST /interviews/{interview_id}/answers/text**

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
    "question_id": "q_001",
    "text": "你好，我是张三，有3年后端开发经验..."
}
```

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "answer_id": "a_ghi789",
        "next_action": {
            "type": "follow_up",
            "content": {
                "question_id": "q_002",
                "text": "能详细说说你在项目中遇到的最大挑战吗？",
                "audio_url": "https://cdn.example.com/audio/q_002.mp3"
            }
        }
    }
}
```

#### 9.5.5 结束面试

**POST /interviews/{interview_id}/finish**

请求头：`Authorization: Bearer <token>`

响应体：
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
            "strengths": [
                "表达清晰，逻辑性强",
                "专业知识点扎实"
            ],
            "improvements": [
                "可以增加具体的量化数据",
                "应变能力有待提升"
            ]
        },
        "attributes_change": {
            "power": 5,
            "mood": 3,
            "wins": 1
        },
        "completed_at": "2026-03-26T10:12:00Z"
    }
}
```

异常声明：
| 错误码 | 说明 |
|--------|------|
| 40001 | 面试不存在 |
| 40006 | AI评分失败 |

#### 9.5.6 获取面试记录列表

**GET /interviews**

请求头：`Authorization: Bearer <token>`

查询参数：
- `page`: 页码（默认1）
- `page_size`: 每页数量（默认20）
- `type`: 面试类型（可选）
- `status`: 状态（可选）

响应体：
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
                "created_at": "2026-03-26T10:00:00Z"
            }
        ]
    }
}
```

#### 9.5.7 获取面试详情

**GET /interviews/{interview_id}**

请求头：`Authorization: Bearer <token>`

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "interview_id": "i_def456",
        "type": "behavioral",
        "status": "completed",
        "npc": {
            "npc_id": "npc_001",
            "name": "HR小王"
        },
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
        "qa_records": [
            {
                "question_id": "q_001",
                "question": "请做一个简单的自我介绍",
                "answer_id": "a_001",
                "answer_transcript": "你好，我是张三...",
                "audio_url": "https://cdn.example.com/audio/a_001.mp3",
                "duration_seconds": 45
            }
        ],
        "feedback": {
            "strengths": ["表达清晰"],
            "improvements": ["增加量化数据"]
        },
        "created_at": "2026-03-26T10:00:00Z",
        "completed_at": "2026-03-26T10:12:00Z"
    }
}
```

异常声明：
| 错误码 | 说明 |
|--------|------|
| 40001 | 面试不存在 |
| 20004 | 无权访问 |

---

### 9.6 任务相关接口

#### 9.6.1 获取每日任务列表

**GET /tasks/daily**

请求头：`Authorization: Bearer <token>`

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "date": "2026-03-26",
        "tasks": [
            {
                "task_id": "t_001",
                "type": "interview",
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
            }
        ],
        "completed_count": 2,
        "total_count": 5
    }
}
```

#### 9.6.2 领取任务奖励

**POST /tasks/{task_id}/claim**

请求头：`Authorization: Bearer <token>`

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "task_id": "t_001",
        "reward": {
            "power": 5,
            "mood": 2
        },
        "new_attributes": {
            "power": 80,
            "mood": 85
        }
    }
}
```

异常声明：
| 错误码 | 说明 |
|--------|------|
| 60001 | 任务不存在 |
| 60002 | 任务未完成 |
| 60003 | 任务已过期 |

---

### 9.7 NPC相关接口

#### 9.7.1 获取NPC列表

**GET /npcs**

请求头：`Authorization: Bearer <token>`

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "npcs": [
            {
                "npc_id": "npc_001",
                "type": "interviewer",
                "name": "HR小王",
                "description": "温和友善的HR面试官",
                "avatar_url": "https://cdn.example.com/npc/npc_001.png",
                "unlock_condition": {
                    "type": "free"
                }
            },
            {
                "npc_id": "npc_002",
                "type": "companion",
                "name": "小助手",
                "description": "你的求职陪跑员",
                "avatar_url": "https://cdn.example.com/npc/npc_002.png",
                "unlock_condition": {
                    "type": "premium"
                }
            }
        ]
    }
}
```

#### 9.7.2 与NPC对话（陪跑员）

**POST /npcs/{npc_id}/chat**

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
    "message": "我有点紧张，怎么办？",
    "context": {
        "interview_id": "i_def456"
    }
}
```

响应体：
```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "response": {
            "text": "紧张是正常的，深呼吸，相信自己！你准备得很充分。",
            "audio_url": "https://cdn.example.com/audio/response_001.mp3"
        },
        "mood_change": 5
    }
}
```

异常声明：
| 错误码 | 说明 |
|--------|------|
| 20004 | 权限不足（需会员） |
| 40006 | AI服务失败 |

---

### 9.8 WebSocket接口

#### 9.8.1 面试实时通信

**连接地址：** `wss://api.example.com/ws/interviews/{interview_id}`

**连接参数：**
- `token`: JWT Token

**消息格式：**

客户端 -> 服务端（语音流）：
```json
{
    "type": "audio_chunk",
    "data": "<base64_encoded_audio>",
    "sequence": 1,
    "timestamp": 1234567890
}
```

服务端 -> 客户端（实时转录）：
```json
{
    "type": "transcript",
    "data": {
        "text": "你好，我是...",
        "is_final": false
    }
}
```

服务端 -> 客户端（AI回复）：
```json
{
    "type": "ai_response",
    "data": {
        "text": "能详细说说吗？",
        "audio_url": "https://cdn.example.com/audio/...",
        "emotion": "curious"
    }
}
```

服务端 -> 客户端（实时评分）：
```json
{
    "type": "score_update",
    "data": {
        "current_score": 75,
        "dimensions": {
            "expression": 80,
            "logic": 70
        }
    }
}
```

服务端 -> 客户端（错误通知）：
```json
{
    "type": "error",
    "data": {
        "code": "40004",
        "message": "语音识别失败，请重试"
    }
}
```

异常声明：
| 错误码 | 说明 |
|--------|------|
| 20001 | 未认证 |
| 40001 | 面试不存在 |
| 40004 | ASR服务不可用 |
| 40006 | LLM服务不可用 |

---

## 10. 风险点与缓解

### 10.1 技术风险

| 风险项 | 风险等级 | 影响 | 缓解措施 |
|--------|---------|------|---------|
| LLM服务不稳定 | 高 | 面试体验受损 | 多服务商备份、熔断降级、预设回复 |
| ASR识别准确率低 | 中 | 用户回答无法正确识别 | 多ASR服务商、提供文字输入备选 |
| 像素生成API不可用 | 中 | 新用户无法生成像素小人 | 预设模板库降级、定期检查服务状态 |
| 数据库性能瓶颈 | 中 | 系统响应缓慢 | 读写分离、缓存层、连接池优化 |
| WebSocket连接不稳定 | 中 | 实时面试中断 | 断线重连机制、状态恢复 |
| 跨境数据传输延迟 | 中 | 海外用户体验差 | 多区域部署、CDN加速 |

### 10.2 安全风险

| 风险项 | 风险等级 | 影响 | 缓解措施 |
|--------|---------|------|---------|
| 用户数据泄露 | 高 | 法律责任、用户流失 | 加密存储、访问控制、审计日志 |
| JWT Token被盗用 | 高 | 账号被非法访问 | Token过期机制、刷新策略、异常检测 |
| API被恶意调用 | 中 | 资源浪费、服务不可用 | 限流、签名验证、黑名单机制 |
| SQL注入/XSS攻击 | 高 | 数据泄露、服务被篡改 | 参数化查询、输入过滤、输出编码 |
| 第三方服务数据泄露 | 中 | 用户隐私泄露 | 最小数据传输、数据脱敏、合规协议 |

### 10.3 业务风险

| 风险项 | 风险等级 | 影响 | 缓解措施 |
|--------|---------|------|---------|
| 用户流失率高 | 高 | 商业模式不可持续 | 游戏化激励、个性化推荐、社区运营 |
| AI回答质量不稳定 | 高 | 用户信任度下降 | Prompt优化、质量监控、人工审核 |
| 内容合规风险 | 高 | 服务被下架 | 内容审核、敏感词过滤、人工复审 |
| 成本超支 | 中 | 商业可行性受影响 | 用户配额限制、成本监控、动态定价 |

### 10.4 运维风险

| 风险项 | 风险等级 | 影响 | 缓解措施 |
|--------|---------|------|---------|
| 部署故障 | 高 | 服务不可用 | 蓝绿部署、回滚机制、部署前测试 |
| 监控盲区 | 中 | 故障发现延迟 | 全链路监控、告警完善、定期巡检 |
| 配置错误 | 中 | 服务异常 | 配置版本控制、变更审批、灰度发布 |
| 依赖服务下线 | 中 | 功能不可用 | 多服务商备份、服务降级方案 |

### 10.5 风险监控与应急响应

**风险监控指标：**
- 服务可用性（SLA >= 99.9%）
- 错误率（< 1%）
- 响应时间（P99 < 3s）
- 安全事件数（目标：0）

**应急响应流程：**
```
故障发现 ──► 故障定级 ──► 应急响应 ──► 故障修复 ──► 故障复盘
    │             │             │             │             │
    ▼             ▼             ▼             ▼             ▼
 监控告警      P0/P1/P2      成立小组      定位修复      改进措施
 用户反馈      通知相关人员   临时方案      验证发布      文档更新
```

**故障定级标准：**
| 级别 | 影响 | 响应时间 | 处理时限 |
|------|------|---------|---------|
| P0 | 核心功能不可用 | 5分钟 | 30分钟 |
| P1 | 重要功能受损 | 15分钟 | 2小时 |
| P2 | 非核心功能异常 | 30分钟 | 24小时 |

---

## 附录A：术语表

| 术语 | 说明 |
|------|------|
| LLM | 大语言模型（Large Language Model） |
| ASR | 自动语音识别（Automatic Speech Recognition） |
| TTS | 文本转语音（Text to Speech） |
| JWT | JSON Web Token |
| ADR | 架构决策记录（Architecture Decision Record） |
| SLA | 服务等级协议（Service Level Agreement） |
| RBAC | 基于角色的访问控制（Role-Based Access Control） |
| OSS | 对象存储服务（Object Storage Service） |
| CDN | 内容分发网络（Content Delivery Network） |
| VPC | 虚拟私有云（Virtual Private Cloud） |
| KMS | 密钥管理服务（Key Management Service） |
| WAF | Web应用防火墙（Web Application Firewall） |

---

## 附录B：修订历史

| 版本 | 日期 | 修订人 | 修订内容 |
|------|------|--------|---------|
| v1.0 | 2026-03-26 | 架构师 | 初始版本 |
| v2.0 | 2026-03-26 | 稳健派架构师 | 安全稳健架构设计 |

---

*文档生成时间：2026-03-26*
*文档版本：v2.0*
*设计理念：安全优先、稳定为王、可维护性第一*
