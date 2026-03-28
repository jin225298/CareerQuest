# 头像情绪系统任务分发

## 一、需求概述

| 需求项 | 描述 | 优先级 |
|--------|------|--------|
| 多情绪生成 | 一次性生成 happy, sad, excited 三种情绪动画 | P0 |
| 情绪切换 | 根据用户 mood 值或手动选择切换显示的情绪 | P0 |
| NPC像素化 | 将老师.jpg和面试官.jpg转换为像素风格 | P1 |

---

## 二、现状分析

### 后端现状
- `server/app/routers/avatar.py:77` - 硬编码 `emotion="happy"`
- `pixel_animator/emotion_animator.py:134` - 已有 `generate_all_emotions()` 函数支持多情绪
- `server/app/models/__init__.py:24` - User 已有 `mood` 字段（Integer, default=70）
- `server/app/schemas/avatar.py` - AvatarResponse 只返回单个 sprite_url/preview_url

### 前端现状
- `client/src/pages/AvatarPage.tsx` - 只显示单一动画结果
- `client/src/pages/HomePage.tsx:289-294` - 固定使用 `/avatar.gif`
- `client/src/components/CompanionNPC.tsx` - 无像素化NPC图片

### NPC资源
- `/Users/kang/面试/老师.jpg` - 需像素化处理
- `/Users/kang/面试/面试官.jpg` - 需像素化处理

---

## 三、任务分发

### 任务组 A：数据库模型与Schema（后端）

#### A1. 扩展 User 模型 - 存储多种情绪图片
**文件**: `server/app/models/__init__.py`

**改动**:
```python
# 在 User 类中添加
avatar_happy_gif = Column(String, nullable=True)
avatar_happy_png = Column(String, nullable=True)
avatar_sad_gif = Column(String, nullable=True)
avatar_sad_png = Column(String, nullable=True)
avatar_excited_gif = Column(String, nullable=True)
avatar_excited_png = Column(String, nullable=True)
current_emotion = Column(String, default="happy")  # 当前显示的情绪
```

**依赖**: 无
**工时**: 0.5h

---

#### A2. 新增 Schema - 多情绪响应
**文件**: `server/app/schemas/avatar.py`

**改动**:
```python
class EmotionUrls(BaseModel):
    gif: str
    png: str

class MultiEmotionAvatarResponse(BaseModel):
    avatar_id: str
    emotions: dict[str, EmotionUrls]  # {"happy": {...}, "sad": {...}, "excited": {...}}
    metadata: dict

class AvatarTaskStatus(BaseModel):
    # 新增字段
    current_emotion: Optional[str] = "happy"
```

**依赖**: A1
**工时**: 0.5h

---

### 任务组 B：后端API改造

#### B1. 修改上传接口 - 生成3种情绪
**文件**: `server/app/routers/avatar.py`

**改动点**:
1. 第74-78行，替换单次调用为循环生成3种情绪：
```python
# 原: generate_emotion_frames(..., emotion="happy", ...)
# 改: 调用 generate_all_emotions() 一次性生成3种情绪
```

2. 修改 `process_avatar_task()` 输出结构，存储3组图片路径
3. 需要关联用户ID，将生成的图片路径写入数据库

**关键代码位置**: `avatar.py:37-115`

**依赖**: A1, A2
**工时**: 2h

---

#### B2. 新增情绪切换接口
**文件**: `server/app/routers/avatar.py`

**新增接口**:
```python
@router.patch("/{user_id}/emotion")
async def set_avatar_emotion(user_id: str, emotion: str):
    """手动设置当前显示的情绪"""
    # 更新 user.current_emotion

@router.get("/{user_id}/emotion")
async def get_avatar_emotion(user_id: str):
    """获取当前用户头像情绪状态"""
    # 根据 mood 自动推荐情绪，返回所有情绪图片
```

**依赖**: A1
**工时**: 1h

---

#### B3. 心情值联动接口
**文件**: `server/app/routers/avatar.py` 或新建 `mood.py`

**逻辑**:
```python
def get_recommended_emotion(mood: int) -> str:
    if mood < 30:
        return "sad"
    elif mood <= 70:
        return "happy"
    else:
        return "excited"
```

**依赖**: A1
**工时**: 0.5h

---

### 任务组 C：前端改造

#### C1. AvatarPage 改造 - 显示3种情绪结果
**文件**: `client/src/pages/AvatarPage.tsx`

**改动点**:
1. 修改状态存储，从单一结果改为多情绪结果
2. 生成完成后，展示3个情绪的预览（可切换tab或并排显示）
3. 用户可选择默认情绪

**UI设计**:
```
生成完成后:
┌─────────────────────────────┐
│  [开心] [难过] [激动]        │  <- Tab切换
├─────────────────────────────┤
│     ┌─────┐  ┌─────┐       │
│     │静态图│  │动画 │       │
│     └─────┘  └─────┘       │
│                             │
│  [设为默认情绪]              │
└─────────────────────────────┘
```

**依赖**: A2, B1
**工时**: 2h

---

#### C2. HomePage 改造 - 动态显示情绪
**文件**: `client/src/pages/HomePage.tsx`

**改动点**:
1. 第289-294行，从固定 `/avatar.gif` 改为动态获取
2. 添加情绪切换按钮（可选）
3. 根据 mood 值自动切换显示的情绪

**实现**:
```tsx
const getEmotionByMood = (mood: number) => {
  if (mood < 30) return 'sad';
  if (mood <= 70) return 'happy';
  return 'excited';
};

// 从API获取用户情绪图片
const avatarSrc = userData?.[`avatar_${currentEmotion}_gif`] || '/avatar.gif';
```

**依赖**: B2, B3
**工时**: 1.5h

---

#### C3. 情绪切换组件
**文件**: `client/src/components/EmotionSelector.tsx`（新建）

**功能**:
- 显示当前情绪状态
- 提供情绪切换按钮
- 显示心情值与情绪的对应关系

**依赖**: B2
**工时**: 1h

---

### 任务组 D：NPC像素化

#### D1. NPC像素化脚本
**文件**: `pixel_animator/npc_converter.py`（新建）

**功能**:
```python
def convert_npc_to_pixel(input_path: str, output_path: str, npc_type: str):
    """将NPC图片转换为像素风格"""
    # 使用 emotion_animator.py 的风格参考
    # 输出像素化后的 PNG
```

**调用方式**:
```bash
python -m pixel_animator.npc_converter --input 老师.jpg --output static/npcs/teacher.png --type teacher
python -m pixel_animator.npc_converter --input 面试官.jpg --output static/npcs/interviewer.png --type interviewer
```

**依赖**: 无
**工时**: 1h

---

#### D2. 静态资源存储
**目录结构**:
```
server/static/
├── avatars/
│   └── {task_id}/
│       ├── happy.gif
│       ├── happy.png
│       ├── sad.gif
│       ├── sad.png
│       ├── excited.gif
│       └── excited.png
└── npcs/
    ├── teacher.png
    └── interviewer.png
```

**依赖**: D1
**工时**: 0.5h

---

#### D3. CompanionNPC 组件改造
**文件**: `client/src/components/CompanionNPC.tsx`

**改动**:
1. 将文字图标改为像素化NPC图片
2. 根据场景显示不同的NPC（面试页显示面试官，其他页面显示老师）
3. 可根据压力值显示不同情绪状态

**依赖**: D1, D2
**工时**: 1h

---

## 四、任务依赖关系图

```
A1 (User模型) ──┬──> A2 (Schema) ──> B1 (上传接口) ──> C1 (AvatarPage)
                │
                ├──> B2 (情绪切换接口) ──> C2 (HomePage)
                │                           └──> C3 (EmotionSelector)
                └──> B3 (心情联动)
                
D1 (NPC脚本) ──> D2 (资源存储) ──> D3 (CompanionNPC改造)
```

---

## 五、工时估算

| 任务组 | 任务数 | 总工时 |
|--------|--------|--------|
| A - 数据库 | 2 | 1h |
| B - 后端API | 3 | 3.5h |
| C - 前端 | 3 | 4.5h |
| D - NPC | 3 | 2.5h |
| **合计** | **11** | **11.5h** |

---

## 六、执行顺序建议

### Phase 1: 基础设施 (Day 1 上午)
1. A1 - User模型扩展
2. A2 - Schema定义
3. 数据库迁移

### Phase 2: 后端核心 (Day 1 下午)
4. B1 - 上传接口改造（最核心）
5. B2 - 情绪切换接口
6. B3 - 心情联动

### Phase 3: 前端实现 (Day 2 上午)
7. C1 - AvatarPage改造
8. C2 - HomePage改造
9. C3 - 情绪切换组件

### Phase 4: NPC系统 (Day 2 下午)
10. D1 - NPC像素化脚本
11. D2 - 资源存储
12. D3 - CompanionNPC改造

---

## 七、风险点

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| API生成3种情绪耗时长 | 用户体验下降 | 使用后台任务，轮询进度 |
| 存储空间增长 | 磁盘占用增加 | 定期清理旧头像，或使用CDN |
| mood值更新频率 | 情绪切换频繁 | 添加防抖，用户也可手动锁定情绪 |

---

## 八、验收标准

- [ ] 上传照片后，生成 happy/sad/excited 三种情绪的 GIF 和 PNG
- [ ] 生成结果存储到数据库，关联用户ID
- [ ] 首页根据用户 mood 值自动切换显示的情绪
- [ ] 用户可手动选择显示哪个情绪
- [ ] NPC 图片已像素化并存储
- [ ] CompanionNPC 组件使用像素化图片
