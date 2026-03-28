# 任务分发记录

## 项目概述

**需求来源**: 照片生成像素小人功能 + 问卷系统增强  
**分发时间**: 2026-03-27  
**分发者**: 高级程序员

---

## 一、项目现状分析

### 1.1 现有架构

```
面试/
├── server/                    # Python FastAPI 后端
│   └── app/
│       ├── main.py           # 应用入口，已有6个路由模块
│       ├── routers/
│       │   ├── avatar.py     # 像素头像（当前为mock实现）
│       │   └── survey.py     # 问卷系统（5道基础题）
│       └── schemas/
│           ├── avatar.py     # GenerateAvatarRequest, AvatarResponse
│           └── survey.py     # Question, Answer, UserProfile
│
├── client/                    # React + Vite + TypeScript 前端
│   └── src/
│       ├── pages/SurveyPage.tsx  # 问卷页面（硬编码问题）
│       └── lib/api.ts            # API封装（avatarApi, surveyApi）
│
└── pixel_animator/            # 像素生成器服务
    └── pixel_animator.py      # 核心生成逻辑
```

### 1.2 关键依赖

| 组件 | 依赖项 | 说明 |
|------|--------|------|
| pixel_animator | OpenAI SDK, PIL, numpy | 需要设置 `ARK_API_KEY` |
| server | FastAPI, Pydantic | Python 后端框架 |
| client | React, react-hook-form, zod, framer-motion | 前端技术栈 |

### 1.3 现有问题

1. **avatar.py**: 只是 mock 实现，未调用真实的 pixel_animator
2. **SurveyPage.tsx**: 问题硬编码，未使用后端 API 获取问题
3. **问卷问题**: 数量较少（仅5题），缺乏求职深度问题

---

## 二、任务分发

### 2.1 后端任务（分发给 backend-developer）

#### TASK-BE-001: 集成 pixel_animator 到 avatar 接口

**优先级**: P0  
**预估工时**: 4h

**任务描述**:
改造 `server/app/routers/avatar.py`，实现真实的像素头像生成功能。

**上下文**:
- 现有 `pixel_animator/pixel_animator.py` 已有完整实现
- 核心 API: `generate_pixel_animation(input_path, output_dir, ...)`
- 需要处理图片上传、临时文件管理、结果存储

**实现要求**:
1. 新增图片上传接口 `POST /avatars/upload`
   - 接收 multipart/form-data 上传的照片
   - 支持格式: jpg, png, webp
   - 文件大小限制: 5MB

2. 改造 `POST /avatars/generate`:
   - 调用 `pixel_animator.generate_pixel_animation()`
   - 异步处理（使用 BackgroundTasks 或 Celery）
   - 返回任务 ID 供查询

3. 新增状态查询接口 `GET /avatars/{task_id}/status`:
   - 返回生成进度和结果

**依赖关系**:
- 依赖环境变量 `ARK_API_KEY` 已配置
- 需要新增文件存储目录配置

**验收标准**:
- [ ] 上传图片后能正确调用 pixel_animator
- [ ] 生成结果能正确存储并返回 URL
- [ ] 异步任务状态可查询
- [ ] 错误处理完善（API key 缺失、生成失败等）

---

#### TASK-BE-002: 新增 Avatar 相关 Schema

**优先级**: P0  
**预估工时**: 1h

**任务描述**:
扩展 `server/app/schemas/avatar.py`，支持新的接口数据结构。

**实现要求**:
```python
# 新增模型
class UploadAvatarResponse(BaseModel):
    task_id: str
    message: str

class TaskStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"

class AvatarTaskStatus(BaseModel):
    task_id: str
    status: TaskStatus
    progress: int  # 0-100
    result: Optional[AvatarResponse] = None
    error: Optional[str] = None
```

**验收标准**:
- [ ] Schema 定义完整，类型正确
- [ ] 与接口返回数据匹配

---

#### TASK-BE-003: 增强问卷系统 - 后端问题扩展

**优先级**: P1  
**预估工时**: 2h

**任务描述**:
扩展 `server/app/routers/survey.py` 中的 `SURVEY_QUESTIONS`，增加求职相关问题。

**新增问题列表**:

| ID | 问题 | 类型 | 必填 |
|----|------|------|------|
| industry | 你想进入哪个行业？ | single | 是 |
| company_type | 你倾向于什么类型的公司？ | single | 是 |
| salary_range | 你的期望薪资范围？ | single | 是 |
| job_search_status | 你目前的求职状态？ | single | 是 |
| interview_experience | 你有过面试经历吗？ | single | 是 |
| weakness | 你觉得自己的短板是什么？ | multiple | 否 |
| preparation_time | 你每天能投入多少时间准备？ | single | 否 |

**实现要求**:
1. 在 `SURVEY_QUESTIONS` 列表中新增上述问题
2. 更新 `UserProfile` schema 以支持新字段
3. 更新 `submit_survey` 处理逻辑

**验收标准**:
- [ ] 新问题可通过 API 获取
- [ ] 提交时能正确解析所有答案
- [ ] `GET /survey/questions` 返回完整问题列表（12题）

---

#### TASK-BE-004: 新增 UserProfile 字段

**优先级**: P1  
**预估工时**: 0.5h

**任务描述**:
扩展 `server/app/schemas/survey.py` 中的 `UserProfile`。

**实现要求**:
```python
class UserProfile(BaseModel):
    # 现有字段
    career: str
    experience: str
    target_position: Optional[str] = None
    goals: List[str] = []
    style: str
    
    # 新增字段
    industry: Optional[str] = None
    company_type: Optional[str] = None
    salary_range: Optional[str] = None
    job_search_status: Optional[str] = None
    interview_experience: Optional[str] = None
    weakness: List[str] = []
    preparation_time: Optional[str] = None
```

**验收标准**:
- [ ] Schema 更新完成
- [ ] 类型定义正确

---

### 2.2 前端任务（分发给 frontend-developer）

#### TASK-FE-001: 像素头像上传页面

**优先级**: P0  
**预估工时**: 4h

**任务描述**:
创建像素头像生成页面，支持照片上传和结果展示。

**实现要求**:
1. 创建 `client/src/pages/AvatarPage.tsx`
2. 页面功能:
   - 照片上传组件（拖拽 + 点击上传）
   - 上传预览
   - 风格选择（professional/casual/creative）
   - 生成按钮
   - 进度展示
   - 结果展示（静态图 + 动画 GIF）

3. 更新路由: `/avatar`

**UI 参考**:
```
┌─────────────────────────────────────┐
│         像素头像生成器              │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │     拖拽或点击上传照片       │   │
│  │         📷                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  风格: [专业] [休闲] [创意]         │
│                                     │
│  [      生成像素头像      ]         │
│                                     │
│  进度: ████████░░ 80%               │
│                                     │
│  ┌─────────┐  ┌─────────┐          │
│  │ 静态图  │  │ 动画GIF │          │
│  └─────────┘  └─────────┘          │
└─────────────────────────────────────┘
```

**依赖关系**:
- 依赖 TASK-BE-001 的后端接口
- 需要先在 `api.ts` 中添加相关 API 调用

**验收标准**:
- [ ] 上传功能正常工作
- [ ] 能调用后端 API
- [ ] 生成进度实时展示
- [ ] 结果能正确显示

---

#### TASK-FE-002: 扩展 API 封装

**优先级**: P0  
**预估工时**: 1h

**任务描述**:
更新 `client/src/lib/api.ts`，添加头像相关 API。

**实现要求**:
```typescript
export const avatarApi = {
  // 现有
  generate: (data: { career: string; style?: string }) =>
    api.post('/avatars/generate', data),
  
  // 新增
  upload: async (file: File, style?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (style) formData.append('style', style);
    return api.post<UploadAvatarResponse>('/avatars/upload', formData);
  },
  
  getStatus: (taskId: string) =>
    api.get<AvatarTaskStatus>(`/avatars/${taskId}/status`),
};
```

**验收标准**:
- [ ] API 封装完整
- [ ] TypeScript 类型定义正确

---

#### TASK-FE-003: 问卷页面改用 API 获取问题

**优先级**: P1  
**预估工时**: 2h

**任务描述**:
改造 `client/src/pages/SurveyPage.tsx`，从后端 API 动态获取问题列表。

**实现要求**:
1. 移除硬编码的 `questions` 数组
2. 使用 `useEffect` 调用 `surveyApi.getQuestions()`
3. 添加加载状态和错误处理
4. 保持现有的 UI 交互逻辑

**代码改造点**:
```typescript
// 改造前
const questions = [
  { id: 'career', ... },
  // ...
];

// 改造后
const [questions, setQuestions] = useState<Question[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  surveyApi.getQuestions()
    .then(setQuestions)
    .catch(console.error)
    .finally(() => setLoading(false));
}, []);
```

**验收标准**:
- [ ] 问题从后端 API 获取
- [ ] 加载状态展示
- [ ] 错误时友好提示
- [ ] 现有交互功能不受影响

---

#### TASK-FE-004: 问卷提交适配新字段

**优先级**: P1  
**预估工时**: 1h

**任务描述**:
更新问卷提交逻辑，适配后端新增的字段。

**实现要求**:
1. 更新 `surveySchema`，添加新字段验证
2. 确保提交数据格式与后端一致

**验收标准**:
- [ ] 新问题能正确提交
- [ ] 数据格式与后端 API 匹配

---

## 三、任务依赖关系图

```
TASK-BE-002 ─────┐
                 ▼
TASK-BE-001 ◄───────────────── TASK-FE-001
     │                               │
     │                               ▼
     └──────────────────────► TASK-FE-002


TASK-BE-004 ─────┐
                 ▼
TASK-BE-003 ◄───────────────── TASK-FE-003
     │                               │
     └───────────────────────────────┘
                 ▼
           TASK-FE-004
```

---

## 四、执行顺序建议

### Phase 1: 后端基础（先完成）
1. TASK-BE-002: Schema 定义
2. TASK-BE-001: Avatar 接口集成
3. TASK-BE-004: UserProfile 扩展
4. TASK-BE-003: 问卷问题扩展

### Phase 2: 前端开发（后端完成后）
1. TASK-FE-002: API 封装
2. TASK-FE-001: Avatar 页面
3. TASK-FE-003: 问卷动态获取
4. TASK-FE-004: 提交适配

---

## 五、风险点

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| ARK_API_KEY 配置问题 | 像素生成失败 | 增加环境检测和友好错误提示 |
| 图片生成耗时较长 | 用户等待体验差 | 使用异步任务 + 进度展示 |
| 图床上传失败 | 无法获取图片URL | 使用 base64 作为 fallback |

---

## 六、验收检查清单

### 后端验收
- [ ] `POST /avatars/upload` 接口可用
- [ ] `GET /avatars/{task_id}/status` 接口可用
- [ ] `GET /survey/questions` 返回12道题目
- [ ] `POST /survey/submit` 正确处理所有答案

### 前端验收
- [ ] 头像上传页面 `/avatar` 可访问
- [ ] 上传 → 生成 → 展示流程完整
- [ ] 问卷页面从 API 加载问题
- [ ] 问卷提交成功

---

**文档版本**: v1.0  
**最后更新**: 2026-03-27
