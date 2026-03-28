# Agent 记忆系统 - 后端实现任务

> 架构设计完成，现分配任务给 backend-developer

---

## 任务概览

| 任务ID | 任务名称 | 优先级 | 依赖 | 预估工时 |
|--------|----------|--------|------|----------|
| MEM-001 | 数据库模型创建 | P0 | 无 | 1h |
| MEM-002 | Mem0 客户端封装 | P0 | 无 | 1h |
| MEM-003 | Memory Processor 实现 | P0 | MEM-002 | 2h |
| MEM-004 | Memory Auditor 实现 | P0 | MEM-001, MEM-002 | 2h |
| MEM-005 | Memory Retrieval 实现 | P0 | MEM-002 | 1h |
| MEM-006 | Prompt Builder 实现 | P0 | MEM-005 | 0.5h |
| MEM-007 | Memory Service 整合 | P0 | MEM-003~006 | 1h |
| MEM-008 | 集成到 InterviewService | P0 | MEM-007 | 1h |
| MEM-009 | API 路由实现 | P1 | MEM-007 | 1h |
| MEM-010 | 单元测试 | P1 | MEM-001~009 | 2h |

**总计：约 12.5 小时**

---

## MEM-001: 数据库模型创建

### 任务描述
创建记忆系统所需的数据库模型。

### 架构上下文
参考：`docs/arch/ARCH_DESIGN_v3.md`

### 实现要求

创建文件：`server/app/models/memory.py`

```python
# 需要创建以下模型：
# 1. MemoryMeta - 记忆元数据
# 2. MemoryEvent - 记忆事件日志
# 3. MemoryAudit - 记忆审计记录
```

### 字段定义

**MemoryMeta**:
- id (Integer, PK)
- memory_id (String, unique, index) - Mem0返回的ID
- user_id (String, index)
- level (String, default="L2") - L1/L2/L3
- error_type (String) - blind_spot/misconception/weakness
- topic (String)
- summary (Text)
- error_count (Integer, default=1)
- correct_count (Integer, default=0)
- vector_hash (String)
- source_session_id (String)
- source_turn_index (Integer)
- created_at, upgraded_at, downgraded_at, last_accessed_at (DateTime)

**MemoryEvent**:
- id (Integer, PK)
- memory_id (String, index)
- user_id (String, index)
- event_type (String) - created/upgraded/downgraded/accessed
- old_level (String, nullable)
- new_level (String, nullable)
- trigger (String)
- session_id (String)
- created_at (DateTime)

**MemoryAudit**:
- id (Integer, PK)
- user_id (String, index)
- original_content (Text)
- processed_content (Text)
- sanitized (Boolean)
- processor_version (String)
- processing_time_ms (Integer)
- created_at (DateTime)

### 验收标准
- [ ] 模型定义完整
- [ ] 在 `models/__init__.py` 中导出
- [ ] 数据库迁移成功

---

## MEM-002: Mem0 客户端封装

### 任务描述
创建 Mem0 客户端，封装常用操作。

### 技术栈
- Python 3.10+
- mem0ai 库

### 实现要求

创建文件：`server/app/services/memory/__init__.py`
创建文件：`server/app/services/memory/mem0_client.py`

### 依赖安装
```bash
pip install mem0ai
```

### 类接口
```python
class Mem0Client:
    async def add(user_id, content, metadata) -> dict
    async def search(user_id, query, filters, limit) -> List[dict]
    async def update(memory_id, data) -> dict
    async def delete(memory_id) -> bool
    async def get_all(user_id) -> List[dict]
```

### 配置
从环境变量读取：
- MEM0_API_KEY (使用Mem0 Cloud时)
- QDRANT_HOST, QDRANT_PORT (自托管时)

### 验收标准
- [ ] 客户端初始化成功
- [ ] 基本 CRUD 操作可用
- [ ] 错误处理完善

---

## MEM-003: Memory Processor 实现

### 任务描述
实现记忆处理器，包含脱敏和总结功能。

### 实现要求

创建文件：`server/app/services/memory/memory_processor.py`

### 核心功能

1. **脱敏引擎** `sanitize(text: str) -> str`
   - 姓名脱敏
   - 公司名脱敏
   - 项目代号脱敏
   - 手机号脱敏
   - 使用正则表达式

2. **总结引擎** `summarize(conversation: str) -> Dict`
   - 调用 LLM 分析
   - 返回结构化错误模型
   - 包含 error_type, topic, problem, manifestation

3. **完整处理流程** `process(conversation, context) -> ProcessedMemory`

### 脱敏规则（正则表达式）
```python
SANITIZATION_RULES = {
    r"(我叫|我是|姓名[是为])\s*[^\s，。！？]{2,4}": r"\1[姓名]",
    r"(在|就职于|供职于)\s*[^\s，。！？]{2,10}(公司|科技|集团)": r"\1[公司]\2",
    # ... 更多规则
}
```

### 验收标准
- [ ] 脱敏功能正常，敏感信息被替换
- [ ] 总结功能返回结构化数据
- [ ] 单元测试覆盖

---

## MEM-004: Memory Auditor 实现

### 任务描述
实现记忆审计器（状态机），管理记忆层级转换。

### 实现要求

创建文件：`server/app/services/memory/memory_auditor.py`

### 状态机规则

```
L2 --(相同错误再次发生, count>=2)--> L1
L1 --(正确回答3次)--> L3
L2 --(正确回答2次)--> L3
```

### 核心方法

```python
class MemoryAuditor:
    async def process_error(user_id, processed_memory, session_id) -> Dict
    async def process_correct(user_id, topic, session_id) -> Dict
    async def check_similar_memory(user_id, vector, candidates) -> Optional[Dict]
    async def get_memory_stats(user_id) -> Dict
```

### 阈值配置
```python
UPGRADE_THRESHOLD = 2          # L2 → L1
L1_DOWNGRADE_THRESHOLD = 3     # L1 → L3
L2_DOWNGRADE_THRESHOLD = 2     # L2 → L3
SIMILARITY_THRESHOLD = 0.85    # 向量相似度
```

### 验收标准
- [ ] 状态转换逻辑正确
- [ ] 事件日志记录完整
- [ ] 边界情况处理

---

## MEM-005: Memory Retrieval 实现

### 任务描述
实现记忆检索服务，按层级获取记忆。

### 实现要求

创建文件：`server/app/services/memory/memory_retrieval.py`

### 检索策略

| 层级 | 策略 | 参数 |
|------|------|------|
| L1 | 全量加载 | limit=20 |
| L2 | 比例抽样 | ratio=0.3, min=3, max=10 |
| L3 | 比例抽样 | ratio=0.1, min=1, max=3 |

### 核心方法

```python
class MemoryRetrieval:
    async def get_context_memories(user_id, topic) -> Dict[str, List]
    def _sample(items, ratio, min_count, max_count) -> List
    async def get_by_topic(user_id, topic) -> List
```

### 验收标准
- [ ] L1 全量返回
- [ ] L2/L3 按比例抽样
- [ ] 抽样结果随机且有上下限

---

## MEM-006: Prompt Builder 实现

### 任务描述
基于检索到的记忆构建系统提示。

### 实现要求

创建文件：`server/app/services/memory/prompt_builder.py`

### Prompt 模板
```python
TEMPLATE = '''
你是一位严厉的面试官。基于候选人过往表现，你需要重点关注：

【必考项（顽固问题）】
{l1_section}

【参考项（近期弱点）】
{l2_section}

【抽查项（曾犯错但已修复）】
{l3_section}

面试规则：
1. 必考项必须提问...
2. 参考项选择性追问...
3. 抽查项偶尔验证...
'''
```

### 核心方法

```python
class MemoryPromptBuilder:
    async def build_system_prompt(memories, base_prompt) -> str
    def _format_section(memories, default_text) -> str
```

### 验收标准
- [ ] Prompt 格式正确
- [ ] 支持与基础 Prompt 合并
- [ ] 空记忆时输出友好提示

---

## MEM-007: Memory Service 整合

### 任务描述
创建 MemoryService 整合所有组件，提供统一接口。

### 实现要求

创建文件：`server/app/services/memory/memory_service.py`

### 服务接口

```python
class MemoryService:
    def __init__(self, mem0_client, db_session):
        self.processor = MemoryProcessor()
        self.auditor = MemoryAuditor(mem0_client, db_session)
        self.retrieval = MemoryRetrieval(mem0_client)
        self.prompt_builder = MemoryPromptBuilder()
    
    # 面试开始时调用
    async def get_context_for_interview(user_id, topic) -> Dict
    
    # 面试进行时调用
    async def build_system_prompt(memories, base_prompt) -> str
    
    # 面试结束时调用
    async def process_interview_result(user_id, session_id, history, analysis) -> Dict
    
    # 用户正确回答时调用
    async def record_correct_answer(user_id, topic, session_id) -> Dict
    
    # 获取用户记忆统计
    async def get_user_memory_stats(user_id) -> Dict
```

### 验收标准
- [ ] 所有组件正确初始化
- [ ] 接口调用流程顺畅
- [ ] 错误处理统一

---

## MEM-008: 集成到 InterviewService

### 任务描述
修改现有 InterviewService，集成记忆系统。

### 修改文件
`server/app/services/interview.py`

### 修改点

1. **初始化时注入 MemoryService**
```python
def __init__(self, memory_service: MemoryService = None):
    self.memory_service = memory_service
```

2. **创建会话时获取记忆**
```python
async def create_session(self, ...):
    memories = await self.memory_service.get_context_for_interview(user_id)
    enhanced_prompt = await self.memory_service.build_system_prompt(memories, base_prompt)
```

3. **结束时处理记忆**
```python
async def end_session(self, session_id):
    # 分析错误点
    # 调用 memory_service.process_interview_result()
```

### 验收标准
- [ ] 面试开始时系统提示包含记忆
- [ ] 面试结束时记忆被处理和存储
- [ ] 不影响现有功能

---

## MEM-009: API 路由实现

### 任务描述
创建记忆相关的 API 路由。

### 实现要求

创建文件：`server/app/routers/memory.py`

### API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /memories/summary | 获取用户记忆统计 |
| GET | /memories/level/{level} | 按层级获取记忆列表 |
| GET | /memories/{memory_id} | 获取单条记忆详情 |
| POST | /memories/analyze | 分析面试会话（后台任务） |
| DELETE | /memories/{memory_id} | 删除记忆 |

### 响应格式
```python
# GET /memories/summary
{
    "total": 15,
    "l1_count": 3,
    "l2_count": 8,
    "l3_count": 4,
    "topics": ["Redis", "算法", "系统设计"]
}

# GET /memories/level/L1
{
    "memories": [
        {
            "memory_id": "xxx",
            "content": "技术盲点：Redis...",
            "error_count": 3,
            "created_at": "2026-03-28T..."
        }
    ],
    "total": 3
}
```

### 验收标准
- [ ] 所有端点正常工作
- [ ] 参数验证完善
- [ ] 错误响应格式统一

---

## MEM-010: 单元测试

### 任务描述
为记忆系统编写单元测试。

### 实现要求

创建文件：`server/tests/test_memory.py`

### 测试覆盖

1. **MemoryProcessor 测试**
   - 脱敏功能测试
   - 总结功能测试
   - 边界情况

2. **MemoryAuditor 测试**
   - L2 → L1 升级测试
   - L1 → L3 降级测试
   - L2 → L3 降级测试

3. **MemoryRetrieval 测试**
   - L1 全量加载测试
   - L2/L3 抽样测试

4. **PromptBuilder 测试**
   - Prompt 生成测试
   - 空记忆处理测试

### 验收标准
- [ ] 测试覆盖率 > 80%
- [ ] 所有测试通过
- [ ] 边界情况覆盖

---

## 实现顺序

```
MEM-001 ─────┐
             ├──► MEM-004 ──┐
MEM-002 ─────┤              │
             │              │
MEM-003 ─────┤              │
             │              │
MEM-005 ─────┤              │
             │              ▼
MEM-006 ─────┴──────► MEM-007 ──► MEM-008 ──► MEM-009
                                              │
                                              ▼
                                         MEM-010
```

---

## 环境变量配置

添加到 `.env`:
```
# Mem0 配置
MEM0_API_KEY=your_mem0_api_key

# Qdrant 配置（如自托管）
QDRANT_HOST=localhost
QDRANT_PORT=6333
```

---

## 文件结构

```
server/
├── app/
│   ├── models/
│   │   └── memory.py          # MEM-001
│   ├── routers/
│   │   └── memory.py          # MEM-009
│   └── services/
│       └── memory/
│           ├── __init__.py    # MEM-002
│           ├── mem0_client.py # MEM-002
│           ├── memory_processor.py   # MEM-003
│           ├── memory_auditor.py     # MEM-004
│           ├── memory_retrieval.py   # MEM-005
│           ├── prompt_builder.py     # MEM-006
│           └── memory_service.py     # MEM-007
└── tests/
    └── test_memory.py         # MEM-010
```

---

*任务分配完成，等待 backend-developer 开始实现*
