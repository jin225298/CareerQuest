# 问卷系统重构任务分发

## 一、需求变更概述

**定位调整**：从"面试前问卷"改为"用户初始设置/求职画像"

**核心目的**：
1. 帮助用户明确求职方向
2. 为用户打标签（用于匹配推荐）
3. 个人信息展示、简历生成、项目推荐

---

## 二、现有代码分析

### 2.1 用户模型 (`server/app/models/__init__.py`)
**现状**：
- User 表仅包含：id, user_id, nickname, power, mood, hp, wins, created_at, updated_at
- 无问卷数据存储字段
- 无标签系统

**问题**：
- 问卷数据无法持久化
- 无法基于用户画像做推荐

### 2.2 问卷系统 (`server/app/routers/survey.py`)
**现状**：
- 已定义 12 个问卷问题（职业、经验、目标、风格、行业等）
- 提交接口返回 UserProfile 但未存储
- 前端提交后通过 state 传递数据

**问题**：
- 刷新页面数据丢失
- 无法复用用户画像

### 2.3 用户 API (`server/app/routers/user.py`)
**现状**：
- 返回 mock 数据
- 未关联数据库查询

### 2.4 前端问卷页 (`client/src/pages/SurveyPage.tsx`)
**现状**：
- 分步问卷 UI
- 提交后跳转到 `/interview` 页面

### 2.5 首页 (`client/src/pages/HomePage.tsx`)
**现状**：
- 按钮文案"开始面试"导向问卷页
- 无用户标签展示
- 无新用户引导逻辑

---

## 三、重构方案设计

### 3.1 数据模型设计

#### 3.1.1 用户表扩展
```
User 表新增字段：
- profile_data: JSON         # 完整问卷数据
- career: String             # 职业方向（冗余便于查询）
- experience: String         # 工作经验
- target_position: String    # 目标岗位
- industry: String           # 目标行业
- company_type: String       # 公司类型偏好
- salary_range: String       # 期望薪资
- job_search_status: String  # 求职状态
- preparation_time: String   # 每日准备时间
- goals: JSON                # 目标列表
- weakness: JSON             # 短板列表
- style_preference: String   # 面试风格偏好
- is_profile_completed: Boolean  # 是否完成初始设置
- profile_completed_at: DateTime # 完成时间
```

#### 3.1.2 用户标签表（新增）
```
UserTag 表：
- id: Integer (PK)
- user_id: String (FK -> users.user_id)
- tag_key: String            # 标签键（如：career_tech, exp_junior）
- tag_value: String          # 标签值
- tag_type: String           # 标签类型（career/exp/skill/industry）
- confidence: Float          # 置信度（0-1）
- source: String             # 来源（survey/behavior/ai）
- created_at: DateTime
- updated_at: DateTime
```

#### 3.1.3 标签定义
```
标签类型规划：
1. 职业标签（career）
   - career_backend, career_frontend, career_product, career_design

2. 经验标签（experience）
   - exp_fresh, exp_junior, exp_mid, exp_senior, exp_expert

3. 目标标签（goal）
   - goal_communication, goal_confidence, goal_process, goal_technical

4. 行业标签（industry）
   - industry_internet, industry_finance, industry_education

5. 状态标签（status）
   - status_active_seeking, status_passive, status_fresh_grad

6. 能力标签（skill）
   - skill_algorithm, skill_system_design, skill_communication
```

---

## 四、任务分发

### 4.1 数据库任务

#### TASK-DB-001: 用户表扩展
**负责人**：后端开发
**优先级**：P0
**预估工时**：2h

**任务内容**：
1. 在 `server/app/models/__init__.py` 中扩展 User 模型
2. 新增字段：profile_data, career, experience, target_position, industry, company_type, salary_range, job_search_status, preparation_time, goals, weakness, style_preference, is_profile_completed, profile_completed_at
3. 生成并执行数据库迁移脚本

**验收标准**：
- [ ] 模型定义正确
- [ ] 数据库迁移成功
- [ ] 现有数据不受影响

---

#### TASK-DB-002: 用户标签表创建
**负责人**：后端开发
**优先级**：P0
**预估工时**：1.5h

**任务内容**：
1. 创建 `server/app/models/user_tag.py`
2. 定义 UserTag 模型
3. 建立与 User 的外键关联
4. 添加索引优化查询

**验收标准**：
- [ ] 表结构符合设计
- [ ] 外键约束正确
- [ ] 索引创建完成

---

### 4.2 后端任务

#### TASK-BE-001: 问卷提交持久化
**负责人**：后端开发
**优先级**：P0
**预估工时**：3h

**依赖**：TASK-DB-001

**任务内容**：
1. 修改 `/survey/submit` 接口
2. 将问卷数据存储到用户表
3. 设置 `is_profile_completed = True`
4. 记录 `profile_completed_at` 时间

**接口变更**：
```
POST /survey/submit
Request: { answers: [...] }
Response: { 
  success: true, 
  profile: UserProfile,
  tags: string[]  // 返回生成的标签列表
}
```

**验收标准**：
- [ ] 数据正确存储
- [ ] 用户状态更新
- [ ] 接口返回正确

---

#### TASK-BE-002: 标签生成服务
**负责人**：后端开发
**优先级**：P0
**预估工时**：4h

**依赖**：TASK-DB-002

**任务内容**：
1. 创建 `server/app/services/tag_service.py`
2. 实现标签生成规则：
   - 职业方向 -> career 标签
   - 工作经验 -> experience 标签
   - 目标选择 -> goal 标签
   - 短板选择 -> skill 标签
3. 问卷提交时自动调用
4. 支持标签更新（用户修改问卷时）

**标签映射规则**：
```python
CAREER_TAG_MAP = {
    "软件开发": "career_tech",
    "产品经理": "career_product",
    ...
}

EXPERIENCE_TAG_MAP = {
    "应届生": "exp_fresh",
    "1-3年": "exp_junior",
    ...
}
```

**验收标准**：
- [ ] 标签正确生成
- [ ] 存储到数据库
- [ ] 支持增量更新

---

#### TASK-BE-003: 用户画像 API
**负责人**：后端开发
**优先级**：P1
**预估工时**：2h

**依赖**：TASK-BE-001, TASK-BE-002

**任务内容**：
1. 新增 `GET /users/me/profile` 接口
2. 返回完整用户画像（含问卷数据、标签列表）
3. 新增 `PUT /users/me/profile` 接口
4. 支持用户修改问卷数据

**接口定义**：
```
GET /users/me/profile
Response: {
  user: UserResponse,
  profile: UserProfile,
  tags: TagResponse[]
}

PUT /users/me/profile
Request: UserProfile
Response: { success: true, profile: UserProfile, tags: string[] }
```

**验收标准**：
- [ ] 接口正常工作
- [ ] 数据一致性保证

---

#### TASK-BE-004: 新用户状态检查
**负责人**：后端开发
**优先级**：P1
**预估工时**：1h

**任务内容**：
1. 新增 `GET /users/me/status` 接口
2. 返回用户状态信息

**接口定义**：
```
Response: {
  is_new_user: bool,
  is_profile_completed: bool,
  has_interview_history: bool,
  recommended_action: string  // "complete_profile" | "start_interview" | "view_history"
}
```

**验收标准**：
- [ ] 状态判断正确
- [ ] 推荐动作合理

---

### 4.3 前端任务

#### TASK-FE-001: 问卷页面重构
**负责人**：前端开发
**优先级**：P0
**预估工时**：2h

**任务内容**：
1. 修改 `SurveyPage.tsx` 标题和引导文案
2. 调整提交接口调用（调用新的 `/survey/submit`）
3. 提交成功后：
   - 新用户 -> 跳转首页并显示引导
   - 老用户 -> 跳转回来源页或首页

**文案调整**：
- 页面标题："设置你的求职画像"
- 提交按钮："完成设置"
- 引导文案：帮助用户理解目的

**验收标准**：
- [ ] 文案更新完成
- [ ] 流程逻辑正确
- [ ] 提交数据持久化

---

#### TASK-FE-002: 用户设置页面
**负责人**：前端开发
**优先级**：P1
**预估工时**：4h

**任务内容**：
1. 创建 `client/src/pages/ProfilePage.tsx`
2. 展示当前用户画像信息
3. 提供修改入口（复用问卷组件）
4. 路由：`/profile`

**页面结构**：
```
┌─────────────────────────────────┐
│ 求职画像                    [编辑]
├─────────────────────────────────┤
│ 职业方向：软件开发              │
│ 工作经验：3-5年                 │
│ 目标岗位：高级工程师            │
│ 目标行业：互联网/IT             │
├─────────────────────────────────┤
│ 我的标签                        │
│ [技术岗] [中级经验] [在职看机会]│
│ [提升表达] [系统设计]           │
└─────────────────────────────────┘
```

**验收标准**：
- [ ] 页面正确渲染
- [ ] 数据展示正确
- [ ] 编辑功能正常

---

#### TASK-FE-003: 首页标签展示
**负责人**：前端开发
**优先级**：P1
**预估工时**：2h

**任务内容**：
1. 修改 `HomePage.tsx`
2. 在用户信息区域展示标签
3. 标签样式：胶囊样式，不同类型不同颜色

**设计稿参考**：
```
标签颜色方案：
- 职业标签：蓝色
- 经验标签：绿色
- 目标标签：紫色
- 状态标签：橙色
```

**验收标准**：
- [ ] 标签正确展示
- [ ] 样式符合设计
- [ ] 响应式适配

---

#### TASK-FE-004: 新用户引导流程
**负责人**：前端开发
**优先级**：P1
**预估工时**：3h

**依赖**：TASK-BE-004

**任务内容**：
1. 在 `HomePage.tsx` 添加新用户检查
2. 未完成画像时显示引导提示
3. 引导组件：气泡提示 + 按钮
4. 完成画像后显示成功反馈

**引导流程**：
```
新用户进入首页
    ↓
检测 is_profile_completed
    ↓ false
显示引导气泡："完善求职画像，获得个性化推荐"
    ↓
点击 -> 跳转 /survey
    ↓
完成 -> 返回首页 -> 显示成功提示
```

**验收标准**：
- [ ] 引导逻辑正确
- [ ] 用户体验流畅
- [ ] 状态管理正确

---

#### TASK-FE-005: 首页入口文案调整
**负责人**：前端开发
**优先级**：P2
**预估工时**：0.5h

**任务内容**：
1. 修改 `HomePage.tsx` 中问卷按钮文案
2. "开始面试" -> "求职设置"
3. 图标调整（FileQuestion -> Settings 或 UserCog）

**验收标准**：
- [ ] 文案更新完成
- [ ] 图标正确显示

---

### 4.4 集成测试任务

#### TASK-TEST-001: 问卷流程端到端测试
**负责人**：测试/QA
**优先级**：P1
**预估工时**：3h

**测试用例**：
1. 新用户首次填写问卷 -> 数据持久化 -> 标签生成
2. 老用户修改问卷 -> 数据更新 -> 标签更新
3. 标签展示正确性验证
4. 引导流程验证

**验收标准**：
- [ ] 所有测试用例通过
- [ ] 无数据丢失
- [ ] 无状态不一致

---

## 五、任务依赖关系图

```
TASK-DB-001 ──┬── TASK-BE-001 ──┬── TASK-FE-001
              │                 │
              │                 └── TASK-FE-002
              │
TASK-DB-002 ──┴── TASK-BE-002 ──┬── TASK-BE-003 ── TASK-FE-002
                                │
                                └── TASK-BE-004 ── TASK-FE-004

TASK-FE-003 (独立)
TASK-FE-005 (独立)
TASK-TEST-001 (依赖所有开发任务)
```

---

## 六、里程碑规划

### 阶段一：数据层（Day 1-2）
- TASK-DB-001: 用户表扩展
- TASK-DB-002: 标签表创建

### 阶段二：服务层（Day 2-4）
- TASK-BE-001: 问卷持久化
- TASK-BE-002: 标签生成服务
- TASK-BE-003: 用户画像 API
- TASK-BE-004: 新用户状态检查

### 阶段三：展示层（Day 4-6）
- TASK-FE-001: 问卷页面重构
- TASK-FE-002: 用户设置页面
- TASK-FE-003: 首页标签展示
- TASK-FE-004: 新用户引导
- TASK-FE-005: 文案调整

### 阶段四：测试验收（Day 6-7）
- TASK-TEST-001: 端到端测试

---

## 七、风险点

1. **数据迁移风险**：现有用户无问卷数据，需处理 `is_profile_completed = false` 的情况
2. **标签冲突**：用户修改问卷时需考虑标签增量更新策略
3. **性能问题**：标签查询频繁，需做好缓存策略

---

## 八、后续扩展

1. **标签权重系统**：根据用户行为动态调整标签置信度
2. **标签推荐引擎**：基于标签匹配推荐面试题目/项目
3. **简历生成**：基于用户画像自动生成简历模板
