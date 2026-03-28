# 面试反馈报告系统 - 任务分发文档

## 一、需求概述

### 1.1 功能目标
- 面试结束时自动生成详细的反馈报告
- AI分析面试过程，给出专业评估
- 多维度评分：表达能力、专业知识、逻辑思维、应变能力、情绪管理
- 报告持久化存储，支持历史查看
- 前端展示报告详情页

### 1.2 现有系统分析

#### 后端现状
| 文件 | 功能 | 现状 |
|------|------|------|
| `server/app/routers/interview.py` | 面试API | 已有start/reply/end接口，end时返回简单评分 |
| `server/app/models/__init__.py` | Interview模型 | 存储session_id, history, score，无详细报告 |
| `server/app/services/interview.py` | 面试服务 | `generate_evaluation()` 仅返回score和feedback |
| `server/app/services/volcengine.py` | LLM服务 | 已封装chat方法，可复用 |

#### 前端现状
| 文件 | 功能 | 现状 |
|------|------|------|
| `client/src/pages/InterviewPage.tsx` | 面试页面 | 结束时调用end接口，跳转结果页 |
| `client/src/pages/InterviewResultPage.tsx` | 结果页面 | 显示总分、雷达图、简单反馈 |
| `client/src/components/AbilityRadar.tsx` | 雷达图组件 | 已有，可复用 |

#### 问题识别
1. **评分维度单一**：现有只有总分，无各维度详细评分
2. **反馈内容简略**：仅50字反馈，无具体问题分析
3. **无改进建议**：缺少针对性提升建议和学习任务推荐
4. **报告不持久化**：详细报告未存储，无法回顾
5. **前端展示有限**：无专门报告详情页

---

## 二、系统设计

### 2.1 报告数据结构

```json
{
  "report_id": "uuid",
  "session_id": "interview_xxx",
  "user_id": "default_user",
  "created_at": "2026-03-27T12:00:00Z",
  
  "overall": {
    "score": 78,
    "grade": "B+",
    "summary": "整体表现良好，逻辑清晰，但专业知识深度有待提升..."
  },
  
  "dimensions": {
    "expression": {
      "score": 82,
      "label": "表达能力",
      "analysis": "表达较为流畅，能够清晰阐述观点...",
      "improvement": "建议多用结构化表达，如PREP法则..."
    },
    "professional": {
      "score": 70,
      "label": "专业知识",
      "analysis": "基础知识扎实，但对前沿技术了解不足...",
      "improvement": "建议深入学习微服务架构设计..."
    },
    "logic": {
      "score": 85,
      "label": "逻辑思维",
      "analysis": "逻辑清晰，能够层层递进分析问题...",
      "improvement": "可以尝试使用思维导图辅助表达..."
    },
    "adaptability": {
      "score": 75,
      "label": "应变能力",
      "analysis": "面对追问能够从容应对，但偶尔略显紧张...",
      "improvement": "多做模拟面试，提高临场反应..."
    },
    "emotion": {
      "score": 80,
      "label": "情绪管理",
      "analysis": "整体情绪稳定，压力值控制在合理范围...",
      "improvement": "深呼吸技巧可以帮助缓解紧张..."
    }
  },
  
  "question_analysis": [
    {
      "question_index": 1,
      "question": "请做一个自我介绍",
      "user_answer": "我是...",
      "score": 75,
      "strengths": ["介绍简洁", "重点突出"],
      "weaknesses": ["缺少量化成果", "未突出核心竞争力"],
      "suggestion": "建议采用\"我是谁+我做过什么+我能做什么\"的结构..."
    }
  ],
  
  "recommendations": [
    {
      "type": "course",
      "title": "结构化表达训练",
      "description": "学习PREP、STAR等表达框架",
      "priority": "high"
    },
    {
      "type": "practice",
      "title": "技术面试模拟",
      "description": "针对微服务相关题目进行专项练习",
      "priority": "medium"
    }
  ],
  
  "interview_meta": {
    "type": "hr",
    "difficulty": "medium",
    "position": "软件开发",
    "duration_seconds": 600,
    "message_count": 12
  }
}
```

### 2.2 触发时机

```
面试结束流程:
┌─────────────────┐
│ 用户点击结束面试 │
└────────┬────────┘
         ↓
┌─────────────────┐
│ 调用 /end 接口  │
└────────┬────────┘
         ↓
┌─────────────────────────┐
│ 1. 生成简化评分(现有逻辑) │
│ 2. 异步生成详细报告      │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ 返回简化结果 + 报告ID    │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ 前端跳转结果页           │
│ 可点击查看详细报告       │
└─────────────────────────┘
```

---

## 三、任务分发

### 任务1: 数据库模型设计

**负责人**: 后端开发
**优先级**: P0
**预估工时**: 0.5天

#### 任务描述
创建 `InterviewReport` 模型，存储详细面试报告

#### 具体工作
1. 创建 `server/app/models/interview_report.py`
   ```python
   class InterviewReport(Base):
       __tablename__ = "interview_reports"
       
       id = Column(Integer, primary_key=True)
       report_id = Column(String, unique=True, index=True)
       session_id = Column(String, ForeignKey("interviews.session_id"))
       user_id = Column(String, index=True)
       
       # 总体评分
       overall_score = Column(Integer)
       overall_grade = Column(String)  # A+, A, B+, B, C+, C
       summary = Column(Text)
       
       # 各维度评分(JSON)
       dimensions = Column(JSON)  # 5个维度的详细数据
       
       # 问题分析(JSON)
       question_analysis = Column(JSON)
       
       # 改进建议(JSON)
       recommendations = Column(JSON)
       
       # 面试元信息(JSON)
       interview_meta = Column(JSON)
       
       created_at = Column(DateTime, default=datetime.utcnow)
   ```

2. 在 `server/app/models/__init__.py` 中导入

3. 创建数据库迁移脚本

#### 验收标准
- 模型可正常创建和查询
- 与Interview表关联正确

---

### 任务2: 报告生成服务

**负责人**: 后端开发
**优先级**: P0
**预估工时**: 1天

#### 任务描述
创建报告生成服务，封装AI分析逻辑

#### 具体工作
1. 创建 `server/app/services/report_generator.py`
   - `generate_detailed_report(session_id, history, meta) -> dict`
   - 调用LLM生成各维度评分
   - 分析每个问题的回答质量
   - 生成改进建议和学习任务推荐

2. 设计AI Prompt模板 (详见任务5)

3. 实现报告数据组装逻辑

#### 关键接口
```python
class ReportGeneratorService:
    async def generate_report(
        self, 
        session_id: str,
        history: List[Dict],
        interview_meta: Dict
    ) -> InterviewReport:
        # 1. 调用AI分析
        analysis = await self._analyze_with_llm(history, interview_meta)
        
        # 2. 组装报告数据
        report_data = self._build_report_data(analysis)
        
        # 3. 存储到数据库
        report = await self._save_report(report_data)
        
        return report
```

#### 验收标准
- 能正确调用LLM API
- 返回结构化的报告数据
- 处理LLM返回异常情况

---

### 任务3: 报告API接口

**负责人**: 后端开发
**优先级**: P0
**预估工时**: 0.5天

#### 任务描述
新增报告相关API接口

#### 具体工作
1. 在 `server/app/routers/interview.py` 新增接口:

   ```
   GET /interviews/reports/{report_id}
   获取单份报告详情
   
   GET /interviews/reports
   获取用户的报告列表(分页)
   
   GET /interviews/{session_id}/report
   根据session_id获取关联报告
   ```

2. 创建对应的Schema:
   - `ReportDetailResponse`
   - `ReportListItem`
   - `ReportListResponse`

3. 修改 `/end` 接口:
   - 增加异步生成报告逻辑
   - 返回 `report_id` 字段

#### API响应示例
```json
{
  "report_id": "rpt_xxx",
  "overall_score": 78,
  "overall_grade": "B+",
  "summary": "...",
  "dimensions": {...},
  "question_analysis": [...],
  "recommendations": [...],
  "interview_meta": {...},
  "created_at": "2026-03-27T12:00:00Z"
}
```

#### 验收标准
- API接口正常响应
- 错误处理完善
- 与前端联调通过

---

### 任务4: 前端报告页面

**负责人**: 前端开发
**优先级**: P0
**预估工时**: 1.5天

#### 任务描述
创建报告详情页面和优化结果页面

#### 具体工作

##### 4.1 报告详情页 `client/src/pages/ReportDetailPage.tsx`
- 路由: `/report/:reportId`
- 展示内容:
  - 总分和等级(大字体突出)
  - 五维雷达图(复用AbilityRadar组件)
  - 各维度详细分析卡片
  - 问题分析列表(可展开)
  - 改进建议卡片
  - 推荐学习任务(可点击跳转)

##### 4.2 优化结果页 `InterviewResultPage.tsx`
- 添加"查看详细报告"按钮
- 显示报告生成状态(生成中/已完成)
- 点击跳转报告详情页

##### 4.3 API集成 `client/src/lib/api.ts`
```typescript
export const reportApi = {
  getReport: (reportId: string) => 
    api.get(`/interviews/reports/${reportId}`),
  
  getReportList: (page: number, pageSize: number) =>
    api.get(`/interviews/reports?page=${page}&page_size=${pageSize}`),
  
  getReportBySession: (sessionId: string) =>
    api.get(`/interviews/${sessionId}/report`),
};
```

##### 4.4 组件设计
```
ReportDetailPage/
├── OverallScoreCard.tsx      # 总分卡片
├── DimensionAnalysisCard.tsx # 维度分析卡片
├── QuestionAnalysisList.tsx  # 问题分析列表
├── RecommendationsCard.tsx   # 改进建议卡片
└── TaskRecommendations.tsx   # 任务推荐卡片
```

#### UI设计参考
```
┌─────────────────────────────────────────┐
│            面试报告                       │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │    总分: 78 分    等级: B+      │    │
│  │    整体表现良好...               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌───────────┐                          │
│  │  雷达图   │   表达能力: 82分        │
│  │           │   分析: ...             │
│  │           │   建议: ...             │
│  └───────────┘                          │
│                                         │
│  问题分析                                │
│  ┌─────────────────────────────────┐    │
│  │ Q1: 自我介绍 (75分)             │    │
│  │ 优点: 简洁、重点突出             │    │
│  │ 不足: 缺少量化成果               │    │
│  │ 建议: 采用PREP结构               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  改进建议                                │
│  ┌─────────────────────────────────┐    │
│  │ 1. 结构化表达训练 (高优先级)     │    │
│  │ 2. 技术面试模拟 (中优先级)       │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

#### 验收标准
- 页面正确展示报告数据
- 雷达图渲染正确
- 响应式布局适配移动端
- 加载状态和错误状态处理

---

### 任务5: AI报告生成Prompt设计

**负责人**: AI工程师
**优先级**: P0
**预估工时**: 0.5天

#### 任务描述
设计专业的面试评估Prompt模板

#### 具体工作

##### 5.1 维度评分Prompt
```
你是一位资深面试评估专家，请根据面试对话记录，对候选人进行全方位评估。

## 评估维度
1. 表达能力(expression): 语言组织、表达清晰度、用词准确性
2. 专业知识(professional): 专业深度、知识广度、实践能力
3. 逻辑思维(logic): 分析问题能力、论证严密性、思路清晰度
4. 应变能力(adaptability): 临场反应、问题处理、思维灵活度
5. 情绪管理(emotion): 压力应对、情绪稳定性、自信心

## 面试信息
- 面试类型: {type}
- 目标岗位: {position}
- 难度等级: {difficulty}

## 对话记录
{history}

## 输出要求
请按以下JSON格式输出:
{
  "dimensions": {
    "expression": {"score": 0-100, "analysis": "分析说明", "improvement": "改进建议"},
    "professional": {...},
    "logic": {...},
    "adaptability": {...},
    "emotion": {...}
  },
  "overall_score": 0-100,
  "overall_grade": "A+/A/B+/B/C+/C",
  "summary": "100字以内的总体评价"
}
```

##### 5.2 问题分析Prompt
```
你是面试分析专家，请分析以下面试问题的回答质量。

## 问题
{question}

## 候选人回答
{answer}

## 面试类型
{type}

## 输出要求
{
  "score": 0-100,
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["不足1", "不足2"],
  "suggestion": "具体的改进建议"
}
```

##### 5.3 改进建议生成Prompt
```
根据候选人的面试评估结果，生成个性化的改进建议。

## 评估结果
{evaluation_result}

## 候选人背景
- 目标岗位: {position}
- 薄弱维度: {weak_dimensions}

## 输出要求
生成3-5条改进建议，每条包含:
{
  "type": "course/practice/reading/exercise",
  "title": "建议标题",
  "description": "详细描述",
  "priority": "high/medium/low",
  "estimated_time": "预计时间(小时)"
}
```

#### 验收标准
- Prompt能稳定输出结构化JSON
- 评分合理，与人工评估误差<10%
- 建议具有可操作性
- 处理边界情况(回答过短、无效回答等)

---

### 任务6: 报告列表页面

**负责人**: 前端开发
**优先级**: P1
**预估工时**: 0.5天

#### 任务描述
创建历史报告列表页面

#### 具体工作
1. 创建 `client/src/pages/ReportListPage.tsx`
   - 路由: `/reports`
   - 列表展示: 日期、类型、总分、等级
   - 点击进入详情页
   - 分页加载

2. 添加到导航菜单

#### 验收标准
- 列表正确加载
- 分页功能正常
- 点击可跳转详情

---

## 四、技术要点

### 4.1 性能优化
- 报告生成采用异步方式，不阻塞面试结束流程
- 大报告数据考虑压缩存储
- 列表页只返回摘要，详情页加载完整数据

### 4.2 错误处理
- LLM调用失败时使用降级评分逻辑
- 报告生成失败时允许重试
- 前端展示生成状态(生成中/成功/失败)

### 4.3 安全考虑
- 报告只能被所属用户查看
- API接口添加用户认证(后续)

---

## 五、开发排期

| 任务 | 负责人 | 工时 | 依赖 | 开始日期 | 完成日期 |
|------|--------|------|------|----------|----------|
| 任务1 数据库模型 | 后端 | 0.5天 | 无 | Day 1 | Day 1 |
| 任务5 AI Prompt设计 | AI | 0.5天 | 无 | Day 1 | Day 1 |
| 任务2 报告生成服务 | 后端 | 1天 | 任务1,5 | Day 2 | Day 2 |
| 任务3 报告API | 后端 | 0.5天 | 任务2 | Day 3 | Day 3 |
| 任务4 前端报告页面 | 前端 | 1.5天 | 任务3 | Day 3 | Day 4 |
| 任务6 报告列表页 | 前端 | 0.5天 | 任务4 | Day 5 | Day 5 |

**总工期**: 5天

---

## 六、文件清单

### 后端新增文件
```
server/
├── app/
│   ├── models/
│   │   └── interview_report.py     # 新增
│   ├── services/
│   │   └── report_generator.py     # 新增
│   ├── schemas/
│   │   └── interview.py            # 修改: 添加报告Schema
│   └── routers/
│       └── interview.py            # 修改: 添加报告API
```

### 前端新增文件
```
client/
├── src/
│   ├── pages/
│   │   ├── ReportDetailPage.tsx    # 新增
│   │   └── ReportListPage.tsx      # 新增
│   ├── components/
│   │   └── report/                 # 新增目录
│   │       ├── OverallScoreCard.tsx
│   │       ├── DimensionAnalysisCard.tsx
│   │       ├── QuestionAnalysisList.tsx
│   │       └── RecommendationsCard.tsx
│   └── lib/
│       └── api.ts                  # 修改: 添加reportApi
```

---

## 七、验收测试

### 7.1 单元测试
- [ ] 报告生成服务测试
- [ ] AI Prompt输出格式测试
- [ ] API接口测试

### 7.2 集成测试
- [ ] 完整面试流程测试(开始->对话->结束->查看报告)
- [ ] 报告存储和查询测试
- [ ] 前后端联调测试

### 7.3 边界测试
- [ ] 空对话记录处理
- [ ] LLM调用超时处理
- [ ] 大量对话记录性能测试

---

## 八、后续优化

1. **报告对比**: 对比不同时期报告，展示进步曲线
2. **智能推荐**: 根据薄弱维度自动推荐学习资源
3. **报告分享**: 生成分享图片或链接
4. **导出功能**: 导出PDF格式报告
5. **语音分析**: 结合语音识别分析表达流畅度

---

文档版本: v1.0
创建日期: 2026-03-27
更新日期: 2026-03-27
