#!/bin/bash

echo "==================================="
echo "  面试大冒险 - 环境安装脚本"
echo "==================================="
echo ""

cd "$(dirname "$0")"

# 检查Python版本
echo "🔍 检查Python版本..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "   Python版本: $PYTHON_VERSION"

# 创建虚拟环境
if [ ! -d "venv" ]; then
    echo ""
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ 创建虚拟环境失败"
        exit 1
    fi
    echo "✅ 虚拟环境创建成功"
fi

# 激活虚拟环境
echo ""
echo "🔄 激活虚拟环境..."
source venv/bin/activate
if [ $? -ne 0 ]; then
    echo "❌ 激活虚拟环境失败"
    exit 1
fi

# 安装依赖
echo ""
echo "📥 安装Python依赖（使用清华镜像加速）..."
echo ""

# 核心依赖
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple \
    fastapi \
    uvicorn[standard] \
    pydantic \
    pydantic-settings \
    sqlalchemy \
    aiosqlite \
    python-dotenv \
    python-multipart \
    httpx

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo ""
echo "🔥 安装火山引擎SDK..."
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple volcengine-python-sdk 2>/dev/null || \
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple volcengine 2>/dev/null || \
echo "⚠️  火山引擎SDK安装失败，请手动安装"

echo ""
echo "==================================="
echo "  ✅ 安装完成！"
echo "==================================="
echo ""
echo "下一步操作："
echo ""
echo "1. 配置环境变量:"
echo "   编辑 server/.env 文件，填写你的火山引擎API密钥"
echo ""
echo "2. 启动后端服务:"
echo "   cd server"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload --port 8000"
echo ""
echo "3. 启动前端服务:"
echo "   cd client"
echo "   pnpm dev"
echo ""
echo "4. 访问应用:"
echo "   前端: http://localhost:5173"
echo "   API文档: http://localhost:8000/docs"
echo ""
