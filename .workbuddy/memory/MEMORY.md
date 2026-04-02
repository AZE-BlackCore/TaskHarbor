# Todo List Desktop 项目记忆

## 项目信息

**项目名称**: Todo List Desktop  
**技术栈**: Electron 28 + React 18 + TypeScript + Vite 5  
**开发模式**: 使用 concurrently 同时启动 Vite 和 Electron  
**数据库**: sql.js（纯 JavaScript 实现的 SQLite）

## 项目结构

```
e:\AZE-BlackCore\TodoListDesktop\
├── main/           # Electron 主进程
├── preload/        # Preload 脚本
├── renderer/       # React 渲染进程
└── package.json    # 根项目配置
```

## 启动命令

```bash
cd e:\AZE-BlackCore\TodoListDesktop

# 开发模式（同时启动 Vite 和 Electron）
npm run dev

# 仅 Vite 开发服务器
cd renderer && npm run dev

# 编译主进程
cd main && npx tsc

# 编译 preload
cd preload && npx tsc

# 打包应用
npm run electron:build
```

## 数据库位置

数据库文件存储在 Electron userData 目录：
- Windows: `%APPDATA%\todolist.db`

## 技术决策

1. **使用 sql.js 而非 better-sqlite3**: 避免原生模块编译问题
2. **使用 Zustand 状态管理**: 轻量简洁，适合桌面应用
3. **Tailwind CSS 3.4**: 原子化 CSS，支持深色模式
4. **TypeScript 严格模式**: 确保类型安全

## 核心功能

### 已实现（✅）
- 列表视图（完整 CRUD）
- 甘特图视图（时间轴、缩放控制）
- 看板视图（状态列、任务卡片）
- 日历视图（月/周/日、任务标记）
- **日程管理**（2026-04-01 新增：月/日视图、优先级筛选、搜索、颜色标记）
- 统计报表（饼图、柱状图、燃尽图）
- 项目管理（个人/公司）
- 悬浮窗口（透明度、点击穿透）
- 深色/浅色主题切换
- 侧边栏导航

### 待开发（🚧）
- 任务编辑对话框优化
- 导出功能（Excel/PDF/Markdown）
- 任务提醒通知
- 子任务管理 UI
- 时间追踪 UI

## 注意事项

1. 数据库路径必须在 app.whenReady() 后初始化
2. Preload 脚本使用 ESNext 模块系统
3. 主进程使用 CommonJS 模块系统
4. 所有 IPC 调用必须返回 Promise
