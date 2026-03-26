# 前端开发文档

> 版本: v1.0 | 更新时间: 2026-03-26

---

## 1. 项目概述

### 1.1 技术栈

| 模块 | 技术选型 | 版本 | 说明 |
|------|----------|------|------|
| 框架 | React | 18.x | Concurrent Mode支持 |
| 构建工具 | Vite | 5.x | 极速HMR，开发体验优化 |
| 动画 | Framer Motion | 11.x | 声明式动画，像素风格UI |
| 状态管理 | Zustand | 4.x | 极简状态管理，无样板代码 |
| 数据获取 | React Query | 5.x | 自动缓存、重试、乐观更新 |
| 样式 | TailwindCSS | 3.x | 原子化CSS，快速开发 |
| 音频处理 | Web Audio API | 原生 | 本地音频分析，延迟<10ms |
| 类型检查 | TypeScript | 5.x | 类型安全 |

### 1.2 目录结构

```
src/
├── components/           # 可复用组件
│   ├── common/          # 通用组件
│   │   ├── Button/
│   │   ├── Modal/
│   │   └── Loading/
│   ├── pixel/           # 像素小人相关
│   │   ├── PixelAvatar/
│   │   ├── SpriteRenderer/
│   │   └── LipSync/
│   ├── status/          # 状态条组件
│   │   ├── PowerBar/
│   │   ├── MoodBar/
│   │   └── HPBar/
│   ├── audio/           # 音频组件
│   │   ├── AudioRecorder/
│   │   ├── AudioVisualizer/
│   │   └── AudioPlayer/
│   └── charts/          # 图表组件
│       ├── RadarChart/
│       └── ScoreCard/
├── pages/               # 页面组件
│   ├── Home/
│   ├── Survey/
│   ├── Interview/
│   ├── Result/
│   └── Tasks/
├── hooks/               # 自定义Hooks
│   ├── useAuth.ts
│   ├── useWebSocket.ts
│   ├── useAudio.ts
│   └── usePixelAnimation.ts
├── stores/              # Zustand状态仓库
│   ├── authStore.ts
│   ├── userStore.ts
│   ├── interviewStore.ts
│   └── settingsStore.ts
├── services/            # API服务
│   ├── api.ts
│   ├── auth.ts
│   ├── user.ts
│   ├── interview.ts
│   └── websocket.ts
├── types/               # TypeScript类型定义
│   ├── user.ts
│   ├── interview.ts
│   ├── npc.ts
│   └── api.ts
├── utils/               # 工具函数
│   ├── audio.ts
│   ├── animation.ts
│   └── storage.ts
├── constants/           # 常量定义
│   ├── animation.ts
│   ├── api.ts
│   └── routes.ts
└── styles/              # 全局样式
    └── globals.css
```

### 1.3 环境要求

| 依赖 | 版本要求 |
|------|----------|
| Node.js | >= 18.0.0 |
| pnpm | >= 8.0.0 (推荐) |
| 浏览器 | Chrome 90+, Safari 14+, Firefox 90+ |

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建生产版本
pnpm build

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
```

---

## 2. 页面结构

### 2.1 首页（用户中心）

**路由**: `/` 或 `/home`

**功能描述**:
- 居中展示用户像素小人
- 状态条展示（武力/心情/HP）
- 侧边导航菜单
- 快速入口（开始面试、每日任务）

**页面布局**:
```
┌─────────────────────────────────────┐
│  ┌──────┐                           │
│  │ 导航 │        Header             │
│  │ 按钮 │                           │
│  └──────┘                           │
├─────────────────────────────────────┤
│        │                            │
│  侧边  │      像素小人              │
│  导航  │      (居中动画)            │
│  菜单  │                            │
│        │   ┌─────────────────┐     │
│        │   │ 武力值 ████░ 75  │     │
│        │   │ 心情值 ███░░ 60  │     │
│        │   │ HP    █████ 100 │     │
│        │   └─────────────────┘     │
│        │                            │
│        │   [开始面试]  [每日任务]   │
└─────────────────────────────────────┘
```

**关键组件**:
- `PixelAvatar`: 像素小人渲染
- `StatusBar`: 状态条组
- `NavigationMenu`: 导航菜单

### 2.2 问卷调查页

**路由**: `/survey`

**功能描述**:
- 职业方向选择（下拉/卡片）
- 性格标签选择（多选）
- 身份标签输入
- 提交后触发生成像素小人

**表单字段**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| career | select | 是 | 职业方向 |
| personality | multi-select | 是 | 性格标签 |
| tags | tag-input | 否 | 身份标签 |
| experience | select | 是 | 工作年限 |

**职业选项**:
```typescript
const CAREER_OPTIONS = [
  { value: 'software_engineer', label: '软件开发', tags: ['glasses', 'laptop', 'coffee'] },
  { value: 'algorithm', label: '算法工程师', tags: ['math', 'matrix'] },
  { value: 'product_manager', label: '产品经理', tags: ['notebook', 'whiteboard'] },
  { value: 'civil_service', label: '考公考编', tags: ['suit', 'folder'] },
];
```

**提交流程**:
```
提交问卷 → POST /api/v1/pixels/generate → 获取task_id
    ↓
轮询 GET /api/v1/pixels/task/{task_id}
    ↓
生成完成 → 跳转首页展示像素小人
```

### 2.3 面试页

**路由**: `/interview/:interviewId`

**功能描述**:
- 面试官NPC展示
- 用户像素小人展示
- 语音交互区
- 压力槽可视化
- 陪跑员提示区

**页面布局**:
```
┌─────────────────────────────────────────────┐
│  面试进度    ████████░░░░    第3/10题       │
├─────────────────────────────────────────────┤
│                                             │
│   ┌─────────┐         ┌─────────┐          │
│   │ 面试官  │ ◄─────► │ 用户    │          │
│   │  NPC    │         │ 像素人  │          │
│   └─────────┘         └─────────┘          │
│                                             │
│   ┌─────────────────────────────────────┐  │
│   │ "请介绍一下你的项目经验..."         │  │
│   │ ▶ [音频播放中]                      │  │
│   └─────────────────────────────────────┘  │
│                                             │
│   压力值: ████████░░ 80%                    │
│                                             │
│   ┌─────────────────────────────────────┐  │
│   │ 🎤 [按住说话] 或 [点击录音]         │  │
│   │ ▓▓▓▓▓▓▓░░░ 波形可视化               │  │
│   └─────────────────────────────────────┘  │
│                                             │
│   ┌─────────────────────────────────────┐  │
│   │ 💡 陪跑员: "可以谈谈具体贡献..."     │  │
│   └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**面试状态机**:
```
idle → listening → speaking → processing → listening ...
                ↓
            completed
```

**WebSocket连接**:
```typescript
const wsUrl = `wss://ws.example.com/interview/${interviewId}?token=${token}`;
```

### 2.4 评分结果页

**路由**: `/result/:interviewId`

**功能描述**:
- 五边形雷达图展示
- 多维度评分详情
- 面试陪跑员反馈
- 历史对比

**评分维度**:
| 维度 | 英文 | 说明 |
|------|------|------|
| 表达能力 | expression | 语言组织、表达清晰度 |
| 逻辑思维 | logic | 回答结构、因果关系 |
| 专业能力 | professional | 知识深度、准确性 |
| 应变能力 | adaptability | 临场反应、灵活度 |
| 情绪管理 | emotion | 紧张控制、自信度 |

**页面布局**:
```
┌─────────────────────────────────────────────┐
│           面试结果 - 总分 78分              │
├─────────────────────────────────────────────┤
│                                             │
│        ┌─────────────────────┐             │
│        │      雷达图         │             │
│        │    (五边形)         │             │
│        └─────────────────────┘             │
│                                             │
│   表达能力  ████████░░ 80  表达清晰        │
│   逻辑思维  ███████░░░ 75  思路清晰        │
│   专业能力  ████████░░ 82  知识扎实        │
│   应变能力  ██████░░░░ 70  有待提升        │
│   情绪管理  ████████░░ 85  情绪稳定        │
│                                             │
│   ┌─────────────────────────────────────┐  │
│   │ 💡 陪跑员反馈                        │  │
│   │ 整体表现不错！建议准备更多具体案例   │  │
│   └─────────────────────────────────────┘  │
│                                             │
│   [查看详细报告]    [再来一次]             │
└─────────────────────────────────────────────┘
```

### 2.5 任务页

**路由**: `/tasks`

**功能描述**:
- 每日任务列表
- 成就系统展示
- 奖励领取

**任务类型**:
| 类型 | 示例 | 奖励 |
|------|------|------|
| daily | 完成1次模拟面试 | 武力+5, 心情+2 |
| weekly | 累计完成7次面试 | 武力+20 |
| achievement | 首次完成面试 | 徽章解锁 |

**页面布局**:
```
┌─────────────────────────────────────────────┐
│  每日任务                      2026-03-26   │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ☐ 完成1次模拟面试        武力+5     │   │
│  │   进度: 0/1               [领取]    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ☑ 连续登录3天           心情+10    │   │
│  │   进度: 2/3              进行中     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  成就系统                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐         │
│  │ 🏆  │ │ 🎖  │ │ ⭐  │ │ 🔒  │         │
│  │初出  │ │连胜  │ │满分  │ │待解  │         │
│  │茅庐  │ │将军  │ │达人  │ │锁    │         │
│  └─────┘ └─────┘ └─────┘ └─────┘         │
└─────────────────────────────────────────────┘
```

---

## 3. 组件设计

### 3.1 像素小人组件 (PixelAvatar)

**文件位置**: `src/components/pixel/PixelAvatar/`

**Props定义**:
```typescript
interface PixelAvatarProps {
  spriteUrl: string;              // 精灵图URL
  animations: string[];           // 可用动画列表
  currentAnimation: AnimationType; // 当前动画状态
  size?: 'sm' | 'md' | 'lg';      // 尺寸
  className?: string;
  onLoaded?: () => void;          // 加载完成回调
  lipSyncEnabled?: boolean;       // 是否启用Lip Sync
  audioStream?: MediaStream;      // 音频流(用于Lip Sync)
}

type AnimationType = 'idle' | 'talk' | 'listen' | 'nod' | 'nervous' | 'sweat' | 'shake';
```

**状态管理**:
```typescript
interface PixelAvatarState {
  loaded: boolean;
  currentFrame: number;
  animationState: AnimationType;
  mouthFrame: number; // 0-5 for lip sync
}
```

**SpriteSheet配置**:
```typescript
const SPRITE_CONFIG = {
  frameWidth: 32,   // 单帧宽度(像素)
  frameHeight: 32,  // 单帧高度(像素)
  columns: 6,       // 每行动画帧数
  animations: {
    idle: { startFrame: 0, frameCount: 4, fps: 8 },
    talk: { startFrame: 6, frameCount: 6, fps: 12 },
    listen: { startFrame: 12, frameCount: 2, fps: 4 },
    nod: { startFrame: 14, frameCount: 4, fps: 8 },
    nervous: { startFrame: 18, frameCount: 4, fps: 10 },
  },
};
```

**事件处理**:
| 事件 | 触发条件 | 处理逻辑 |
|------|----------|----------|
| onAnimationEnd | 动画播放完成 | 切换到idle状态 |
| onFrameUpdate | 每帧更新 | 更新currentFrame |
| onVolumeChange | Lip Sync音量变化 | 计算mouthFrame |

**样式说明**:
```css
.pixel-avatar {
  image-rendering: pixelated; /* 保持像素锐利 */
  image-rendering: crisp-edges;
}

.pixel-avatar--sm { width: 64px; height: 64px; }
.pixel-avatar--md { width: 128px; height: 128px; }
.pixel-avatar--lg { width: 192px; height: 192px; }
```

### 3.2 状态条组件 (StatusBar)

**文件位置**: `src/components/status/StatusBar/`

**Props定义**:
```typescript
interface StatusBarProps {
  type: 'power' | 'mood' | 'hp';
  value: number;          // 当前值 0-100
  maxValue?: number;      // 最大值，默认100
  showLabel?: boolean;    // 是否显示标签
  animated?: boolean;     // 是否动画过渡
  onChange?: (value: number) => void; // 值变化回调
}

interface StatusBarsProps {
  power: number;
  mood: number;
  hp: number;
  animated?: boolean;
}
```

**状态条配置**:
```typescript
const STATUS_CONFIG = {
  power: {
    label: '武力值',
    color: '#FF6B6B',
    icon: '⚔️',
    gradient: ['#FF6B6B', '#FF8E8E'],
  },
  mood: {
    label: '心情值',
    color: '#4ECDC4',
    icon: '😊',
    gradient: ['#4ECDC4', '#7EDDD6'],
  },
  hp: {
    label: 'HP',
    color: '#45B7D1',
    icon: '❤️',
    gradient: ['#45B7D1', '#6BC9DE'],
  },
};
```

**动画效果**:
```typescript
const progressVariants = {
  initial: { scaleX: 0 },
  animate: { scaleX: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  change: { scaleX: [1, 0.8, 1], transition: { duration: 0.3 } },
};
```

### 3.3 语音组件 (AudioRecorder)

**文件位置**: `src/components/audio/AudioRecorder/`

**Props定义**:
```typescript
interface AudioRecorderProps {
  onAudioData?: (data: ArrayBuffer) => void;     // 音频数据回调(流式)
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
  maxDuration?: number;                          // 最大录制时长(秒)
  visualizer?: boolean;                          // 是否显示波形
  mode: 'push-to-talk' | 'toggle';               // 录音模式
  disabled?: boolean;
}

interface AudioVisualizerProps {
  audioStream: MediaStream;
  type?: 'wave' | 'bar';
  color?: string;
  height?: number;
}
```

**Web Audio API使用**:
```typescript
class AudioProcessor {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private processor: ScriptProcessorNode;
  private stream: MediaStream;

  async initialize(): Promise<void> {
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    
    source.connect(this.analyser);
  }

  // 获取音量(用于Lip Sync)
  getVolume(): number {
    const dataArray = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    return Math.sqrt(sum / dataArray.length);
  }

  // 获取波形数据(用于可视化)
  getWaveformData(): Uint8Array {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(dataArray);
    return dataArray;
  }
}
```

**Lip Sync同步算法**:
```typescript
const LipSyncAlgo = {
  calculateVolume(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  },

  volumeToMouthFrame(volume: number): number {
    return Math.floor(Math.min(volume * 10, 5)); // 0-5帧索引
  },

  animate(analyser: AnalyserNode, callback: (frame: number) => void) {
    const dataArray = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(dataArray);
    const volume = this.calculateVolume(dataArray);
    const frame = this.volumeToMouthFrame(volume);
    callback(frame);
    requestAnimationFrame(() => this.animate(analyser, callback));
  },
};
```

### 3.4 雷达图组件 (RadarChart)

**文件位置**: `src/components/charts/RadarChart/`

**Props定义**:
```typescript
interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
  maxValue?: number;
  labels?: string[];
  fillColor?: string;
  strokeColor?: string;
  animated?: boolean;
}

interface RadarDataPoint {
  label: string;
  value: number;
  maxValue?: number;
}
```

**Canvas绘制**:
```typescript
const drawRadarChart = (
  ctx: CanvasRenderingContext2D,
  data: RadarDataPoint[],
  config: ChartConfig
) => {
  const { centerX, centerY, radius, levels } = config;
  const angleStep = (2 * Math.PI) / data.length;

  // 绘制背景网格
  for (let level = 1; level <= levels; level++) {
    const levelRadius = (radius * level) / levels;
    ctx.beginPath();
    for (let i = 0; i <= data.length; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = centerX + levelRadius * Math.cos(angle);
      const y = centerY + levelRadius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // 绘制数据区域
  ctx.beginPath();
  data.forEach((point, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const pointRadius = (radius * point.value) / (point.maxValue || 100);
    const x = centerX + pointRadius * Math.cos(angle);
    const y = centerY + pointRadius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = config.fillColor;
  ctx.fill();
};
```

---

## 4. 状态管理

### 4.1 Zustand状态设计

**认证状态 (authStore.ts)**:
```typescript
interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshTokens: () => Promise<void>;
  setUser: (user: User) => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      user: null,

      login: async (credentials) => {
        const response = await authApi.login(credentials);
        set({
          isAuthenticated: true,
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          user: response.user,
        });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          user: null,
        });
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');
        const response = await authApi.refresh(refreshToken);
        set({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
        });
      },

      setUser: (user) => set({ user }),
    }),
    { name: 'auth-storage' }
  )
);
```

**面试状态 (interviewStore.ts)**:
```typescript
interface InterviewState {
  interviewId: string | null;
  status: InterviewStatus;
  currentTurn: number;
  stressLevel: number;
  messages: Message[];
  scores: Scores | null;
  
  // Actions
  startInterview: (config: InterviewConfig) => Promise<void>;
  endInterview: () => Promise<void>;
  addMessage: (message: Message) => void;
  updateStress: (level: number) => void;
  setScores: (scores: Scores) => void;
}

type InterviewStatus = 'idle' | 'connecting' | 'in_progress' | 'completed' | 'error';
```

**用户状态 (userStore.ts)**:
```typescript
interface UserState {
  attributes: {
    power: number;
    mood: number;
    hp: number;
    wins: number;
  };
  pixelAvatar: PixelAvatar | null;
  stats: UserStats | null;
  
  // Actions
  updateAttributes: (attrs: Partial<UserState['attributes']>) => void;
  setPixelAvatar: (avatar: PixelAvatar) => void;
  fetchStats: () => Promise<void>;
}
```

### 4.2 React Query数据获取

**API客户端配置**:
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5分钟
      gcTime: 10 * 60 * 1000,    // 10分钟
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

**用户数据Hook**:
```typescript
const useUser = () => {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => userApi.getMe(),
    staleTime: 2 * 60 * 1000,
  });
};

const useUserStats = () => {
  return useQuery({
    queryKey: ['user', 'stats'],
    queryFn: () => userApi.getStats(),
    staleTime: 5 * 60 * 1000,
  });
};
```

**面试数据Hook**:
```typescript
const useInterview = (interviewId: string) => {
  return useQuery({
    queryKey: ['interview', interviewId],
    queryFn: () => interviewApi.get(interviewId),
    enabled: !!interviewId,
  });
};

const useInterviewReport = (interviewId: string) => {
  return useQuery({
    queryKey: ['interview', interviewId, 'report'],
    queryFn: () => interviewApi.getReport(interviewId),
    enabled: !!interviewId,
  });
};

const useInterviewList = (page: number, filters?: InterviewFilters) => {
  return useQuery({
    queryKey: ['interviews', page, filters],
    queryFn: () => interviewApi.list(page, filters),
    keepPreviousData: true,
  });
};
```

---

## 5. API调用

### 5.1 认证接口

**服务文件**: `src/services/auth.ts`

```typescript
const authApi = {
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },

  sendCode: async (phone: string): Promise<void> => {
    await api.post('/auth/send-code', { phone });
  },
};
```

### 5.2 用户接口

**服务文件**: `src/services/user.ts`

```typescript
const userApi = {
  getMe: async (): Promise<User> => {
    const response = await api.get('/users/me');
    return response.data;
  },

  updateMe: async (data: UpdateUserRequest): Promise<User> => {
    const response = await api.put('/users/me', data);
    return response.data;
  },

  getStats: async (): Promise<UserStats> => {
    const response = await api.get('/users/me/stats');
    return response.data;
  },

  updateAttributes: async (attrs: Partial<UserAttributes>): Promise<UserAttributes> => {
    const response = await api.put('/users/me/attributes', attrs);
    return response.data;
  },
};
```

### 5.3 面试接口

**服务文件**: `src/services/interview.ts`

```typescript
const interviewApi = {
  create: async (data: CreateInterviewRequest): Promise<Interview> => {
    const response = await api.post('/interviews', data);
    return response.data;
  },

  start: async (interviewId: string): Promise<StartInterviewResponse> => {
    const response = await api.post(`/interviews/${interviewId}/start`);
    return response.data;
  },

  end: async (interviewId: string): Promise<EndInterviewResponse> => {
    const response = await api.post(`/interviews/${interviewId}/end`);
    return response.data;
  },

  get: async (interviewId: string): Promise<Interview> => {
    const response = await api.get(`/interviews/${interviewId}`);
    return response.data;
  },

  list: async (page: number, filters?: InterviewFilters): Promise<PaginatedResponse<Interview>> => {
    const response = await api.get('/interviews', { params: { page, ...filters } });
    return response.data;
  },

  getReport: async (interviewId: string): Promise<InterviewReport> => {
    const response = await api.get(`/interviews/${interviewId}/report`);
    return response.data;
  },
};
```

### 5.4 WebSocket连接

**服务文件**: `src/services/websocket.ts`

```typescript
enum MessageType {
  AUDIO_DATA = 0,
  AUDIO_END = 1,
  TRANSCRIPT = 2,
  NPC_TEXT = 3,
  NPC_AUDIO = 4,
  STRESS_UPDATE = 5,
  TURN_UPDATE = 6,
  HINT = 7,
  ERROR = 8,
  HEARTBEAT = 9,
  INTERVIEW_END = 10,
}

interface WSMessage {
  type: MessageType;
  seq: number;
  timestamp: number;
  payload: unknown;
}

class InterviewWebSocket {
  private ws: WebSocket | null = null;
  private seq = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  connect(interviewId: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `wss://ws.example.com/interview/${interviewId}?token=${token}`;
      this.ws = new WebSocket(url, 'messagepack');
      
      this.ws.binaryType = 'arraybuffer';
      
      this.ws.onopen = () => {
        this.startHeartbeat();
        resolve();
      };
      
      this.ws.onerror = (error) => reject(error);
      this.ws.onmessage = this.handleMessage.bind(this);
    });
  }

  sendAudio(audioData: ArrayBuffer): void {
    this.send({
      type: MessageType.AUDIO_DATA,
      seq: this.seq++,
      timestamp: Date.now(),
      payload: audioData,
    });
  }

  sendAudioEnd(): void {
    this.send({
      type: MessageType.AUDIO_END,
      seq: this.seq++,
      timestamp: Date.now(),
      payload: null,
    });
  }

  private send(message: WSMessage): void {
    if (!this.ws) return;
    const encoded = msgpack.encode(message);
    this.ws.send(encoded);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({
        type: MessageType.HEARTBEAT,
        seq: this.seq++,
        timestamp: Date.now(),
        payload: null,
      });
    }, 30000);
  }

  private handleMessage(event: MessageEvent): void {
    const message = msgpack.decode(new Uint8Array(event.data)) as WSMessage;
    this.handleMessageType(message);
  }

  private handleMessageType(message: WSMessage): void {
    switch (message.type) {
      case MessageType.TRANSCRIPT:
        useInterviewStore.getState().addTranscript(message.payload as TranscriptPayload);
        break;
      case MessageType.NPC_TEXT:
        useInterviewStore.getState().addNPCMessage(message.payload as NPCMessagePayload);
        break;
      case MessageType.STRESS_UPDATE:
        useInterviewStore.getState().updateStress((message.payload as StressPayload).stress_level);
        break;
      case MessageType.HINT:
        useInterviewStore.getState().addHint(message.payload as HintPayload);
        break;
      case MessageType.INTERVIEW_END:
        useInterviewStore.getState().endInterview();
        break;
    }
  }

  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.ws?.close();
    this.ws = null;
  }
}

export const interviewWS = new InterviewWebSocket();
```

---

## 6. 动画设计

### 6.1 Framer Motion动画

**页面过渡**:
```typescript
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
  >
    {children}
  </motion.div>
);
```

**按钮交互**:
```typescript
const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05, transition: { duration: 0.2 } },
  tap: { scale: 0.95 },
};

const PixelButton = ({ children, onClick }: ButtonProps) => (
  <motion.button
    variants={buttonVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
    onClick={onClick}
    className="pixel-button"
  >
    {children}
  </motion.button>
);
```

**状态条动画**:
```typescript
const barVariants = {
  initial: { width: 0 },
  animate: (value: number) => ({
    width: `${value}%`,
    transition: { duration: 0.5, ease: 'easeOut' },
  }),
  change: (value: number) => ({
    width: `${value}%`,
    transition: { duration: 0.3, ease: 'easeInOut' },
  }),
};
```

### 6.2 像素风格UI动画

**闪烁效果**:
```css
@keyframes pixel-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.pixel-blink {
  animation: pixel-blink 1s steps(1) infinite;
}
```

**像素抖动**:
```css
@keyframes pixel-shake {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-1px, 0); }
  50% { transform: translate(1px, 0); }
  75% { transform: translate(-1px, 0); }
}

.pixel-shake {
  animation: pixel-shake 0.1s steps(1) infinite;
}
```

**像素淡入**:
```css
@keyframes pixel-fade-in {
  from { 
    opacity: 0; 
    transform: scale(0.8);
    image-rendering: pixelated;
  }
  to { 
    opacity: 1; 
    transform: scale(1);
  }
}

.pixel-fade-in {
  animation: pixel-fade-in 0.3s steps(3) forwards;
}
```

### 6.3 过渡效果

**面试页面入场**:
```typescript
const interviewContainerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const npcVariants = {
  initial: { x: -100, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
};

const userVariants = {
  initial: { x: 100, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
};
```

**评分结果页动画**:
```typescript
const scoreRevealVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: { delay: i * 0.1, type: 'spring', stiffness: 200 },
  }),
};

const radarChartVariants = {
  initial: { scale: 0, rotate: -180 },
  animate: {
    scale: 1,
    rotate: 0,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
};
```

---

## 7. 响应式设计

### 7.1 断点定义

```typescript
const breakpoints = {
  sm: '640px',   // 手机
  md: '768px',   // 平板
  lg: '1024px',  // 小屏电脑
  xl: '1280px',  // 桌面
  '2xl': '1536px', // 大屏
};
```

### 7.2 TailwindCSS响应式类

```tsx
// 像素小人尺寸响应
<div className="
  w-16 h-16 sm:w-24 sm:h-24 
  md:w-32 md:h-32 lg:w-48 lg:h-48
">
  <PixelAvatar {...props} />
</div>

// 布局响应
<div className="
  flex flex-col md:flex-row
  gap-4 md:gap-6 lg:gap-8
">
  <NPCPanel />
  <UserPanel />
</div>

// 字体响应
<h1 className="
  text-2xl sm:text-3xl md:text-4xl
  font-pixel
">
  面试中心
</h1>
```

### 7.3 移动端适配

**触摸事件**:
```typescript
const useTouchEvents = (ref: RefObject<HTMLElement>) => {
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = () => setIsPressed(true);
    const handleTouchEnd = () => setIsPressed(false);

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref]);

  return isPressed;
};
```

**安全区域**:
```css
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-top {
  padding-top: env(safe-area-inset-top);
}
```

---

## 8. 部署说明

### 8.1 构建配置

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          animation: ['framer-motion'],
          data: ['@tanstack/react-query', 'zustand'],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
});
```

### 8.2 环境变量

```bash
# .env.production
VITE_API_BASE_URL=https://api.example.com
VITE_WS_URL=wss://ws.example.com
VITE_CDN_URL=https://cdn.example.com

# .env.development
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
VITE_CDN_URL=http://localhost:3000
```

### 8.3 Vercel部署

**vercel.json**:
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://api.example.com/api/$1" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

### 8.4 性能优化

**图片优化**:
- 使用WebP/AVIF格式
- 像素图片使用`image-rendering: pixelated`
- Sprite图预加载

**代码分割**:
```typescript
const Home = lazy(() => import('./pages/Home'));
const Interview = lazy(() => import('./pages/Interview'));
const Result = lazy(() => import('./pages/Result'));
```

**缓存策略**:
```typescript
// Service Worker缓存
const CACHE_NAME = 'pixel-interview-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/sprites/default.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});
```

---

## 附录A: 类型定义

**用户类型** (`src/types/user.ts`):
```typescript
interface User {
  user_id: string;
  phone?: string;
  email?: string;
  nickname: string;
  avatar_url: string;
  attributes: UserAttributes;
  pixel_avatar?: PixelAvatar;
  membership?: Membership;
  created_at: string;
  last_active_at: string;
}

interface UserAttributes {
  power: number;
  mood: number;
  hp: number;
  wins: number;
}

interface PixelAvatar {
  pixel_id: string;
  sprite_url: string;
  animations: string[];
}
```

**面试类型** (`src/types/interview.ts`):
```typescript
interface Interview {
  interview_id: string;
  user_id: string;
  type: 'behavioral' | 'technical' | 'hr';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  difficulty: 'easy' | 'medium' | 'hard';
  npc: NPCInfo;
  turn_count: number;
  stress_level: number;
  scores?: InterviewScores;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
}

interface InterviewScores {
  overall: number;
  dimensions: {
    expression: number;
    logic: number;
    professional: number;
    adaptability: number;
    emotion: number;
  };
}
```

---

## 附录B: 错误处理

**全局错误边界**:
```typescript
class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

**API错误处理**:
```typescript
const handleApiError = (error: AxiosError) => {
  const { response } = error;
  if (!response) {
    return { message: '网络错误，请检查网络连接' };
  }

  const { data } = response;
  const errorMap: Record<string, string> = {
    '20001': '请先登录',
    '20002': '登录已过期，请重新登录',
    '40006': 'AI服务暂时不可用，请稍后重试',
  };

  return { message: errorMap[data.code] || data.message || '未知错误' };
};
```

---

*文档版本: v1.0*
*更新时间: 2026-03-26*
