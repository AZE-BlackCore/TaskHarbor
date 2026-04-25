# TaskHarbor 项目记忆

> 更新于 2026-04-22：从 TodoListDesktop 更名为 TaskHarbor，并完成 AI Agent 集成

## 项目信息

**项目名称**: TaskHarbor  
**项目路径**: `e:\AZE-BlackCore\TaskHarbor\`  
**分支**: `feature/agent-integration`  
**技术栈**: Electron 28 + React 18 + TypeScript + Vite 5  
**开发模式**: 使用 concurrently 同时启动 Vite 和 Electron  
**数据库**: sql.js（纯 JavaScript 实现的 SQLite）

## 启动命令

```bash
cd e:\AZE-BlackCore\TaskHarbor

# 开发模式（同时启动 Vite 和 Electron）
npm run dev

# 仅 Vite 开发服务器
cd renderer && npm run dev

# 编译主进程
cd main && npx tsc

# 编译 preload
cd preload && npx tsc

# 类型检查（不编译）
cd main && npx tsc --noEmit
cd renderer && npx tsc --noEmit

# 打包应用
npm run electron:build
```

## 数据库位置

数据库文件存储在 Electron userData 目录：
- Windows: `%APPDATA%\taskharbor.db`

## AI Agent 集成（2026-04-22 完成）

### 架构
- **主进程**: `main/src/agent/` - LLM Provider + AgentEngine + ToolRegistry + 工具集
- **IPC**: `main/src/ipc-handlers/agent-handlers.ts` - 流式对话 IPC
- **Preload**: `preload/src/index.ts` - 暴露 13 个 agentXxx API
- **渲染进程**: `renderer/src/stores/agentStore.ts` + `hooks/useAgent.ts` + `components/agent/`

### 支持的 LLM Provider
- DeepSeek（API Key 必填）
- 通义千问（API Key 必填）
- Ollama（本地，baseUrl 默认 localhost:11434）
- CoPaw（本地或远程，baseUrl 默认 localhost:3456）

### UI 入口
- 左侧导航底部「AI 助手」按钮 → 打开右侧 380px 侧边栏
- 设置面板 → AI 设置 Tab（配置 Provider/API Key/模型/行为）

### 关键 IPC 通道
- `agent:chat` - 流式对话（主进程 SSE 到渲染进程）
- `agent:stream` - 流式 chunk 推送事件
- `agent:confirmToolCall` - 确认/拒绝写操作工具调用
- `agent:cancel` - 取消当前对话

## 视图结构

### project/ 子视图
```
renderer/src/views/project/
├── ProjectMain.tsx         # 主容器（Tab 导航）
├── ProjectList.tsx         # 项目列表
├── ProjectListView.tsx     # 任务列表视图
├── ProjectGanttView.tsx    # 甘特图视图
├── ProjectKanbanView.tsx   # 看板视图
└── ProjectCalendarView.tsx # 日历视图
```

### schedule/ 子视图
```
renderer/src/views/schedule/
├── ScheduleCalendar.tsx
├── ScheduleKanban.tsx
└── ScheduleStats.tsx
```

## 注意事项

1. 数据库路径必须在 `app.whenReady()` 后初始化
2. Preload 脚本使用 ESNext 模块系统
3. 主进程使用 CommonJS 模块系统
4. 所有 IPC 调用必须返回 Promise
5. LLM API 调用全在主进程（不走渲染进程的 fetch，无 CSP 限制问题）
6. Agent 工具写操作（create/update/delete）设置 `requireConfirmation: true`，会触发 ToolConfirmation UI

## 代码审查规范

**🔴 阻塞性**：安全性、数据完整性、关键路径错误处理  
**🟡 建议性**：可维护性、类型安全、React 最佳实践  
**💭 优化**：风格、文档、测试

```bash
npm run typecheck:all  # 类型检查
npm run lint           # Lint 检查
npm run ci             # 完整 CI
```


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

## 视图结构（2026-04-13 重构）

### project/ 子视图文件夹
```
renderer/src/views/project/
├── index.ts               # 统一导出
├── ProjectMain.tsx        # 主容器（Tab 导航）
├── ProjectList.tsx        # 项目列表组件
├── ProjectListView.tsx    # 任务列表视图
├── ProjectGanttView.tsx   # 甘特图视图
├── ProjectKanbanView.tsx  # 看板视图
└── ProjectCalendarView.tsx # 日历视图
```

### schedule/ 子视图文件夹
```
renderer/src/views/schedule/
├── ScheduleCalendar.tsx    # 日历视图
├── ScheduleKanban.tsx     # 看板视图
└── ScheduleStats.tsx      # 统计视图
```

## 核心功能

### 已实现（✅）
- **项目管理（主入口，含 5 个子视图 Tab）**（2026-04-13 重构）
  - 项目列表（卡片式，点击切换项目）
  - 任务列表（完整 CRUD）
  - 甘特图（时间轴、缩放控制）
  - 看板（状态列、任务卡片、拖拽）
  - 日历（月/周/日、任务标记）
- **日程管理**（2026-04-01 新增：日历/看板/统计三个子视图）
- 悬浮窗口（透明度、点击穿透）
- 深色/浅色主题切换
- 侧边栏导航（仅「项目管理」和「日程管理」两个入口）

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

## 代码审查规范（2026-04-09 新增）

### 审查文档

1. **[审查标准与流程](./docs/CODE_REVIEW_STANDARDS.md)** - 完整的审查标准和流程
2. **[审查检查清单](./docs/CODE_REVIEW_CHECKLIST.md)** - 可打印的审查清单
3. **[审查模板](./docs/CODE_REVIEW_TEMPLATES.md)** - PR 模板、评论模板等
4. **[快速入门](./docs/CODE_REVIEW_QUICKSTART.md)** - 5 分钟快速上手

### 审查重点

**🔴 阻塞性问题（必须修复）：**
- 安全性问题（SQL 注入、XSS、Electron 安全配置）
- 数据完整性问题
- 关键路径错误处理缺失
- 破坏性变更

**🟡 建议性问题（应该修复）：**
- 代码可维护性（命名、函数长度、职责单一）
- 类型安全（无 any 滥用）
- React 最佳实践
- 性能优化

**💭 优化建议（可选）：**
- 代码风格统一
- 文档完善
- 测试覆盖

### 自动化检查

```bash
# 类型检查
npm run typecheck:all

# Lint 检查
npm run lint

# 代码格式化
npm run format

# 完整 CI 检查
npm run ci
```

### 审查流程

1. 开发者提交 PR（使用 PR 模板）
2. CI 自动检查（类型/Lint/测试/构建）
3. 审查者审查（24 小时内完成）
4. 开发者修改反馈
5. 审查通过后合并

### 工具配置

- **ESLint** - 严格模式，禁止 any 滥用
- **Prettier** - 统一代码格式
- **GitHub Actions** - CI 自动检查
- **审查清单** - 标准化审查流程
