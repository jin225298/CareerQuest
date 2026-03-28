# Agent 记忆系统技术文档

> 版本: 1.0.0  
> 更新日期: 2026-03-28  
> 作者: 架构团队

---

## 目录

1. [概述](#概述)
2. [系统架构](#系统架构)
3. [核心组件](#核心组件)
4. [数据模型](#数据模型)
5. [API 接口](#api-接口)
6. [集成指南](#集成指南)
7. [配置说明](#配置说明)
8. [最佳实践](#最佳实践)

---

## 概述

### 背景

面试修炼手册应用需要为 AI 面试官提供智能记忆能力，能够：

- 记住用户的技术弱点和常见错误
- 在后续面试中针对性提问
- 追踪用户的学习进度
- 保护用户隐私（脱敏处理）

### 设计目标

| 目标 | 说明 |
|------|------|
| 智能记忆 | 自动识别并记录用户的技术盲点 |
| 分层管理 | 将记忆分为 L1/L2/L3 三个优先级 |
| 隐私保护 | 自动脱敏敏感信息 |
| 状态追踪 | 记录用户进步，自动升级/降级记忆 |

### 核心概念

```
┌─────────────────────────────────────────────────────────┐
│                    记忆分层体系                          │
├─────────────────────────────────────────────────────────┤
│  L1 (必考项)    屡次犯错的顽固问题，每次面试必问         │
│  L2 (参考项)    近期发现的弱点，选择性追问               │
│  L3 (抽查项)    已纠正的问题，偶尔验证是否真正掌握       │
└─────────────────────────────────────────────────────────┘
```

---

## 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        面试系统                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ 面试开始    │───▶│ 记忆检索    │───▶│ Prompt构建  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                   │               │
│         │                  ▼                   ▼               │
│         │           ┌─────────────┐    ┌─────────────┐         │
│         │           │ Mem0 Client │    │ AI 面试官   │         │
│         │           └─────────────┘    └─────────────┘         │
│         │                                     │               │
│         ▼                                     ▼               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ 面试结束    │───▶│ 记忆处理器  │───▶│ 记忆审计    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                   │               │
│         │                  ▼                   ▼               │
│         │           ┌─────────────┐    ┌─────────────┐         │
│         │           │ 脱敏引擎    │    │ 状态机      │         │
│         │           └─────────────┘    └─────────────┘         │
│         │                                     │               │
│         ▼                                     ▼               │
│  ┌─────────────┐                      ┌─────────────┐         │
│  │ 数据库      │◀─────────────────────│ Mem0 存储   │         │
│  └─────────────┘                      └─────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流

```
┌──────────────────────────────────────────────────────────────┐
│                      面试生命周期                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 面试开始                                                 │
│     ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│     │ 获取记忆 │───▶│ 构建提示 │───▶│ 初始化AI │              │
│     └─────────┘    └─────────┘    └─────────┘              │
│                                                              │
│  2. 面试进行                                                 │
│     ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│     │ 用户回答 │───▶│ AI 追问 │───▶│ 继续对话 │              │
│     └─────────┘    └─────────┘    └─────────┘              │
│                                                              │
│  3. 面试结束                                                 │
│     ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│     │ 对话分析 │───▶│ 错误识别 │───▶│ 脱敏处理 │              │
│     └─────────┘    └─────────┘    └─────────┘              │
│           │                                                  │
│           ▼                                                  │
│     ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│     │ 相似检测 │───▶│ 状态更新 │───▶│ 存储记忆 │              │
│     └─────────┘    └─────────┘    └─────────┘              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 核心组件

### 1. MemoryProcessor（记忆处理器）

负责脱敏和总结，将原始对话转化为结构化记忆。

#### 脱敏引擎

使用正则表达式移除敏感信息：

```python
SANITIZATION_RULES = [
    # 姓名脱敏
    (r"(我叫|我是|姓名[是为])\s*[^\s，。！？]{2,4}", r"\1[姓名]"),
    
    # 公司脱敏
    (r"(在|就职于|供职于)\s*[^\s，。！？]{2,10}(公司|科技|集团)", r"\1[公司]\2"),
    
    # 手机号脱敏
    (r"[\d]{11}", "[手机号]"),
    
    # 邮箱脱敏
    (r"[\w.-]+@[\w.-]+\.\w+", "[邮箱]"),
    
    # 项目代号脱敏
    (r"项目[代号名称]*[是为:：]\s*[^\s，。！？]{2,10}", "项目代号: [项目名]"),
]
```

**示例：**

```
输入: "我叫张三，在字节跳动公司工作，负责抖音电商项目"
输出: "我叫[姓名]，在[公司]工作，负责[某项目]"
```

#### 总结引擎

使用 LLM 将对话转化为结构化错误模型：

```
原始对话: "我不清楚 Redis 的跳表是怎么实现的，平时只是用缓存..."

总结输出:
{
    "error_type": "blind_spot",
    "topic": "Redis 跳表实现",
    "problem": "缺乏底层认知",
    "manifestation": "无法解释核心数据结构",
    "summary": "技术盲点：Redis 核心数据结构底层原理（跳表实现）。表现：缺乏底层认知。"
}
```

#### 错误类型分类

| 类型 | 说明 | 示例 |
|------|------|------|
| `blind_spot` | 完全不了解的知识点 | 不知道 Redis 为什么快 |
| `misconception` | 错误理解 | 认为索引越多越好 |
| `weakness` | 知道但不熟练 | 了解 CAP 但解释不清 |
| `knowledge_gap` | 知识缺口 | 没用过消息队列 |

---

### 2. MemoryAuditor（记忆审计器）

管理记忆的生命周期和状态转换。

#### 状态机规则

```
                    首次犯错
    ┌─────────┐ ───────────────▶ ┌─────────┐
    │         │                  │   L2    │
    │  新建   │                  │ (参考项) │
    │         │                  │         │
    └─────────┘                  └────┬────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              │ 再次犯错            │ 正确回答            │
              │ (count>=2)          │ (>=2次)             │
              ▼                     │                     ▼
    ┌─────────┐                     │             ┌─────────┐
    │   L1    │◀────────────────────┘             │   L3    │
    │ (必考项)│                                   │ (抽查项)│
    │         │  正确回答 (>=3次)                 │         │
    └─────────┘ ─────────────────────────────────▶└─────────┘
```

#### 阈值配置

```python
UPGRADE_THRESHOLD = 2           # L2 → L1：错误 2 次
L1_DOWNGRADE_THRESHOLD = 3      # L1 → L3：正确回答 3 次
L2_DOWNGRADE_THRESHOLD = 2      # L2 → L3：正确回答 2 次
SIMILARITY_THRESHOLD = 0.85     # 向量相似度阈值
```

#### 核心方法

```python
class MemoryAuditor:
    async def process_error(user_id, processed_memory, session_id) -> Dict:
        """处理用户错误，更新或创建记忆"""
        
    async def process_correct(user_id, topic, session_id) -> Dict:
        """处理正确回答，触发降级"""
        
    async def check_similar_memory(user_id, content) -> Optional[Dict]:
        """检查是否存在相似记忆"""
```

---

### 3. MemoryRetrieval（记忆检索器）

按策略从存储中检索记忆。

#### 检索策略

| 层级 | 策略 | 说明 |
|------|------|------|
| L1 | 全量加载 | limit=20，加载所有必考项 |
| L2 | 比例抽样 | ratio=0.3, min=3, max=10 |
| L3 | 比例抽样 | ratio=0.1, min=1, max=3 |

#### 示例

```python
# 获取面试上下文记忆
memories = await retrieval.get_context_memories(
    user_id="user_123",
    topic="Redis"
)

# 返回结构
{
    "L1": [...],  # 所有 L1 记忆
    "L2": [...],  # 抽样的 L2 记忆
    "L3": [...],  # 抽样的 L3 记忆
}
```

---

### 4. MemoryPromptBuilder（提示构建器）

将记忆整合到系统提示中。

#### Prompt 模板

```
你是一位严厉的面试官。基于候选人过往表现，你需要重点关注：

【必考项（顽固问题）- 必须提问】
1. 技术盲点：Redis 跳表实现。表现：缺乏底层认知。(错误3次)
2. 知识缺口：消息队列使用经验。表现：无实际项目经验。(错误2次)

【参考项（近期弱点）- 选择性追问】
1. 弱点：MySQL 索引优化。表现：理解不够深入。

【抽查项（曾犯错但已修复）- 偶尔验证】
1. 盲点：HTTP/HTTPS 区别。表现：之前不了解，已修正。

面试规则：
1. 必考项是候选人多次犯错的领域，必须针对性提问
2. 参考项是候选人的近期弱点，根据回答情况选择性追问
3. 抽查项用于验证候选人是否真正掌握，避免死记硬背
```

---

## 数据模型

### ER 图

```
┌───────────────────┐       ┌───────────────────┐
│   memory_meta     │       │   memory_events   │
├───────────────────┤       ├───────────────────┤
│ id (PK)           │       │ id (PK)           │
│ memory_id (UK)    │◀──────│ memory_id (FK)    │
│ user_id (IDX)     │       │ user_id (IDX)     │
│ level             │       │ event_type        │
│ error_type        │       │ old_level         │
│ topic (IDX)       │       │ new_level         │
│ summary           │       │ trigger           │
│ error_count       │       │ session_id        │
│ correct_count     │       │ created_at        │
│ vector_hash (IDX) │       └───────────────────┘
│ source_session_id │
│ created_at        │       ┌───────────────────┐
│ upgraded_at       │       │   memory_audits   │
│ downgraded_at     │       ├───────────────────┤
└───────────────────┘       │ id (PK)           │
                            │ user_id (IDX)     │
                            │ original_content  │
                            │ processed_content │
                            │ sanitized         │
                            │ processing_time_ms│
                            │ created_at        │
                            └───────────────────┘
```

### 表结构

#### memory_meta（记忆元数据）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| memory_id | VARCHAR | Mem0 存储ID（唯一） |
| user_id | VARCHAR | 用户ID |
| level | VARCHAR | 层级：L1/L2/L3 |
| error_type | VARCHAR | 错误类型 |
| topic | VARCHAR | 主题（索引） |
| summary | TEXT | 总结内容 |
| error_count | INTEGER | 错误次数 |
| correct_count | INTEGER | 正确次数 |
| vector_hash | VARCHAR | 向量哈希（索引） |
| source_session_id | VARCHAR | 来源会话ID |
| created_at | DATETIME | 创建时间 |
| upgraded_at | DATETIME | 升级时间 |
| downgraded_at | DATETIME | 降级时间 |

#### memory_events（记忆事件日志）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| memory_id | VARCHAR | 记忆ID |
| user_id | VARCHAR | 用户ID |
| event_type | VARCHAR | 事件类型 |
| old_level | VARCHAR | 原层级 |
| new_level | VARCHAR | 新层级 |
| trigger | VARCHAR | 触发原因 |
| session_id | VARCHAR | 会话ID |
| created_at | DATETIME | 创建时间 |

---

## API 接口

### 基础路径

```
/api/v1/memories
```

### 端点列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/summary` | 获取记忆统计 |
| GET | `/level/{level}` | 按层级获取记忆 |
| GET | `/{memory_id}` | 获取记忆详情 |
| POST | `/analyze` | 分析面试会话 |
| POST | `/correct` | 记录正确回答 |
| DELETE | `/{memory_id}` | 删除记忆 |

---

### GET /memories/summary

获取用户记忆统计信息。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | string | 否 | 用户ID，默认 default_user |

**响应示例：**

```json
{
    "total": 15,
    "l1_count": 3,
    "l2_count": 8,
    "l3_count": 4,
    "topics": ["Redis", "MySQL", "算法", "系统设计"],
    "error_types": {
        "blind_spot": 5,
        "weakness": 6,
        "misconception": 2,
        "knowledge_gap": 2
    }
}
```

---

### GET /memories/level/{level}

按层级获取记忆列表。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| level | string | 层级：L1, L2, L3 |

**响应示例：**

```json
{
    "memories": [
        {
            "memory_id": "mem_abc123",
            "content": "技术盲点：Redis 跳表实现。表现：缺乏底层认知。",
            "level": "L1",
            "topic": "Redis",
            "error_type": "blind_spot",
            "error_count": 3,
            "created_at": "2026-03-28T10:00:00"
        }
    ],
    "total": 3
}
```

---

### POST /memories/analyze

分析面试会话，提取并存储记忆。

**请求体：**

```json
{
    "session_id": "interview_1234567890_abc123",
    "history": [
        {"role": "user", "content": "我不太了解Redis的跳表..."},
        {"role": "assistant", "content": "跳表是Redis有序集合的底层实现..."}
    ]
}
```

**响应示例：**

```json
{
    "processed": 2,
    "results": [
        {
            "action": "created",
            "memory_id": "mem_xyz789",
            "level": "L2"
        },
        {
            "action": "updated",
            "memory_id": "mem_abc123",
            "level": "L1"
        }
    ]
}
```

---

### POST /memories/correct

记录用户正确回答，触发记忆降级。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| topic | string | 是 | 知识点主题 |
| session_id | string | 是 | 会话ID |

**响应示例：**

```json
{
    "action": "corrected",
    "count": 2
}
```

---

## 集成指南

### 面试服务集成

```python
from app.services.memory import MemoryService

# 面试开始时
async def start_interview(user_id: str, position: str):
    memory_service = MemoryService(db)
    
    # 获取用户记忆
    memories = await memory_service.get_context_for_interview(user_id, position)
    
    # 构建增强提示
    enhanced_prompt = await memory_service.build_system_prompt(
        memories, 
        base_prompt="你是一位面试官..."
    )
    
    # 初始化 AI 面试官
    interview_service.create_session(
        session_id, 
        enhanced_prompt=enhanced_prompt
    )

# 面试结束时
async def end_interview(session_id: str, history: List):
    memory_service = MemoryService(db)
    
    # 处理对话，提取记忆
    result = await memory_service.process_interview_result(
        user_id=user_id,
        session_id=session_id,
        history=history
    )
    
    return result
```

### 前端集成

```typescript
// 获取记忆统计
const summary = await fetch('/api/v1/memories/summary');

// 获取 L1 必考项
const l1Memories = await fetch('/api/v1/memories/level/L1');

// 分析面试结果
await fetch('/api/v1/memories/analyze', {
    method: 'POST',
    body: JSON.stringify({
        session_id: 'xxx',
        history: [...]
    })
});
```

---

## 配置说明

### 环境变量

```bash
# Mem0 配置（使用云服务时）
MEM0_API_KEY=your_mem0_api_key

# Qdrant 配置（自托管时）
QDRANT_HOST=localhost
QDRANT_PORT=6333
```

### 阈值配置

```python
# services/memory/memory_auditor.py

UPGRADE_THRESHOLD = 2           # 升级阈值
L1_DOWNGRADE_THRESHOLD = 3      # L1 降级阈值
L2_DOWNGRADE_THRESHOLD = 2      # L2 降级阈值
SIMILARITY_THRESHOLD = 0.85     # 相似度阈值
```

```python
# services/memory/memory_retrieval.py

L1_LIMIT = 20                   # L1 最大加载量
L2_RATIO = 0.3                  # L2 抽样比例
L2_MIN = 3                      # L2 最小抽样数
L2_MAX = 10                     # L2 最大抽样数
L3_RATIO = 0.1                  # L3 抽样比例
L3_MIN = 1                      # L3 最小抽样数
L3_MAX = 3                      # L3 最大抽样数
```

---

## 最佳实践

### 1. 记忆写入

- 面试结束后异步处理，不阻塞响应
- 只记录有价值的错误，忽略轻微问题
- 定期清理过期记忆

### 2. 记忆检索

- 根据面试类型筛选相关记忆
- 控制总记忆量，避免提示过长
- 平衡各层级记忆比例

### 3. 隐私保护

- 所有用户输入先脱敏再存储
- 不存储原始对话，只保留总结
- 定期审计记忆内容

### 4. 性能优化

```python
# 使用缓存减少数据库查询
from functools import lru_cache

@lru_cache(maxsize=100)
async def get_cached_memories(user_id: str):
    return await memory_service.get_context_for_interview(user_id)
```

---

## 附录

### 文件结构

```
server/
├── app/
│   ├── models/
│   │   └── memory.py              # 数据模型
│   ├── routers/
│   │   └── memory.py              # API 路由
│   └── services/
│       └── memory/
│           ├── __init__.py
│           ├── mem0_client.py     # Mem0 客户端
│           ├── memory_processor.py # 记忆处理器
│           ├── memory_auditor.py   # 记忆审计器
│           ├── memory_retrieval.py # 记忆检索器
│           ├── prompt_builder.py   # 提示构建器
│           └── memory_service.py   # 统一服务
└── docs/
    └── MEMORY_SYSTEM.md           # 本文档
```

### 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-03-28 | 初始版本，实现核心功能 |

---

*文档结束*
