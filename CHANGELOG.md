# Changelog

本文件记录 TaskHarbor 各版本变更。**版本号按语义化版本（SemVer）+ Conventional Commits 前缀维护**：`feat` 升 minor，`fix` 升 patch，`docs/test` 不升版但仍重新构建。

## [1.5.3] - 2026-10-27

### Fixed
- **Agent 接入面板永远显示「未连接」（根因：CSP 拦截）**：生产模式 CSP 的 `connect-src` 此前锁死为 `'self'`，渲染端 `fetch('http://127.0.0.1:18765/api/health')` 属跨源请求被 CSP 静默拦截，导致面板即使 API 实际在运行也显示未连接。现放行本机回环 `http://127.0.0.1:* http://localhost:*`（开发/生产均生效），端口可随面板配置调整。

## [1.5.2] - 2026-10-27

### Fixed
- **安装目录路径稳定自动获取**：Agent 接入面板的 MCP 配置路径改由 `get-app-info` IPC 直接读取主进程安装目录（`process.resourcesPath` 下的 `resources/mcp-server/server.mjs`），不再仅依赖 HTTP `/api/health` 轮询。即使本地 API 尚未就绪，面板也能正确显示真实安装路径，消除「`<TaskHarbor安装目录>` 占位符残留」问题。

## [1.5.1] - 2026-10-27

### Fixed
- **安装包内置 MCP server**：将 `tools/mcp-server` 纳入 `extraResources`，安装后 `server.mjs` 随包落到 `resources/mcp-server/server.mjs`，不再需要从源码仓库单独获取。
- **面板路径自动指向安装目录**：`/api/health` 新增返回 `mcpServerPath`（打包后指向安装目录 `resources/mcp-server/server.mjs`，开发时指向源码）；Agent 接入面板的 MCP 配置 JSON 与说明文字据此动态生成，移除原先硬编码的「源码目录占位符」。

## [1.5.0] - 2026-10-27

### Added
- **Agent 接入面板（UI）**：新增独立页面 `/agent`（侧边栏「Agent 接入」入口），让用户在应用内即可查看并配置外部 Agent 对接，无需翻文档。包含：
  - **连接状态**：自动检测本机 HTTP API（`127.0.0.1:18765` 健康检查），实时显示在线/离线、应用版本、运行时长；端口可手动调整，每 15s 轮询。
  - **本地 API 信息**：展示 API 地址（可复制）及全部端点说明。
  - **MCP 配置**：一键复制 WorkBuddy / Claude 等客户端的 MCP 配置 JSON（端口与面板联动），列出 6 个可用 MCP 工具及 `server.mjs` 路径说明。
  - **快速指令**：curl 创建日程 / 任务的示例（可复制）。

### 已知限制（1.5.0 测试期，MCP 打包已于 1.5.1 修复）
- ~~MCP server 随源码仓库分发、便携版需从源码获取~~ → 已于 **1.5.1** 通过 `extraResources` 内置到安装包。
- 连接状态依赖本机 HTTP API；若 TaskHarbor 未启动或端口不符则显示「未连接」。

## [1.4.0] - 2026-10-27

### Added
- **任务写入通道（HTTP API + MCP）**：在 1.3.0 日程通道之外，新增对「任务(task)」的外部写入能力，供 Agent / WorkBuddy 直接落任务到 TaskHarbor。
  - `POST   /api/tasks`（`description` 必填；支持 `module` / `functionModule` / `status` / `assignee` / `startDate` / `estimatedEndDate` / `progress` / `issues` / `notes`）
  - `GET    /api/tasks`（支持 `status` / `assignee` / `search` 过滤）
  - `GET    /api/tasks/:id`
  - `PUT    /api/tasks/:id`
  - `DELETE /api/tasks/:id`
  - MCP 工具 `taskharbor_add_task` / `taskharbor_list_tasks` / `taskharbor_delete_task`
- 主进程在 `setupDatabase()` 之后显式 `await taskService.init()`，确保 HTTP API 任务端点运行前数据库连接就绪。

### 已知限制（1.4.0 测试期）
- 任务列表过滤暂不支持 `priority`（tasks 表无该列，taskService 既有 priority 过滤为无效路径，本期刻意不暴露）。
- HTTP API 仅监听本机回环 `127.0.0.1`，不暴露到局域网。

## [1.3.0] - 2026-10-27

### Added
- **本地 HTTP API（外部对接通道）**：主进程新增 `127.0.0.1:18765` 本地 API，复用 `scheduleService`，对外暴露日程增删查改，供 WorkBuddy / MCP / 脚本 / curl 写入日程。
  - `GET  /api/health`
  - `POST /api/schedules`
  - `GET  /api/schedules`（支持 `date` / `start`+`end` / `priority` / `search` 过滤）
  - `GET  /api/schedules/:id`
  - `PUT  /api/schedules/:id`
  - `DELETE /api/schedules/:id`
  - 可选 Bearer Token 鉴权（`TASKHARBOR_API_TOKEN`）、可配置端口（`TASKHARBOR_API_PORT`）、端口占用优雅降级。
- **WorkBuddy MCP Server**：`tools/mcp-server/server.mjs` 提供 `taskharbor_add_schedule` / `taskharbor_list_schedules` / `taskharbor_delete_schedule` 三个工具，底层调用上述 HTTP API，并在 `~/.workbuddy/mcp.json` 注册 `taskharbor` server。

### Changed
- **数据库持久化加固**（`main/src/services/database.ts`）：写盘改为「先写 `.tmp` 再 `rename`」的原子写，写入成功同步更新 `.bak`；主库加载失败/为空/过小时自动从 `.bak` 恢复；防抖保存延迟由 1000ms 缩短为 200ms，降低创建后立刻关闭的丢数据概率。
- **退出保护**：`window-all-closed` 与 `before-quit` / `will-quit` 增加强制刷盘，避免安装新版本覆盖旧进程导致数据丢失。

### 已知限制（1.3.0 测试期）
- HTTP API 仅监听本机回环 `127.0.0.1`，不暴露到局域网。
- 未做多实例协同：同时运行多个 TaskHarbor 实例会各自持有独立内存态，可能互相覆盖写入；测试/使用时应单实例运行。

## [1.2.1] - 2026-10-26

- 发布版本（详见 git 历史 `a92ac20 docs: 发布 v1.2.1 版本`）。
