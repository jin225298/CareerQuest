# 面试修炼手册 - 游戏化求职AI平台

基于火山引擎AI模型的MVP版本，实现像素风格面试模拟系统。

## 🎯 项目特性

- 🤖 **AI面试模拟** - 基于火山引擎豆包大模型的真实面试体验
- 🎮 **游戏化设计** - 像素风格UI，让面试练习变得有趣
- 💬 **智能对话** - 支持HR面、技术面、行为面等多种类型
- 📊 **实时反馈** - AI面试官根据回答智能追问

## 📁 项目结构

```
面试/
├── client/                 # 前端 (React + Vite + TypeScript)
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── lib/           # API客户端
│   │   └── App.tsx
│   └── package.json
│
├── server/                 # 后端 (FastAPI + Python)
│   ├── app/
│   │   ├── main.py        # FastAPI入口
│   │   ├── routers/       # API路由
│   │   ├── services/      # 业务逻辑
│   │   │   ├── volcengine.py  # 火山引擎SDK
│   │   │   └── interview.py   # 面试服务
│   │   └── schemas/       # 数据模型
│   ├── .env               # 环境变量
│   └── requirements.txt   # Python依赖
│
└── docs/                   # 项目文档
```

## 🚀 快速开始

### 方式1: 使用启动脚本（推荐）

```bash
# macOS/Linux
./start-all.sh
```

这会自动启动前端和后端服务。

### 方式2: 手动启动

#### 1. 启动后端

```bash
cd server

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple \
    fastapi uvicorn pydantic pydantic-settings \
    sqlalchemy aiosqlite python-dotenv python-multipart \
    volcengine-python-sdk

# 启动服务
uvicorn app.main:app --reload --port 8000
```

#### 2. 启动前端

```bash
cd client

# 安装依赖
pnpm install

# 启动服务
pnpm dev
```

### 访问地址

- 🌐 **前端**: http://localhost:5173
- 📚 **API文档**: http://localhost:8000/docs
- 📖 **ReDoc**: http://localhost:8000/redoc
- ❤️ **健康检查**: http://localhost:8000/health

## ⚙️ 环境配置

编辑 `server/.env` 文件：

```bash
# 火山引擎配置（必填）
ARK_API_KEY=你的API密钥
ARK_MODEL=doubao-1-5-pro-32k-250115

# 数据库
DATABASE_URL=sqlite+aiosqlite:///./interview.db

# 应用配置
DEBUG=true
```

### 获取火山引擎API密钥

1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 注册/登录账号
3. 进入「访问控制」→「访问密钥」
4. 创建新的 AccessKey

## 📡 API接口

### 基础URL
```
http://localhost:8000/api/v1
```

### 核心接口

#### 开始面试
```bash
POST /interviews/start
{
  "type": "hr",           # hr | technical | behavioral
  "difficulty": "medium", # easy | medium | hard
  "position": "前端开发"   # 可选
}
```

#### 发送消息
```bash
POST /interviews/reply
{
  "session_id": "xxx",
  "message": "你好，我是..."
}
```

#### 结束面试
```bash
POST /interviews/end
{
  "session_id": "xxx"
}
```

完整API文档请访问: http://localhost:8000/docs

## ✅ 已实现功能

### MVP功能
- [x] Python FastAPI后端
- [x] React前端
- [x] 火山引擎SDK集成
- [x] AI面试对话
- [x] 问卷调查系统
- [x] 像素风格UI

### 待开发
- [ ] 用户认证系统
- [ ] 语音识别/合成
- [ ] 像素头像生成
- [ ] 面试评分系统
- [ ] 游戏化属性

## 🛠️ 技术栈

### 前端
- React 19
- Vite 8
- TypeScript
- TailwindCSS 4
- Framer Motion

### 后端
- Python 3.11+
- FastAPI
- Pydantic
- SQLAlchemy
- 火山引擎SDK

### AI服务
- 火山引擎方舟（豆包大模型）
- 豆包语音（待集成）

## 🧪 测试

```bash
# 后端测试
cd server
pytest tests/

# 手动测试API
curl http://localhost:8000/health
```

## 📚 开发文档

- [后端README](server/README.md)
- [API协议文档](docs/API_PROTOCOL.md)
- [需求文档](docs/requirements.md)
- [架构设计](docs/arch/ARCH_DESIGN_v3.md)

## 🐛 故障排除

### Q: 后端启动失败
```bash
# 检查Python版本
python3 --version  # 需要3.11+

# 重新安装依赖
cd server
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Q: 火山引擎API调用失败
检查 `.env` 文件中的 `ARK_API_KEY` 是否正确配置。

### Q: 前端无法连接后端
确认后端运行在 http://localhost:8000

## 📄 许可证

MIT

---

**开发者**: 面试修炼手册团队  
**版本**: v1.0.0  
**更新时间**: 2026-03-26
