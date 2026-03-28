#!/bin/bash

echo "🚀 启动面试大冒险后端..."

cd "$(dirname "$0")"

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "📥 安装依赖..."
pip install -q -i https://pypi.tuna.tsinghua.edu.cn/simple \
    fastapi uvicorn pydantic pydantic-settings \
    sqlalchemy aiosqlite python-dotenv python-multipart

# 尝试安装火山引擎SDK
echo "🔥 安装火山引擎SDK..."
pip install -q volcengine-python-sdk 2>/dev/null || pip install -q volcengine

# 启动服务
echo "✅ 启动FastAPI服务..."
echo "📍 API文档: http://localhost:8000/docs"
echo "📍 健康检查: http://localhost:8000/health"
echo ""
uvicorn app.main:app --reload --port 8000
