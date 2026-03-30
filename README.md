# Todo List Desktop

桌面端 Todo List 任务管理软件 - 基于 Electron + React

## 功能特性

### 核心功能
- ✅ 项目化任务管理（个人项目/公司项目）
- ✅ 完整任务字段：模块、功能模块、任务描述、进度、状态、责任人、时间管理等
- ✅ 悬浮窗口支持（可拖拽、透明度调节、点击穿透）
- ✅ 列表视图（完整功能）
- 🚧 甘特图视图（开发中）
- 🚧 看板视图（开发中）
- 🚧 日历视图（开发中）
- 🚧 统计报表（开发中）

### 高级功能
- 🚧 子任务分解
- 🚧 任务依赖关系
- 🚧 时间追踪
- 🚧 标签系统
- 🚧 导出功能（Excel/PDF/Markdown）
- 🚧 任务提醒

## 技术栈

- **桌面框架**: Electron 28+
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **样式方案**: Tailwind CSS 3.4
- **状态管理**: Zustand
- **数据库**: sql.js (SQLite 纯 JS 实现)
- **路由**: React Router DOM 6

## 快速开始

### 安装依赖

```bash
cd TodoListDesktop

# 安装所有依赖
npm install

# 安装 renderer 依赖
cd renderer && npm install
```

### 开发模式

```bash
# 根目录运行
npm run dev
```

这将同时启动：
- Vite 开发服务器（http://localhost:5173）
- Electron 应用

### 构建应用

```bash
npm run electron:build
```

构建产物在 `release/` 目录。

## 项目结构

```
TodoListDesktop/
├── main/                    # Electron 主进程
│   ├── src/
│   │   ├── index.ts         # 主进程入口
│   │   ├── services/        # 数据库等服务
│   │   └── ipc-handlers/    # IPC 处理器
│   └── tsconfig.json
├── preload/                 # Preload 脚本
│   ├── src/
│   │   └── index.ts         # IPC 桥接
│   └── tsconfig.json
├── renderer/                # React 渲染进程
│   ├── src/
│   │   ├── components/      # React 组件
│   │   ├── views/           # 视图组件
│   │   ├── stores/          # Zustand stores
│   │   ├── types/           # TypeScript 类型
│   │   └── utils/           # 工具函数
│   └── package.json
├── package.json
└── tsconfig.electron.json
```

## 数据库 Schema

### projects 表
- id, name, type (personal/company), description, color

### tasks 表
- id, projectId, moduleId, module, functionModule
- description, progress, status, assignee
- startDate, estimatedEndDate, actualEndDate
- issues, notes

### 其他表
- subtasks - 子任务
- timelogs - 时间日志
- task_dependencies - 任务依赖
- task_tags - 任务标签

## 开发状态

- ✅ 项目初始化
- ✅ 数据库设计
- ✅ 主进程和 IPC
- ✅ 列表视图
- 🚧 其他视图开发中...

## 许可证

MIT
