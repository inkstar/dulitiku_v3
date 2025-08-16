#!/bin/bash

echo "正在重启服务器..."

# 停止现有进程
echo "停止现有进程..."
pkill -f "node index.js"
pkill -f "react-scripts"
sleep 2

# 启动后端服务器
echo "启动后端服务器..."
cd server
node index.js &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动前端服务器
echo "启动前端服务器..."
cd client
npm start &
FRONTEND_PID=$!
cd ..

echo "服务器重启完成！"
echo "后端PID: $BACKEND_PID"
echo "前端PID: $FRONTEND_PID"
echo "前端地址: http://localhost:3000"
echo "后端地址: http://localhost:3001"

# 保持脚本运行
wait
