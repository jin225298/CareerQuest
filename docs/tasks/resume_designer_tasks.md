# 简历设计师功能 - 任务分发文档

## 一、需求概述

### 1.1 功能目标
创建AI驱动的简历设计功能，根据用户的求职画像、项目经历、技能知识，帮助用户定制或优化简历。

### 1.2 UI调整
- 将首页"FIGHT"按钮从侧边栏移到底部中心位置（更显眼）
- 将"求职设置"按钮从底部移到侧边栏
- 新增"RESUME"入口按钮

---

## 二、任务概览表

| 任务ID | 任务名称 | 负责角色 | 优先级 | 预估工时 | 依赖任务 |
|--------|----------|----------|--------|----------|----------|
| DB-001 | 新增Project表 | database-developer | P0 | 2h | - |
| DB-002 | 新增Skill表 | database-developer | P0 | 1h | - |
| DB-003 | 数据库迁移脚本 | database-developer | P0 | 1h | DB-001, DB-002 |
| BE-001 | 创建Resume路由 | backend-developer | P0 | 2h | DB-003 |
| BE-002 | 项目管理API | backend-developer | P0 | 3h | DB-001 |
| BE-003 | 技能管理API | backend-developer | P1 | 2h | DB-002 |
| AI-001 | 简历生成Prompt | ai-developer | P0 | 3h | - |
| AI-002 | 简历优化Prompt | ai-developer | P1 | 2h | AI-001 |
| AI-003 | 简历生成服务 | backend-developer | P0 | 4h | BE-001, AI-001 |
| FE-001 | ResumeDesignerPage页面 | frontend-developer | P0 | 4h | BE-001 |
| FE-002 | ProjectForm组件 | frontend-developer | P0 | 2h | FE-001 |
| FE-003 | SkillInput组件 | frontend-developer | P1 | 2h | FE-001 |
| FE-004 | ResumePreview组件 | frontend-developer | P1 | 3h | FE-001, AI-003 |
| FE-005 | HomePage布局调整 | frontend-developer | P0 | 2h | - |

---

## 三、依赖关系图

```
                    ┌─────────────┐
                    │   DB-001    │
                    │ Project表   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   DB-002    │
                    │  Skill表    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   DB-003    │
                    │ 迁移脚本    │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
  ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
  │   BE-001    │   │   BE-002    │   │   BE-003    │
  │ Resume路由  │   │ 项目管理API │   │ 技能管理API │
  └──────┬──────┘   └──────┬──────┘   └─────────────┘
         │                 │
         │         ┌───────┴───────┐
         │         │               │
  ┌──────▼──────┐  │  ┌────────────┐
  │   AI-001    │◄─┼──│  FE-001    │
  │ 简历生成P.  │  │  │ Resume页面 │
  └──────┬──────┘  │  └─────┬──────┘
         │         │        │
  ┌──────▼──────┐  │  ┌─────┴──────┐
  │   AI-002    │  │  │            │
  │ 简历优化P.  │  │  ▼            ▼
  └──────┬──────┘  │ FE-002    FE-003
         │         │项目表单   技能输入
  ┌──────▼──────┐  │
  │   AI-003    │◄─┘
  │ 简历生成服务│
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │   FE-004    │
  │ 简历预览组件│
  └─────────────┘

  ┌─────────────┐
  │   FE-005    │ (独立任务)
  │ 首页布局调整│
  └─────────────┘
```

---

## 四、详细任务卡片

### 4.1 数据库任务 (database-developer)

---

#### DB-001: 新增Project表

**优先级**: P0  
**预估工时**: 2小时  
**状态**: 待开始

**描述**: 创建项目经历表，存储用户的项目信息

**表结构设计**:
```python
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)           # 项目名称
    description = Column(Text, nullable=True)            # 项目描述
    tech_stack = Column(JSON, default=list)              # 技术栈 ["Python", "React"]
    role = Column(String(100), nullable=True)            # 项目角色
    start_date = Column(DateTime, nullable=True)         # 开始时间
    end_date = Column(DateTime, nullable=True)           # 结束时间
    is_ongoing = Column(Boolean, default=False)          # 是否进行中
    project_url = Column(String(500), nullable=True)     # 项目链接
    github_url = Column(String(500), nullable=True)      # GitHub链接
    highlights = Column(JSON, default=list)              # 项目亮点
    order = Column(Integer, default=0)                   # 排序权重
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**验收标准**:
- [ ] 表创建成功
- [ ] 外键约束正确
- [ ] 索引创建完成

---

#### DB-002: 新增Skill表

**优先级**: P0  
**预估工时**: 1小时  
**状态**: 待开始

**描述**: 创建技能表，存储用户的技能信息

**表结构设计**:
```python
class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)           # 技能名称
    category = Column(String(50), nullable=True)         # 分类: frontend/backend/devops等
    proficiency = Column(String(20), default="中级")      # 熟练度: 精通/熟练/了解
    years_of_experience = Column(Integer, default=0)     # 使用年限
    is_verified = Column(Boolean, default=False)         # 是否已验证
    order = Column(Integer, default=0)                   # 排序权重
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**验收标准**:
- [ ] 表创建成功
- [ ] 外键约束正确
- [ ] 索引创建完成

---

#### DB-003: 数据库迁移脚本

**优先级**: P0  
**预估工时**: 1小时  
**状态**: 待开始  
**依赖**: DB-001, DB-002

**描述**: 生成并执行数据库迁移脚本

**任务内容**:
1. 在 `server/app/models/__init__.py` 中导入新模型
2. 生成 Alembic 迁移脚本
3. 执行迁移

**验收标准**:
- [ ] 迁移脚本生成成功
- [ ] 迁移执行无报错
- [ ] 数据库表创建成功

---

### 4.2 后端任务 (backend-developer)

---

#### BE-001: 创建Resume路由

**优先级**: P0  
**预估工时**: 2小时  
**状态**: 待开始  
**依赖**: DB-003

**描述**: 创建简历相关的API路由

**文件位置**: `server/app/routers/resume.py`

**路由设计**:
```python
router = APIRouter(prefix="/resume")

# 获取用户简历数据（包含个人信息、项目、技能）
GET /api/v1/resume

# 项目管理
POST   /api/v1/resume/projects           # 添加项目
GET    /api/v1/resume/projects/{id}      # 获取单个项目
PUT    /api/v1/resume/projects/{id}      # 更新项目
DELETE /api/v1/resume/projects/{id}      # 删除项目
GET    /api/v1/resume/projects           # 获取项目列表

# 技能管理
POST   /api/v1/resume/skills             # 添加技能
PUT    /api/v1/resume/skills/{id}        # 更新技能
DELETE /api/v1/resume/skills/{id}        # 删除技能
GET    /api/v1/resume/skills             # 获取技能列表

# AI功能
POST   /api/v1/resume/generate           # AI生成简历
POST   /api/v1/resume/optimize           # AI优化简历
POST   /api/v1/resume/analyze            # AI分析简历问题
```

**验收标准**:
- [ ] 路由文件创建成功
- [ ] 在 main.py 中注册路由
- [ ] 基本CRUD接口可用

---

#### BE-002: 项目管理API

**优先级**: P0  
**预估工时**: 3小时  
**状态**: 待开始  
**依赖**: DB-001

**描述**: 实现项目的增删改查接口

**接口详情**:

**POST /api/v1/resume/projects** - 创建项目
```json
// Request
{
  "name": "电商平台开发",
  "description": "负责后端API设计和实现...",
  "tech_stack": ["Python", "FastAPI", "PostgreSQL"],
  "role": "后端开发",
  "start_date": "2024-01-01",
  "end_date": "2024-06-30",
  "project_url": "https://example.com"
}

// Response
{
  "id": 1,
  "name": "电商平台开发",
  ...
  "created_at": "2024-01-01T00:00:00Z"
}
```

**PUT /api/v1/resume/projects/{id}** - 更新项目
**DELETE /api/v1/resume/projects/{id}** - 删除项目
**GET /api/v1/resume/projects** - 获取项目列表

**验收标准**:
- [ ] 创建项目接口正常工作
- [ ] 更新项目接口正常工作
- [ ] 删除项目接口正常工作
- [ ] 列表查询接口正常工作
- [ ] 数据验证正确

---

#### BE-003: 技能管理API

**优先级**: P1  
**预估工时**: 2小时  
**状态**: 待开始  
**依赖**: DB-002

**描述**: 实现技能的增删改查接口

**接口详情**:

**POST /api/v1/resume/skills** - 添加技能
```json
// Request
{
  "name": "Python",
  "category": "backend",
  "proficiency": "精通",
  "years_of_experience": 5
}
```

**验收标准**:
- [ ] CRUD接口全部可用
- [ ] 数据验证正确

---

### 4.3 AI任务 (ai-developer)

---

#### AI-001: 简历生成Prompt

**优先级**: P0  
**预估工时**: 3小时  
**状态**: 待开始

**描述**: 设计AI生成简历的Prompt模板

**输入数据**:
- 用户求职画像（career, experience, goals, weakness等）
- 项目经历列表
- 技能列表
- 目标岗位（可选）

**输出**:
- 结构化简历内容（JSON格式）
- 包含：个人简介、技能亮点、项目经历描述、求职意向

**Prompt设计要点**:
1. 根据用户画像生成个性化的个人简介
2. 将项目经历转化为STAR格式的描述
3. 突出与目标岗位匹配的技能
4. 针对用户weakness补充学习经历

**验收标准**:
- [ ] Prompt生成的内容结构完整
- [ ] 内容与用户画像匹配
- [ ] 输出格式为可解析的JSON

---

#### AI-002: 简历优化Prompt

**优先级**: P1  
**预估工时**: 2小时  
**状态**: 待开始  
**依赖**: AI-001

**描述**: 设计AI优化简历的Prompt模板

**输入数据**:
- 用户现有简历内容
- 目标岗位JD（可选）
- 优化方向（可选）

**输出**:
- 优化建议列表
- 优化后的简历内容

**优化方向**:
1. 关键词优化（匹配JD）
2. 描述优化（STAR格式）
3. 量化成果（添加数字指标）
4. 排版建议

**验收标准**:
- [ ] 优化建议准确有效
- [ ] 优化后内容更专业

---

### 4.4 后端AI服务任务 (backend-developer)

---

#### AI-003: 简历生成服务

**优先级**: P0  
**预估工时**: 4小时  
**状态**: 待开始  
**依赖**: BE-001, AI-001

**描述**: 创建简历生成的后端服务

**文件位置**: `server/app/services/resume_generator.py`

**服务设计**:
```python
class ResumeGenerator:
    async def generate_resume(
        self,
        user_id: str,
        target_position: Optional[str] = None
    ) -> dict:
        """生成简历"""
        # 1. 获取用户画像
        # 2. 获取项目经历
        # 3. 获取技能列表
        # 4. 调用AI生成
        # 5. 返回结构化数据
        pass

    async def optimize_resume(
        self,
        resume_content: dict,
        job_description: Optional[str] = None
    ) -> dict:
        """优化简历"""
        pass

    async def analyze_resume(
        self,
        resume_content: dict
    ) -> list:
        """分析简历问题"""
        pass
```

**验收标准**:
- [ ] 生成服务正常工作
- [ ] 优化服务正常工作
- [ ] 分析服务正常工作
- [ ] 错误处理完善

---

### 4.5 前端任务 (frontend-developer)

---

#### FE-001: ResumeDesignerPage页面

**优先级**: P0  
**预估工时**: 4小时  
**状态**: 待开始  
**依赖**: BE-001

**描述**: 创建简历设计主页面

**文件位置**: `client/src/pages/ResumeDesignerPage.tsx`

**页面结构**:
```
┌─────────────────────────────────────────────────┐
│  📄 简历设计师                                    │
├─────────────────────────────────────────────────┤
│  [个人信息] [项目经历] [技能] [预览]    ← Tab切换  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Tab内容区域                                    │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│  [✨ AI生成简历]  [🔧 AI优化简历]  [📥 导出]      │
└─────────────────────────────────────────────────┘
```

**验收标准**:
- [ ] 页面创建成功
- [ ] Tab切换正常
- [ ] 路由配置正确

---

#### FE-002: ProjectForm组件

**优先级**: P0  
**预估工时**: 2小时  
**状态**: 待开始  
**依赖**: FE-001

**描述**: 创建项目表单组件

**文件位置**: `client/src/components/ProjectForm.tsx`

**组件功能**:
- 项目名称输入
- 项目描述（多行文本）
- 技术栈标签输入
- 时间范围选择
- 项目链接输入
- 提交/取消按钮

**验收标准**:
- [ ] 表单验证正确
- [ ] 提交功能正常
- [ ] 编辑模式支持

---

#### FE-003: SkillInput组件

**优先级**: P1  
**预估工时**: 2小时  
**状态**: 待开始  
**依赖**: FE-001

**描述**: 创建技能输入组件

**文件位置**: `client/src/components/SkillInput.tsx`

**组件功能**:
- 技能名称输入（带自动补全）
- 分类选择（下拉菜单）
- 熟练度选择
- 使用年限输入
- 已添加技能列表展示

**验收标准**:
- [ ] 添加技能功能正常
- [ ] 删除技能功能正常
- [ ] 自动补全可用

---

#### FE-004: ResumePreview组件

**优先级**: P1  
**预估工时**: 3小时  
**状态**: 待开始  
**依赖**: FE-001, AI-003

**描述**: 创建简历预览组件

**文件位置**: `client/src/components/ResumePreview.tsx`

**组件功能**:
- 简历预览展示
- 导出PDF功能
- 复制到剪贴板

**验收标准**:
- [ ] 预览渲染正确
- [ ] 导出功能正常

---

#### FE-005: HomePage布局调整

**优先级**: P0  
**预估工时**: 2小时  
**状态**: 待开始

**描述**: 调整首页按钮布局

**修改内容**:

**侧边栏（原位置）**:
```
右侧菜单：
├── CHAR (角色属性)
├── STATS (数据统计)
├── WINS (成就)
├── MEMORY (面试记录)
├── AVATAR (头像生成)
├── RESUME (简历设计) ← 新增
├── VOICE (语音面试)
├── TREE (树洞)
└── 设置 (求职设置) ← 移到这里
```

**底部中心**:
```
└── FIGHT (开始面试) ← 移到这里，更显眼
```

**代码修改位置**: `client/src/pages/HomePage.tsx`
- 第384-397行：FIGHT按钮 → 移到底部
- 第466-491行：求职设置按钮 → 移到侧边栏
- 新增RESUME按钮

**验收标准**:
- [ ] FIGHT按钮移到底部中心
- [ ] 求职设置按钮移到侧边栏
- [ ] RESUME按钮添加成功
- [ ] 页面布局美观协调

---

## 五、API接口规范

### 5.1 获取简历数据

```
GET /api/v1/resume
```

**Response**:
```json
{
  "profile": {
    "career": "软件开发",
    "experience": "3-5年",
    "target_position": "高级后端工程师",
    "goals": ["提升表达能力", "熟悉面试流程"]
  },
  "projects": [
    {
      "id": 1,
      "name": "电商平台开发",
      "description": "负责后端API设计和实现...",
      "tech_stack": ["Python", "FastAPI"],
      "role": "后端开发",
      "start_date": "2024-01-01",
      "end_date": "2024-06-30"
    }
  ],
  "skills": [
    {
      "id": 1,
      "name": "Python",
      "category": "backend",
      "proficiency": "精通",
      "years_of_experience": 5
    }
  ]
}
```

### 5.2 AI生成简历

```
POST /api/v1/resume/generate
```

**Request**:
```json
{
  "target_position": "高级后端工程师",
  "focus_areas": ["项目经验", "技术深度"]
}
```

**Response**:
```json
{
  "summary": "5年后端开发经验，专注于Python技术栈...",
  "highlights": [
    "主导电商平台后端架构设计，支撑日均10万订单",
    "精通Python、FastAPI，有微服务架构经验"
  ],
  "projects": [
    {
      "name": "电商平台开发",
      "description": "使用STAR格式优化后的项目描述..."
    }
  ],
  "skills": {
    "backend": ["Python", "FastAPI", "PostgreSQL"],
    "devops": ["Docker", "Kubernetes"]
  }
}
```

### 5.3 AI优化简历

```
POST /api/v1/resume/optimize
```

**Request**:
```json
{
  "resume_content": {
    "summary": "原始简介...",
    "projects": [...]
  },
  "job_description": "岗位JD内容..."
}
```

**Response**:
```json
{
  "suggestions": [
    {
      "type": "keyword",
      "message": "建议添加关键词：微服务、分布式"
    },
    {
      "type": "quantify",
      "message": "项目描述建议添加量化指标"
    }
  ],
  "optimized_content": {
    "summary": "优化后的简介...",
    "projects": [...]
  }
}
```

---

## 六、UI设计规范

### 6.1 首页新布局

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ┌─────┐                                               │
│   │POWER│                            ┌───┐             │
│   │MOOD │                            │CHAR│             │
│   └─────┘                            ├───┤             │
│                                      │STATS             │
│              ┌───────┐               ├───┤             │
│              │       │               │WINS│             │
│              │ 头像  │               ├───┤             │
│              │       │               │MEMO│             │
│              └───────┘               ├───┤             │
│                                      │AVATAR            │
│                                      ├───┤             │
│                                      │RESUME│ ← 新增    │
│                                      ├───┤             │
│                                      │VOICE│            │
│                                      ├───┤             │
│                                      │TREE │            │
│                                      ├───┤             │
│                                      │设置│ ← 移动      │
│  ┌─────────────────────────────────────────────────┐   │
│  │              🎮 FIGHT                            │   │
│  └─────────────────────────────────────────────────┘   │
│                      ↑ 移动到底部中心                    │
└─────────────────────────────────────────────────────────┘
```

### 6.2 简历设计页面

```
┌────────────────────────────────────────────────────────┐
│  📄 简历设计师                                          │
├────────────────────────────────────────────────────────┤
│  [个人信息] [项目经历] [技能] [预览]                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 项目名称: [________________________]              │  │
│  │                                                  │  │
│  │ 项目描述:                                        │  │
│  │ ┌──────────────────────────────────────────────┐ │  │
│  │ │                                              │ │  │
│  │ │                                              │ │  │
│  │ │                                              │ │  │
│  │ └──────────────────────────────────────────────┘ │  │
│  │                                                  │  │
│  │ 技术栈: [Python] [FastAPI] [+]                   │  │
│  │                                                  │  │
│  │ 时间: [2024-01] 至 [2024-06] [进行中]           │  │
│  │                                                  │  │
│  │ 项目链接: [________________________]             │  │
│  │                                                  │  │
│  │              [+ 添加项目] [取消]                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  已添加项目:                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📱 电商平台开发                    [编辑] [删除]  │  │
│  │    Python, FastAPI, PostgreSQL                   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 🌐 官网重构                        [编辑] [删除]  │  │
│  │    React, TypeScript, Node.js                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [✨ AI生成简历]  [🔧 AI优化简历]  [📥 导出PDF]         │
└────────────────────────────────────────────────────────┘
```

---

## 七、开发流程建议

### 7.1 开发顺序

1. **Phase 1 - 数据库层** (Day 1)
   - DB-001 → DB-002 → DB-003

2. **Phase 2 - 后端基础** (Day 1-2)
   - BE-001 → BE-002 → BE-003

3. **Phase 3 - AI层** (Day 2-3)
   - AI-001 → AI-002 → AI-003

4. **Phase 4 - 前端** (Day 3-4)
   - FE-005 (可并行)
   - FE-001 → FE-002 → FE-003 → FE-004

### 7.2 测试要求

- 后端：每个API需有单元测试
- 前端：组件需有基本测试
- 集成测试：AI生成功能需测试

---

## 八、验收清单

### 8.1 功能验收

- [ ] 用户可以添加/编辑/删除项目经历
- [ ] 用户可以添加/编辑/删除技能
- [ ] 用户可以查看AI生成的简历
- [ ] 用户可以使用AI优化简历
- [ ] 用户可以导出简历

### 8.2 UI验收

- [ ] FIGHT按钮在底部中心显眼位置
- [ ] 求职设置按钮在侧边栏
- [ ] RESUME按钮在侧边栏
- [ ] 页面布局美观协调

### 8.3 技术验收

- [ ] 代码通过lint检查
- [ ] 无TypeScript错误
- [ ] API文档完整
- [ ] 数据库迁移可回滚
