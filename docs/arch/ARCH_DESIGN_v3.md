# 架构设计方案 v3.0 - 极速开发版

> 设计理念：**能复用就不写，能外包就不做，能简化就不复杂**

---

## 1. 核心设计理念

### 1.1 极速交付三原则

| 原则 | 具体做法 | 权衡 |
|------|---------|------|
| **复用优先** | 使用成熟SaaS服务、开源组件、现成模板 | 牺牲部分定制能力 |
| **MVP聚焦** | 只做P0功能，P1/P2后续迭代 | 功能精简 |
| **快速验证** | 先上线验证需求，再优化体验 | 代码质量暂时妥协 |

### 1.2 关键决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 像素生成 | Seedance 5.0 API | 已验证可行，无需自研 |
| LLM | 通义千问 | 国内可用、价格低、API稳定 |
| ASR/TTS | 阿里云语音服务 | 与通义千问同一生态，集成简单 |
| 认证 | Supabase Auth | 开箱即用，支持多端 |
| 数据库 | Supabase PostgreSQL | 托管服务，无需运维 |
| 文件存储 | 阿里云OSS | 国内访问快，CDN成熟 |

---

## 2. 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              客户端层 (React SPA)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Framer      │  │  Web Audio   │  │  React       │  │  Zustand     │ │
│  │  Motion      │  │  API         │  │  Query       │  │  (状态管理)  │ │
│  │  (动画)★     │  │  (语音处理)★ │  │  (数据获取)★ │  │  ★          │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API网关层                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                    Supabase API Gateway ★ (托管服务)                     │
│                    - 认证/鉴权                                           │
│                    - 请求路由                                            │
│                    - 限流                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌───────────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐
│    业务服务层 (Node.js)│ │   Supabase      │ │      外部服务层            │
│    ★ Express + tRPC   │ │   PostgreSQL    │ │      (全部外包)            │
├───────────────────────┤ │   ★ 托管数据库  │ ├─────────────────────────────┤
│ ┌───────────────────┐ │ │                 │ │ ┌─────────────────────────┐ │
│ │ 面试服务          │ │ │ ┌─────────────┐ │ │ │ 通义千问 API ★          │ │
│ │ - 对话管理        │ │ │ │ users       │ │ │ │ - LLM对话               │ │
│ │ - 评分计算        │ │ │ │ interviews  │ │ │ │ - 多维度评估            │ │
│ └───────────────────┘ │ │ │ memories    │ │ │ └─────────────────────────┘ │
│ ┌───────────────────┐ │ │ │ tasks       │ │ │ ┌─────────────────────────┐ │
│ │ 用户服务          │ │ │ └─────────────┘ │ │ │ 阿里云语音服务 ★        │ │
│ │ - 属性计算        │ │ │                 │ │ │ - ASR 语音识别          │ │
│ │ - 成就判定        │ │ └─────────────────┘ │ │ - TTS 语音合成          │ │
│ └───────────────────┘ │                     │ └─────────────────────────┘ │
│ ┌───────────────────┐ │                     │ ┌─────────────────────────┐ │
│ │ NPC服务           │ │                     │ │ Seedance 5.0 ★          │ │
│ │ - 角色对话        │ │                     │ │ - 像素小人生成          │ │
│ │ - Prompt管理      │ │                     │ └─────────────────────────┘ │
│ └───────────────────┘ │                     │ ┌─────────────────────────┐ │
└───────────────────────┘                     │ │ 阿里云OSS ★             │ │
                                              │ │ - 图片存储              │ │
                                              │ └─────────────────────────┘ │
                                              └─────────────────────────────┘

★ = 复用成熟组件/服务
```

---

## 3. 关键技术选型

### 3.1 前端技术栈

| 技术 | 版本 | 选型理由 | 替代方案 |
|------|------|---------|---------|
| React | 18.x | 生态成熟，组件库丰富 | Vue 3 |
| Vite | 5.x | 极速开发体验，HMR快 | Next.js |
| Framer Motion | 11.x | 声明式动画，学习成本低 | GSAP |
| Zustand | 4.x | 极简状态管理，无样板代码 | Redux Toolkit |
| React Query | 5.x | 自动缓存、重试、乐观更新 | SWR |
| TailwindCSS | 3.x | 原子化CSS，快速开发 | CSS Modules |
| react-use-audio-recorder | 3.x | 录音组件，开箱即用 | 自研 |

### 3.2 后端技术栈

| 技术 | 版本 | 选型理由 | 替代方案 |
|------|------|---------|---------|
| Node.js | 20.x LTS | 前端团队可全栈开发 | Python FastAPI |
| Express | 4.x | 生态最成熟，中间件丰富 | Fastify |
| tRPC | 10.x | 端到端类型安全，无需写API文档 | REST |
| Prisma | 5.x | ORM类型安全，迁移方便 | TypeORM |
| Supabase | - | 认证/数据库/存储一体化 | 自建服务 |

### 3.3 外部服务选型

| 服务 | 提供商 | 选型理由 | 月成本估算 |
|------|--------|---------|-----------|
| LLM | 通义千问 | 国内可用，价格最低 | ¥500-2000 |
| ASR | 阿里云语音识别 | 准确率高，延迟低 | ¥100-500 |
| TTS | 阿里云语音合成 | 音色丰富，支持情感 | ¥100-300 |
| 像素生成 | Seedance 5.0 | 已验证可行 | ¥0.2-0.5/次 |
| 认证/数据库 | Supabase | 免费额度足够MVP | $0-25 |
| CDN/OSS | 阿里云OSS | 国内访问快 | ¥50-200 |

**MVP阶段月成本预估：¥800-3000**

---

## 4. 复用资源清单

### 4.1 前端复用

| 资源 | 来源 | 用途 | 许可证 |
|------|------|------|--------|
| shadcn/ui | shadcn/ui | UI组件库 | MIT |
| lucide-react | Lucide | 图标库 | ISC |
| framer-motion-viewport | Framer | 滚动动画 | MIT |
| react-hook-form | React Hook Form | 表单处理 | MIT |
| zod | Zod | 数据验证 | MIT |
| pixel-art-react | 社区 | 像素风格组件参考 | MIT |

### 4.2 后端复用

| 资源 | 来源 | 用途 | 许可证 |
|------|------|------|--------|
| @supabase/supabase-js | Supabase | 认证/数据库客户端 | MIT |
| @alicloud/nls | 阿里云 | 语音服务SDK | Apache 2.0 |
| openai-sdk-compatible | 通义千问 | LLM API调用 | MIT |
| prisma-client | Prisma | ORM | Apache 2.0 |

### 4.3 Prompt模板复用

```
面试官Prompt模板结构（可直接复用GPT最佳实践）：
- 角色定义
- 面试类型（HR面/技术面/行为面）
- 追问策略
- 评分标准
- 输出格式
```

### 4.4 设计资源

| 资源 | 来源 | 用途 |
|------|------|------|
| 像素字体 | Press Start 2P | 标题/强调文字 |
| 像素图标 | IconPack (itch.io) | UI图标 |
| 8bit音效 | freesound.org | 交互反馈音 |
| 像素背景 | craftpix.net | 场景背景 |

---

## 5. 开发计划

### 5.1 MVP阶段 (4周)

| 周次 | 模块 | 任务 | 预估工时 | 负责人 |
|------|------|------|----------|--------|
| W1 | 项目搭建 | 脚手架、CI/CD、Supabase配置 | 16h | 全栈 |
| W1 | 认证模块 | 登录/注册/问卷 | 12h | 前端 |
| W2 | 像素生成 | Seedance集成、精灵图展示 | 16h | 后端 |
| W2 | 属性系统 | 武力值/心情值/HP | 12h | 后端 |
| W3 | 面试核心 | ASR+LLM+TTS链路 | 24h | 全栈 |
| W3 | 评分系统 | 多维度评分+反馈 | 16h | 后端 |
| W4 | 动画系统 | 基础动画+Lip Sync | 20h | 前端 |
| W4 | 集成测试 | 端到端测试、Bug修复 | 16h | 全栈 |

**MVP总工时：132人时（约3.5周/人）**

### 5.2 V1.0阶段 (+3周)

| 模块 | 任务 | 预估工时 |
|------|------|----------|
| 陪跑员NPC | 卡壳检测+提示系统 | 24h |
| 面试回放 | 录音存储+回放界面 | 16h |
| 每日任务 | 任务系统+奖励 | 12h |
| 压力槽 | 实时压力可视化 | 8h |
| 优化迭代 | 性能优化+体验优化 | 20h |

**V1.0总工时：80人时**

### 5.3 里程碑

```
Day 7   → 用户可登录、填问卷、生成像素小人
Day 14  → 可进行基础文字对话面试
Day 21  → 语音面试链路打通
Day 28  → MVP上线，可完整体验面试流程
```

---

## 6. 最小功能集 (MVP)

### 6.1 MVP功能清单

| 功能 | 描述 | 验收标准 |
|------|------|---------|
| ✅ 用户认证 | 手机号/邮箱登录 | 登录后跳转首页 |
| ✅ 问卷调查 | 5-10题基础信息收集 | 提交后生成用户画像 |
| ✅ 像素生成 | 基于问卷生成像素小人 | 展示3x3精灵图 |
| ✅ 基础动画 | 呼吸、说话、聆听 | 动画流畅播放 |
| ✅ 语音面试 | ASR→LLM→TTS完整链路 | 可进行10分钟面试 |
| ✅ 简单评分 | 5维度评分+文字反馈 | 评分数据存入数据库 |
| ✅ 属性更新 | 面试后武力值/心情值变化 | 数值实时更新 |
| ✅ 面试记录 | 查看历史面试列表 | 列表正确展示 |

### 6.2 MVP不做

| 功能 | 原因 | 计划版本 |
|------|------|---------|
| 照片生成像素小人 | API成本高，先验证问卷生成 | V1.5 |
| Lip Sync嘴型同步 | 技术复杂度高 | V1.0 |
| 陪跑员NPC | 需要卡壳检测逻辑 | V1.0 |
| 多面试官人设 | Prompt工程量大 | V1.5 |
| 社交分享 | 需要接入第三方SDK | V2.0 |
| 成就系统 | 需要大量内容设计 | V1.0 |

---

## 7. 快速迭代路径

### 7.1 迭代规划

```
MVP (W4)
  │
  ├─► V1.0 (+3W) ─► 核心体验优化
  │     - 陪跑员NPC
  │     - Lip Sync
  │     - 每日任务
  │     - 面试回放
  │
  ├─► V1.5 (+4W) ─► 差异化功能
  │     - 照片生成像素小人
  │     - 多面试官人设
  │     - JD分析
  │     - 成就系统
  │
  └─► V2.0 (+4W) ─► 增长功能
        - 社交分享
        - 皮肤商城
        - 排行榜
        - 团队协作
```

### 7.2 数据驱动迭代

| 指标 | 目标 | 优化方向 |
|------|------|---------|
| 面试完成率 | >70% | 简化流程、优化引导 |
| 次日留存 | >30% | 增加奖励、推送召回 |
| 平均面试时长 | 8-12分钟 | 调整题目数量 |
| NPS | >30 | 收集反馈、快速迭代 |

---

## 8. 已知权衡

### 8.1 性能权衡

| 权衡点 | 选择 | 影响 |
|--------|------|------|
| 语音处理 | 服务端处理 | 延迟200-500ms，但开发简单 |
| 动画渲染 | CSS Sprite | 不支持高级效果，但性能好 |
| 图片存储 | OSS | 需要CDN费用，但无需自建 |

### 8.2 扩展性权衡

| 权衡点 | 选择 | 影响 |
|--------|------|------|
| 单体架构 | MVP阶段单体 | 后期需要拆分微服务 |
| Supabase锁死 | 使用Supabase全家桶 | 迁移成本较高 |
| 通用Prompt | 不针对行业优化 | 评分准确度可能不如定制 |

### 8.3 体验权衡

| 权衡点 | 选择 | 影响 |
|--------|------|------|
| Lip Sync | MVP不做 | 体验稍显僵硬 |
| 离线功能 | 不支持 | 依赖网络质量 |
| 实时援护 | 文字提示 | 不如语音沉浸 |

---

## 9. 接口定义

### 9.1 前后端通信

使用 tRPC 实现端到端类型安全，无需手写API文档。

### 9.2 核心接口定义

```typescript
// ============================================
// 用户相关接口
// ============================================

interface UserRouter {
  // 获取当前用户信息
  getCurrentUser: {
    input: void;
    output: {
      id: string;
      phone?: string;
      email?: string;
      nickname: string;
      avatar: string;        // 像素小人URL
      power: number;         // 武力值 0-100
      mood: number;          // 心情值 0-100
      hp: number;            // 健康值 0-100
      wins: number;          // 胜场
      createdAt: Date;
    };
  };

  // 更新用户属性
  updateAttributes: {
    input: {
      power?: number;
      mood?: number;
      hp?: number;
      wins?: number;
    };
    output: {
      success: boolean;
      newValues: {
        power: number;
        mood: number;
        hp: number;
        wins: number;
      };
    };
  };
}

// ============================================
// 问卷相关接口
// ============================================

interface SurveyRouter {
  // 获取问卷题目
  getQuestions: {
    input: void;
    output: Array<{
      id: string;
      type: 'single' | 'multiple' | 'text';
      question: string;
      options?: string[];
      required: boolean;
    }>;
  };

  // 提交问卷答案
  submitAnswers: {
    input: {
      answers: Array<{
        questionId: string;
        answer: string | string[];
      }>;
    };
    output: {
      success: boolean;
      profile: {
        industry: string;
        position: string;
        experience: string;
        tags: string[];
      };
    };
  };
}

// ============================================
// 像素小人相关接口
// ============================================

interface AvatarRouter {
  // 生成像素小人（基于问卷）
  generateFromProfile: {
    input: {
      industry: string;
      position: string;
      style?: 'professional' | 'casual' | 'creative';
    };
    output: {
      avatarId: string;
      spriteUrl: string;     // 精灵图URL
      previewUrl: string;    // 预览图URL
    };
  };

  // 生成像素小人（基于照片）
  generateFromPhoto: {
    input: {
      photoUrl: string;      // OSS临时URL
    };
    output: {
      avatarId: string;
      spriteUrl: string;
      previewUrl: string;
      processing: boolean;   // 是否处理中
    };
  };

  // 获取动画帧
  getAnimationFrames: {
    input: {
      avatarId: string;
      animation: 'idle' | 'talk' | 'listen' | 'nod' | 'nervous';
    };
    output: Array<{
      frameIndex: number;
      imageUrl: string;
      duration: number;      // 毫秒
    }>;
  };
}

// ============================================
// 面试相关接口
// ============================================

interface InterviewRouter {
  // 开始面试
  start: {
    input: {
      type: 'hr' | 'technical' | 'behavioral';
      difficulty: 'easy' | 'medium' | 'hard';
      position?: string;
      company?: string;
    };
    output: {
      interviewId: string;
      sessionId: string;     // WebSocket会话ID
      npcId: string;
      npcName: string;
      greeting: string;      // 开场白
    };
  };

  // WebSocket 消息结构（实时面试对话）
  // 客户端 → 服务端
  type ClientMessage = 
    | { type: 'audio'; data: string; format: 'webm' | 'wav' }  // Base64音频
    | { type: 'text'; content: string }
    | { type: 'end' };                                        // 结束面试

  // 服务端 → 客户端
  type ServerMessage =
    | { type: 'transcript'; text: string }                    // 语音识别结果
    | { type: 'response'; text: string; audioUrl?: string }   // AI回复
    | { type: 'follow_up'; question: string; audioUrl: string } // 追问
    | { type: 'hint'; text: string }                          // 陪跑员提示
    | { type: 'end'; summary: InterviewSummary }              // 面试结束
    | { type: 'error'; code: string; message: string };

  // 获取面试历史
  getHistory: {
    input: {
      page?: number;
      pageSize?: number;
    };
    output: {
      total: number;
      items: Array<{
        id: string;
        type: string;
        difficulty: string;
        score: number;
        createdAt: Date;
        duration: number;     // 秒
      }>;
    };
  };

  // 获取面试详情
  getDetail: {
    input: { interviewId: string };
    output: {
      id: string;
      type: string;
      difficulty: string;
      score: number;
      scores: {
        expression: number;    // 表达能力
        logic: number;         // 逻辑思维
        professional: number;  // 专业能力
        adaptability: number;  // 应变能力
        emotional: number;     // 情绪管理
      };
      feedback: string;
      transcript: Array<{
        role: 'user' | 'npc';
        content: string;
        timestamp: number;
      }>;
      audioUrl?: string;       // 录音回放URL
      createdAt: Date;
    };
  };
}

// ============================================
// NPC相关接口
// ============================================

interface NPCRouter {
  // 获取NPC列表
  getList: {
    input: void;
    output: Array<{
      id: string;
      name: string;
      role: 'interviewer' | 'companion' | 'judge' | 'translator';
      avatar: string;
      description: string;
      unlocked: boolean;      // 是否解锁
    }>;
  };

  // 获取NPC对话（陪跑员提示）
  getHint: {
    input: {
      interviewId: string;
      context: string;        // 当前对话上下文
      type: 'stuck' | 'nervous' | 'encourage';
    };
    output: {
      hint: string;
      emotion: 'calm' | 'encouraging' | 'concerned';
    };
  };
}

// ============================================
// 任务相关接口（V1.0）
// ============================================

interface TaskRouter {
  // 获取每日任务
  getDailyTasks: {
    input: void;
    output: Array<{
      id: string;
      title: string;
      description: string;
      reward: {
        power?: number;
        mood?: number;
      };
      completed: boolean;
      progress: number;
      target: number;
    }>;
  };

  // 完成任务
  completeTask: {
    input: { taskId: string };
    output: {
      success: boolean;
      reward: {
        power?: number;
        mood?: number;
      };
    };
  };
}

// ============================================
// 记忆相关接口
// ============================================

interface MemoryRouter {
  // 获取面试记忆列表
  getList: {
    input: {
      page?: number;
      pageSize?: number;
    };
    output: {
      total: number;
      items: Array<{
        id: string;
        interviewId: string;
        summary: string;
        keyPoints: string[];
        createdAt: Date;
      }>;
    };
  };

  // 获取AI复盘建议
  getReview: {
    input: { interviewId: string };
    output: {
      strengths: string[];
      improvements: string[];
      suggestions: string[];
      nextSteps: string[];
    };
  };
}
```

### 9.3 WebSocket 通信流程

```
客户端                              服务端
   │                                  │
   │──── connect (sessionId) ────────►│
   │◄─── connected ───────────────────│
   │                                  │
   │──── audio (base64) ─────────────►│
   │◄─── transcript ──────────────────│ (ASR结果)
   │◄─── response + audioUrl ─────────│ (AI回复)
   │                                  │
   │──── audio ──────────────────────►│
   │◄─── transcript ──────────────────│
   │◄─── follow_up + audioUrl ────────│ (追问)
   │                                  │
   │◄─── hint ────────────────────────│ (陪跑员提示，可选)
   │                                  │
   │──── end ────────────────────────►│
   │◄─── end (summary) ───────────────│
   │                                  │
```

### 9.4 错误码定义

| 错误码 | 含义 | 处理建议 |
|--------|------|---------|
| AUTH_001 | 未登录 | 跳转登录页 |
| AUTH_002 | Token过期 | 刷新Token |
| ASR_001 | 语音识别失败 | 提示用户重试 |
| ASR_002 | 音频格式不支持 | 检查格式 |
| LLM_001 | LLM服务不可用 | 降级为文字对话 |
| LLM_002 | 内容审核不通过 | 提示用户修改 |
| AVATAR_001 | 像素生成失败 | 重试或使用默认 |
| INTERVIEW_001 | 面试不存在 | 返回列表页 |
| RATE_001 | 请求过于频繁 | 提示稍后重试 |

---

## 10. 技术债务清单

### 10.1 MVP阶段已知技术债

| 债务项 | 影响 | 计划偿还时间 |
|--------|------|-------------|
| 无单元测试 | 回归风险高 | V1.0 |
| 硬编码Prompt | 调优困难 | V1.0 |
| 无数据备份 | 数据丢失风险 | V1.0 |
| 无监控告警 | 故障发现慢 | V1.0 |
| 前端状态管理简单 | 复杂场景难维护 | V1.5 |
| 无国际化 | 海外用户无法使用 | V2.0 |

### 10.2 需要后续重构的部分

| 模块 | 当前方案 | 重构方向 | 优先级 |
|------|---------|---------|--------|
| 面试服务 | 单文件 | 拆分为微服务 | P1 |
| 动画系统 | CSS Sprite | WebGL/Canvas | P2 |
| 认证 | Supabase | 自建（如需企业版） | P3 |
| 数据库 | 单实例 | 读写分离 | P3 |

### 10.3 安全债务

| 债务项 | 风险 | 计划解决 |
|--------|------|---------|
| 语音数据明文传输 | 中 | V1.0加密 |
| 无敏感词过滤 | 高 | MVP上线前 |
| 无请求签名 | 低 | V1.5 |
| 无SQL注入防护测试 | 中 | V1.0 |

---

## 附录A：开发环境配置

```bash
# 前端
npx create-vite@latest client --template react-ts
cd client
npm install framer-motion zustand @tanstack/react-query zod react-hook-form

# 后端
mkdir server && cd server
npm init -y
npm install express @trpc/server @supabase/supabase-js prisma zod

# Supabase CLI
supabase init
supabase start
```

## 附录B：部署架构（MVP）

```
┌─────────────────────────────────────────┐
│              Vercel (前端)              │
│              ★ 免费托管                 │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Railway (后端)                 │
│          ★ $5/月起                      │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│ Supabase  │ │ 阿里云    │ │ 通义千问  │
│ (数据库)  │ │ (OSS/语音)│ │ (LLM)     │
│ ★ 免费层  │ │ ★ 按量    │ │ ★ 按量    │
└───────────┘ └───────────┘ └───────────┘
```

---

*文档版本：v3.0*
*更新时间：2026-03-26*
*设计原则：极速开发，复用优先，快速验证*
