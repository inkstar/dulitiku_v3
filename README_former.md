# 数学题库系统

一个专为独立数学老师设计的题库管理系统，支持题目录入、标签管理、智能组卷和人工组卷功能。

## 功能特性

### 🎯 核心功能
- **题目管理**: 支持Markdown和LaTeX的题目录入，包含题目内容、答案、解析
- **LaTeX智能识别**: 自动解析LaTeX文档，提取题目、答案、解析和知识点
- **数学公式**: 完整的LaTeX数学公式支持，完美展示数学符号和公式
- **标签系统**: 多维度标签管理（年级、知识点、类型、难度等）
- **智能组卷**: 根据条件自动生成试卷
- **人工组卷**: 手动选择题目组成试卷
- **试卷管理**: 查看、编辑、删除已创建的试卷

### 📊 数据统计
- 题目总数统计
- 试卷数量统计
- 使用频率跟踪
- 创建时间记录

### 🎨 用户界面
- 现代化响应式设计
- 直观的操作界面
- 实时搜索和筛选
- 拖拽排序功能

## 技术栈

### 后端
- **Node.js** + **Express**: 服务器框架
- **SQLite**: 轻量级数据库
- **TypeScript**: 类型安全

### 前端
- **React** + **TypeScript**: 用户界面
- **Tailwind CSS**: 样式框架
- **React Router**: 路由管理
- **React Markdown**: Markdown渲染
- **KaTeX**: LaTeX数学公式渲染
- **Axios**: HTTP 客户端
- **Lucide React**: 图标库

## 快速开始

### 环境要求
- Node.js 16+ 
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd math-question-bank
```

2. **安装依赖**
```bash
# 安装根目录依赖
npm install

# 安装所有子项目依赖
npm run install-all
```

3. **启动开发服务器**
```bash
# 同时启动前端和后端
npm run dev

# 或者分别启动
npm run server  # 后端服务器 (端口 3001)
npm run client  # 前端应用 (端口 3000)
```

4. **访问应用**
打开浏览器访问 `http://localhost:3000`

## 使用指南

### 1. 题目录入

#### 方式一：手动输入
1. 点击"新增题目"进入题目录入页面
2. 选择"手动输入"方式
3. 填写题目基本信息（标题、年级、类型、难度等）
4. 使用Markdown编辑器编写题目内容、答案和解析
5. 选择相关标签
6. 点击保存

#### 方式二：LaTeX智能识别
1. 点击"新增题目"进入题目录入页面
2. 选择"LaTeX智能识别"方式
3. 粘贴LaTeX文档内容（包含题目、答案、解析、知识点部分）
4. 点击"开始解析"，系统自动提取内容
5. 确认解析结果，内容自动填充到表单
6. 补充其他必填信息（年级、类型、难度等）
7. 选择相关标签
8. 点击保存

### 2. 智能组卷
1. 点击"智能组卷"进入组卷页面
2. 设置试卷信息（标题、描述）
3. 选择组卷条件（年级、知识点、题目数量等）
4. 点击"智能组卷"生成试卷
5. 预览并保存试卷

### 3. 人工组卷
1. 点击"人工组卷"进入手动组卷页面
2. 填写试卷信息
3. 从左侧题目列表中选择需要的题目
4. 在右侧查看已选题目
5. 调整题目顺序后保存

### 4. 试卷管理
1. 在"试卷管理"页面查看所有试卷
2. 点击"查看详情"查看完整试卷
3. 可以显示/隐藏答案
4. 支持打印功能

## 数据库结构

### 主要数据表
- `questions`: 题目表
- `tags`: 标签表
- `question_tags`: 题目标签关联表
- `papers`: 试卷表
- `paper_questions`: 试卷题目关联表

### 默认标签
系统预置了常用的标签：
- **年级**: 七年级、八年级、九年级、高一、高二、高三
- **类型**: 选择题、填空题、解答题、证明题
- **知识点**: 代数、几何、函数、统计、概率

## 部署说明

### 生产环境部署
1. **构建前端**
```bash
cd client
npm run build
```

2. **配置后端**
```bash
cd server
npm install --production
```

3. **启动服务**
```bash
npm start
```

### 环境变量
- `PORT`: 服务器端口（默认 3001）
- `NODE_ENV`: 环境模式（development/production）

## 开发说明

### 项目结构
```
math-question-bank/
├── client/                 # 前端 React 应用
│   ├── public/
│   ├── src/
│   │   ├── components/     # 通用组件
│   │   ├── pages/         # 页面组件
│   │   └── ...
│   └── package.json
├── server/                # 后端 Node.js 应用
│   ├── index.js          # 服务器入口
│   └── package.json
├── database.sqlite       # SQLite 数据库文件
└── package.json
```

### API 接口

#### 题目相关
- `GET /api/questions` - 获取题目列表
- `POST /api/questions` - 创建新题目
- `PUT /api/questions/:id` - 更新题目
- `DELETE /api/questions/:id` - 删除题目

#### 试卷相关
- `GET /api/papers` - 获取试卷列表
- `GET /api/papers/:id` - 获取试卷详情
- `POST /api/papers/smart` - 智能组卷
- `POST /api/papers/manual` - 人工组卷

#### 标签相关
- `GET /api/tags` - 获取标签列表

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件

---

**注意**: 这是一个专为个人使用设计的系统，建议在本地环境运行，确保数据安全。
