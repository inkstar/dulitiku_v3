# 数学题库管理系统

一个专为独立数学老师设计的题库管理系统，支持题目录入、标签管理、智能组卷和人工组卷等功能。

## 功能特性

### 🎯 核心功能
- **题目管理**: 友好的题目录入界面，支持多种题型
- **标签系统**: 年级、知识点、类型、难度等多维度标签
- **智能组卷**: 根据条件自动生成试卷
- **人工组卷**: 手动选择题目创建试卷
- **使用统计**: 记录题目使用次数

### 📊 题目标签
- **年级**: 七年级、八年级、九年级、高一、高二、高三
- **知识点**: 代数、几何、函数、统计、概率
- **题型**: 选择题、填空题、解答题、证明题
- **难度**: 简单、中等、困难

## 技术栈

- **前端**: React + TypeScript + Tailwind CSS
- **后端**: Node.js + Express + SQLite
- **状态管理**: Zustand
- **UI组件**: Lucide React Icons

## 快速开始

### 1. 安装依赖

```bash
# 安装所有依赖
npm run install-all
```

### 2. 启动开发服务器

```bash
# 同时启动前端和后端
npm run dev
```

或者分别启动：

```bash
# 启动后端服务器 (端口 3001)
npm run server

# 启动前端开发服务器 (端口 3000)
npm run client
```

### 3. 访问应用

打开浏览器访问: http://localhost:3000

## 项目结构

```
dulitiku_v3/
├── server/                 # 后端服务器
│   ├── index.js           # 主服务器文件
│   └── package.json       # 后端依赖
├── client/                # 前端应用
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── services/      # API服务
│   │   ├── store/         # 状态管理
│   │   ├── types/         # TypeScript类型
│   │   └── App.tsx        # 主应用组件
│   └── package.json       # 前端依赖
└── package.json           # 根项目配置
```

## 使用指南

### 添加题目
1. 点击侧边栏"添加题目"
2. 填写题目信息（标题、内容、答案、解析）
3. 选择年级、知识点、题型、难度
4. 点击"保存题目"

### 管理题库
1. 点击侧边栏"题库管理"
2. 使用搜索和过滤功能查找题目
3. 勾选题目进行批量操作

### 创建试卷
1. 点击侧边栏"试卷管理"
2. 选择"创建试卷"或"智能组卷"
3. 填写试卷信息并选择题目
4. 生成试卷

## 数据库

系统使用SQLite数据库，数据文件位于 `server/database.sqlite`。

### 主要数据表
- `questions`: 题目表
- `papers`: 试卷表
- `paper_questions`: 试卷题目关联表

## 开发说明

### 添加新功能
1. 在 `client/src/components/` 创建新组件
2. 在 `client/src/types/` 定义相关类型
3. 在 `server/index.js` 添加API接口
4. 更新路由配置

### 样式定制
- 使用 Tailwind CSS 类名
- 自定义样式在 `client/src/index.css`
- 主题配置在 `client/tailwind.config.js`

## 部署

### 生产环境构建（同一进程托管前后端）

1) 一键构建
```bash
npm run build:prod
```
- 安装所有依赖并构建前端（输出到 `client/build`）

2) 启动服务
```bash
npm start
```
- 监听端口：`3001`
- 访问前端：`http://<服务器IP或域名>:3001/`
- API 路径：同源 `/api/...`

3) 自定义 API 基址（可选）
- 前端可设置环境变量 `REACT_APP_API_BASE_URL`，否则默认同源 `/api`

### Docker（可选）

后续可提供 `Dockerfile` 与 `docker-compose.yml`，实现一键容器化部署。

## 版本与更新

### v1.1.0 (2025-08-17 00:28:55)
- 试卷标题默认规则与编号：
  - 后端增加 `teacher`、`serial_no` 字段；创建试卷时按教师与当日计算序号
  - 当未填写标题时自动生成 `{教师名}{YYYYMMDD}数学试卷 #序号`
  - 仅成功创建计入当日序号；失败不占用编号
  - 前端人工/智能组卷创建时传入 `teacher`（当前默认“独立老师”）

## 许可证

MIT License

## 支持

如有问题或建议，请提交 Issue 或联系开发者。
