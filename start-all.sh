#!/bin/bash

echo "🚀 启动面试大冒险完整服务..."

# 获取项目根目录
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 启动后端
echo "📦 启动后端服务..."
osascript -e 'tell application "Terminal" to do script "cd \"'"$ROOT_DIR"'/server\" && chmod +x start.sh && ./start.sh"'

# 等待后端启动
sleep 3

# 启动前端
echo "🎨 启动前端服务..."
osascript -e 'tell application "Terminal" to do script "cd \"'"$ROOT_DIR"'/client\" && pnpm dev"'

echo ""
echo "✅ 服务启动完成！"
echo ""
echo "📍 前端地址: http://localhost:5173"
echo "📍 后端地址: http://localhost:8000"
echo "📍 API文档: http://localhost:8000/docs"
echo ""
