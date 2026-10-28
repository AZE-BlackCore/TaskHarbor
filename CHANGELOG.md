# Changelog

本文件记录 TaskHarbor 各版本变更。（对外品牌名：**小湾清单 Cove**；内部技术标识仍沿用 `TaskHarbor`。）**版本号按语义化版本（SemVer）+ Conventional Commits 前缀维护**：`feat` 升 minor，`fix` 升 patch，`docs/test` 不升版但仍重新构建。

## [1.6.2] - 2026-10-28

### Fixed
- **修复安装版托盘图标丢失导致的初始化异常（品牌更名回归）**：图标由 `build/` 迁移至 `renderer/public/` 后，`getIconPath()` 在打包态仍只查找 `resources/build/icon.ico`，找不到图标时执行 `new Tray('')` 抛出 `Failed to load image from path ''`，使托盘创建失败并中断主初始化流程（窗口可显示，但托盘图标/菜单异常，日志出现 `[App] Failed to initialize app`）。
  - `getIconPath()` 打包态新增 `resources/renderer/public/icon.ico` 与 `resources/renderer/dist/icon.ico` 查找路径（extraResources 已将 `renderer/public` 复制到 `resources/renderer/public`）。
  - `createTray()` 增加 `try/catch` 与「无图标则跳过托盘」的安全兜底，托盘初始化失败不再阻断主流程。
- **新增主进程文件日志**：打包态无控制台，现将主进程日志落盘到 `%APPDATA%\taskharbor\logs\main.log`（含 `uncaughtException` / `unhandledRejection` 捕获），便于用户在遇到启动故障时提供日志定位。

### Changed (文档 / 仓库)
- **GitCode 仓库地址迁移为 Cove**：新地址 <https://gitcode.com/AZE-BlackCore/Cove>（README 底部链接同步更新；`package.json` 新增 `repository` / `homepage` / `bugs` 字段指向新地址）。
- **版本记录归口调整**：详细版本变更统一维护在 `CHANGELOG.md`，README 的「版本历史」精简为各版本一句话总览表（避免两处维护产生漂移）。
- **README 补充安装说明**：新增「安装与默认路径」小节，说明默认安装目录 `%LOCALAPPDATA%\Programs\taskharbor`、用户数据目录 `%APPDATA%\taskharbor`、安装目录名为 `taskharbor` 的成因（中文产品名回退 npm 包名，符合双轨制且规避中文路径风险），以及装完无响应 / 白屏 / 恢复默认路径的排查速查表。

## [1.6.1] - 2026-10-28

### Changed
- **品牌更名（双轨制）**：对外宣传名由 `TaskHarbor` 更改为「**小湾清单（Cove）**」。
  - 对外门面（README 标题/简介、应用窗口标题、托盘提示、安装包 `productName`、关于对话框）统一使用「小湾清单 / Cove」。
  - 内部技术标识保持不变：npm 包名 `taskharbor`、应用 `appId` `com.taskharbor.desktop`、环境变量 `TASKHARBOR_API_PORT` / `TASKHARBOR_API_TOKEN`、MCP server id `taskharbor` 及全部 `taskharbor_*` 工具名、HTTP API 端口 `18765`。现有用户已配置的 `mcp.json` **无需改动**。
  - 本次为纯品牌/文档变更，无功能变化，按补丁版本发布。

### Changed (视觉)
- **视觉 Logo 更新（方案 A · 小船停湾）**：中心图标由「清单」替换为「小湾水面 + 停泊小船 + 金色对勾帆」意象，同时呈现「小湾」字面、任务停靠与清单完成感；沿用蓝紫渐变底色（`#3B82F6→#8B5CF6`）与右上角金色星记忆点。更新文件：`renderer/public/app-logo.svg`、`renderer/public/icon.svg`。
- 打包安装版图标锁定：安装包 `renderer/public/icon.ico`（256/128/64/48/32/16 多尺寸，新 Logo 小船停湾）已用本地 ImageMagick（librsvg）由 `renderer/public/icon.svg` 栅格化生成，并**纳入 git 版本控制**（`renderer/public` 为 electron-builder 分发资产目录，确保 clone / CI 打包也使用新 Logo）。`package.json` 的 `build.win.icon` 与 `nsis` 的 `installerIcon` / `uninstallerIcon` / `installerHeaderIcon` 已显式锁定指向该文件（应用 exe、安装程序、卸载程序、安装向导头四处图标统一为小船停湾）。`tools/build-icon.ps1` 支持探测本地 `tools/imagemagick`（含 PATH / 环境变量 `IMAGEMAGICK_PATH` / 向上查找），可重复执行重新生成。

## [1.6.0] - 2026-10-27

### Added
- **最近待办显示日程信息**：按日期统一分组展示「日程 + 任务」。
  - 每日分组内新增日程卡片（颜色条 / 时间或全天 / 地点 / 优先级），任务与日程共用同一日期轴（任务的创建日 ∪ 日程的开始日）。
  - 日期头计数改为「N 任务 · M 日程」。
  - 任务卡片上展示其**关联日程**（`relatedTaskId` 匹配）的标题与时间，便于直接在待办列表看到排期。
  - 日程随「今天 / 本周 / 本月」时间范围与关键词搜索一同过滤。
- **Agent 可修改任务与日程（MCP 新增 update 工具）**：此前 Agent 只能增 / 查 / 删，无法修改；本次补齐「改」能力。
  - 新增 MCP 工具 `taskharbor_update_task`：按 `id` 修改状态、进度、责任人、描述、模块、起止日期、问题、备注等，**部分更新**（未传字段保持原值）。
  - 新增 MCP 工具 `taskharbor_update_schedule`：按 `id` 修改标题、起止时间、地点、优先级、提醒、重复规则、关联任务等，同为部分更新。
  - 两个工具在未传 `id`、未传任何待改字段、`id` 不存在时均返回明确错误，不静默成功。
  - `PUT /api/tasks/:id` 现返回**更新后的完整任务对象**（原仅返回 `{updated:true}`），便于 Agent 回显；`id` 不存在返回 404，无可改字段返回 400（原为 500）。
  - `PUT /api/schedules/:id` 增加 `id` 存在性校验（不存在返回 404）与空 body 400 校验。
  - Agent 接入面板：工具列表补充两个 update 工具，curl 示例新增「修改任务 / 修改日程」。
- **日程统计可展开明细清单**：原先「今日日程 / 本周日程 / 总日程 / 已过期」只有数字，看不到具体是哪些日程。
  - 四张统计卡改为可点击，点击后在下方展开对应分类清单（再次点击或「收起」关闭），选中卡片高亮。
  - 清单每项展示：颜色条、标题、优先级标签、开始—结束时间（跨天自动带日期）、全天标识、地点、是否已关联任务。
  - 已过期项标红「已过期」徽标；「已过期」按时间倒序（最近过期在前），今日 / 本周按开始时间正序。
  - 计数与清单由同一份数据派生（`useMemo`），保证「卡片数字 = 清单条数」始终一致；空分类显示空态提示。

### Fixed
- **MCP 任务状态取值错误**：`add_task` / `list_tasks` 的 schema 原写 `in_progress`（下划线），而实际枚举为 `in-progress`（连字符），Agent 照文档写入会产生非法状态导致界面筛选失配。现改为枚举约束 `todo / in-progress / review / done / blocked`。

### Changed
- **打包产物统一收敛到 `builds/`**：此前 electron-builder 输出目录直接落在仓库根目录（`dist-output`、`dist-output-130` … `dist-output-160n` 共 20 个，约 7 GB），根目录极难浏览。
  - `build.directories.output` 改为 `builds/dist-output`，`build:win` / `build:win:nsis` / `build:win:portable` 后续产物不再写入仓库根目录。
  - 历史产物全部迁入 `builds/dist-output-<版本标识>/`，其中 1.1.2 / 1.2.1 时期产物归档为 `builds/dist-output-121/`。
  - `.gitignore` 增加 `builds/`（保留原有 `dist-output*` 规则以防漏网）。
  - `simple-pack.ps1` 改用 `$PSScriptRoot` 定位项目根并指向新路径（原硬编码路径已失效）；`tools/smoke-test-api.mjs` 默认可执行文件路径同步更新。
  - 新增 `tools/cleanup-legacy-build-dirs.ps1`：校验 `builds/` 下归档完整后，清理根目录遗留的空壳目录（默认 dry-run，`-Execute` 执行）。

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
