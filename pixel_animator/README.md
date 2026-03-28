# 像素动画生成器

将图片分割成 3x3 宫格 → AI 生成像素风格 → 合并 → 抠除背景 → 动画

专为游戏角色素材生成设计，自动抠图生成透明背景。

## 安装

```bash
# 使用 uv 安装依赖
uv sync

# 或使用 pip
pip install openai pillow numpy requests
```

## 配置环境变量

```bash
# 必需: 火山引擎 API Key
export ARK_API_KEY="your-ark-api-key"

# 可选: 图床 API Key (推荐配置，可提高生成速度)
# imgbb 图床 (免费): https://api.imgbb.com/
export IMGBB_API_KEY="your-imgbb-api-key"
```

## 使用方法

```bash
# 基本使用（自动绿色背景抠图）
uv run python pixel_animator.py main.png

# 自定义参数
uv run python pixel_animator.py main.png -o my_output -g 3 -f 8

# 保留背景（不移除）
uv run python pixel_animator.py main.png --no-remove-bg

# 指定背景颜色
uv run python pixel_animator.py main.png --bg-color green   # 绿色背景（默认）
uv run python pixel_animator.py main.png --bg-color white   # 白色背景
uv run python pixel_animator.py main.png --bg-color black   # 黑色背景

# 自定义提示词
uv run python pixel_animator.py main.png -p "像素角色，战士职业，盔甲，绿色背景"
```

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| input | 输入图片路径 | main.png |
| -o, --output | 输出目录 | output |
| -p, --prompt | 自定义提示词 | 像素游戏角色立绘... |
| -g, --grid | 宫格大小 | 3 (3x3) |
| -f, --frames | 动画帧数 | 8 |
| --no-remove-bg | 不移除背景 | False |
| --bg-color | 背景颜色 | green |

## 流程说明

1. **分割** - 将原图分割成 3x3 = 9 个宫格
2. **上传** - 将宫格图片上传到图床获取 URL
3. **生成** - 调用 Doubao Seedence 5.0 生成像素风格（带绿色背景）
4. **合并** - 将 9 个宫格合并成完整图片
5. **抠图** - 自动识别并移除绿色背景，生成透明PNG
6. **动画** - 添加浮动效果生成 GIF

## 提示词建议

### 角色立绘（推荐）
```
像素游戏角色立绘，16bit复古风格，可爱Q版，清晰的轮廓，鲜艳的色彩，纯绿色背景 #00FF00
```

### 角色（透明背景）
```
像素角色立绘，16bit风格，可爱Q版，游戏角色设计，色彩明亮，边缘清晰，透明背景
```

### 道具图标
```
像素道具图标，16bit风格，游戏道具设计，清晰轮廓，鲜艳配色，纯绿色背景 #00FF00
```

## 输出文件

```
output/
├── splits/          # 分割后的宫格
│   ├── cell_0_0.png
│   └── ...
├── generated/       # AI生成的宫格
│   ├── pixel_0_0.png
│   └── ...
├── merged.png       # 合并后的完整图
├── character.png    # 游戏角色素材（透明背景）⭐
└── animation.gif    # 最终动画
```

## 游戏使用

生成的 `character.png` 是透明背景的像素角色，可直接用于：
- Unity / Godot 等游戏引擎
- 像素游戏角色精灵
- 2D 游戏立绘

## 获取 API Key

### 火山引擎 (必需)
1. 访问 https://www.volcengine.com/
2. 注册并开通 ARK 服务
3. 获取 API Key

### imgbb 图床 (推荐)
1. 访问 https://api.imgbb.com/
2. 点击 "Get API Key"
3. 免费注册后即可获取
