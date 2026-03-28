# FastAPI后端 - 快速开始指南

## 🚀 快速启动

### 1. 安装Python依赖

```bash
cd server

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple fastapi uvicorn pydantic pydantic-settings sqlalchemy aiosqlite python-dotenv python-multipart
```

### 2. 安装火山引擎SDK

```bash
# 方式1: 使用pip安装（推荐）
pip install volcengine-python-sdk

# 方式2: 如果上述命令失败，手动安装
pip install volcengine
```

### 3. 配置环境变量

编辑 `server/.env` 文件：

```bash
# 火山引擎配置
ARK_API_KEY=你的API密钥
ARK_MODEL=doubao-1-5-pro-32k-250115

# 数据库
DATABASE_URL=sqlite+aiosqlite:///./interview.db

# 应用配置
DEBUG=true
```

### 4. 启动后端服务

```bash
# 在server目录下，激活虚拟环境后
uvicorn app.main:app --reload --port 8000
```

访问：
- API文档: http://localhost:8000/docs
- ReDoc文档: http://localhost:8000/redoc
- 健康检查: http://localhost:8000/health

---

## 🔥 火山引擎配置详解

### 获取API密钥

1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 注册/登录账号
3. 进入「访问控制」→「访问密钥」
4. 创建新的 AccessKey

### 模型说明

当前使用的模型：`doubao-1-5-pro-32k-250115`

支持的模型列表：
- `doubao-1-5-pro-32k-250115` - 豆包Pro 32K（推荐）
- `doubao-1-5-lite-32k-250115` - 豆包Lite 32K
- 其他模型请参考火山引擎文档

### SDK使用示例

```python
import os
from volcenginesdkarkruntime import Ark

client = Ark(api_key=os.getenv("ARK_API_KEY"))

completion = client.chat.completions.create(
    model="doubao-1-5-pro-32k-250115",
    messages=[
        {"role": "user", "content": "你好"}
    ]
)

print(completion.choices[0].message.content)
```

---

## 📡 API接口文档

### 基础URL
```
http://localhost:8000/api/v1
```

### 接口列表

#### 1. 开始面试
```
POST /api/v1/interviews/start

请求体:
{
  "type": "hr",           // hr | technical | behavioral
  "difficulty": "medium", // easy | medium | hard
  "position": "前端开发"   // 可选
}

响应:
{
  "session_id": "interview_1234567890_abc123",
  "first_question": "你好，请做一个简单的自我介绍。",
  "type": "hr",
  "difficulty": "medium"
}
```

#### 2. 发送消息
```
POST /api/v1/interviews/reply

请求体:
{
  "session_id": "interview_1234567890_abc123",
  "message": "你好，我是..."
}

响应:
{
  "response": "很好，你的自我介绍很清晰...",
  "session_id": "interview_1234567890_abc123"
}
```

#### 3. 结束面试
```
POST /api/v1/interviews/end

请求体:
{
  "session_id": "interview_1234567890_abc123"
}

响应:
{
  "success": true,
  "session_id": "interview_1234567890_abc123",
  "message_count": 10
}
```

#### 4. 获取问卷
```
GET /api/v1/survey/questions

响应:
[
  {
    "id": "career",
    "type": "single",
    "question": "你的职业方向是什么？",
    "options": ["软件开发", "产品经理", ...],
    "required": true
  },
  ...
]
```

#### 5. 提交问卷
```
POST /api/v1/survey/submit

请求体:
{
  "answers": [
    {"question_id": "career", "answer": "软件开发"},
    {"question_id": "experience", "answer": "3-5年"}
  ]
}
```

---

## 🧪 测试

### 运行测试

```bash
cd server
pytest tests/
```

### 手动测试

使用curl或Postman测试API：

```bash
# 健康检查
curl http://localhost:8000/health

# 开始面试
curl -X POST http://localhost:8000/api/v1/interviews/start \
  -H "Content-Type: application/json" \
  -d '{"type":"hr","difficulty":"medium"}'

# 发送消息
curl -X POST http://localhost:8000/api/v1/interviews/reply \
  -H "Content-Type: application/json" \
  -d '{"session_id":"your_session_id","message":"你好"}'
```

---

## 📁 项目结构

```
server/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI应用入口
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库配置
│   ├── models/              # SQLAlchemy模型
│   ├── schemas/             # Pydantic模型
│   ├── routers/             # API路由
│   │   ├── interview.py     # 面试接口
│   │   ├── survey.py        # 问卷接口
│   │   ├── user.py          # 用户接口
│   │   └── avatar.py        # 头像接口
│   └── services/            # 业务逻辑
│       ├── volcengine.py    # 火山引擎SDK
│       └── interview.py     # 面试服务
├── .env                     # 环境变量
├── requirements.txt         # Python依赖
└── venv/                    # 虚拟环境
```

---

## ⚠️ 常见问题

### Q: 启动报错 "ModuleNotFoundError: No module named 'volcenginesdkarkruntime'"
A: 火山引擎SDK未安装，运行：
```bash
pip install volcengine-python-sdk
```

### Q: 火山引擎API调用失败
A: 检查 `.env` 文件中的 `ARK_API_KEY` 是否正确

### Q: 前端无法连接后端
A: 确认后端运行在 http://localhost:8000，并检查CORS配置

### Q: 数据库错误
A: 删除 `interview.db` 文件，重启服务自动创建

---

## 🔄 开发工作流

### 启动开发服务器

```bash
# 终端1: 启动后端
cd server
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 终端2: 启动前端
cd client
pnpm dev
```

### 热重载

后端使用 `--reload` 参数，修改代码自动重启。

---

## 📚 参考文档

- [FastAPI官方文档](https://fastapi.tiangolo.com/)
- [Pydantic文档](https://docs.pydantic.dev/)
- [火山引擎方舟文档](https://www.volcengine.com/docs/82379)
- [火山引擎Python SDK](https://github.com/volcengine/volcengine-python-sdk)
