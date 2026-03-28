# ⚡ 快速启动指南

## 5分钟启动项目

### 第一步：安装依赖（3分钟）

打开终端，执行：

```bash
# 进入后端目录
cd server

# 运行安装脚本
chmod +x install.sh
./install.sh

# 进入前端目录
cd ../client

# 安装前端依赖
pnpm install
```

### 第二步：配置API密钥（1分钟）

编辑 `server/.env` 文件，确认你的火山引擎API密钥：

```bash
ARK_API_KEY=bffb2d2d-1663-4982-b422-dc076168642e
ARK_MODEL=doubao-1-5-pro-32k-250115
```

### 第三步：启动服务（1分钟）

打开两个终端窗口：

**终端1 - 启动后端：**
```bash
cd server
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**终端2 - 启动前端：**
```bash
cd client
pnpm dev
```

### 第四步：开始使用

打开浏览器访问：

- 🌐 **前端应用**: http://localhost:5173
- 📚 **API文档**: http://localhost:8000/docs

---

## 一键启动（macOS）

```bash
./start-all.sh
```

---

## 验证安装

### 检查后端

```bash
curl http://localhost:8000/health
```

应该返回：
```json
{"status": "ok", "version": "1.0.0"}
```

### 检查前端

访问 http://localhost:5173 应该看到像素风格的首页。

---

## 常见问题

### Q: 后端启动失败？

```bash
# 检查依赖是否安装
cd server
source venv/bin/activate
python -c "import fastapi; print('OK')"

# 如果失败，重新安装
./install.sh
```

### Q: 前端启动失败？

```bash
# 重新安装依赖
cd client
rm -rf node_modules
pnpm install
```

### Q: API调用失败？

检查 `.env` 文件中的 `ARK_API_KEY` 是否正确。

---

## 测试流程

1. 访问 http://localhost:5173
2. 点击"开始冒险"
3. 填写问卷
4. 开始AI面试
5. 与面试官对话

---

**遇到问题？** 查看 [DELIVERY.md](DELIVERY.md) 获取详细文档。
