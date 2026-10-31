# Changelog

本文件记录 TaskHarbor 各版本变更。（对外品牌名：**小湾清单 Cove**；内部技术标识仍沿用 `TaskHarbor`。）**版本号按语义化版本（SemVer）+ Conventional Commits 前缀维护**：`feat` 升 minor，`fix` 升 patch，`docs/test` 不升版但仍重新构建。

## [1.14.1] - 2026-11-01

### Fixed — 移动端首装必现的两类问题（真机反馈）

- **P0 初始化失败 `CreateConnection: Connection taskharbor already exists`**
  - 根因：`store.init()` 先调 `initRepository()` 再调 `createEngine()`，而 `createEngine()` 内部又调了一次 `initRepository()`；配对/解绑同样会再次 `createEngine()`。原生插件以库名为键维护连接池，同名重复 `createConnection` 直接抛错 → 首屏报红、本地数据读不出来。
  - 修复：① `driver-capacitor` 增加模块级连接单例，并在打开前先 `isConnection` 探测、命中则 `retrieveConnection`（双重保险）；② `runtime.initRepository()` 改为记忆化 Promise，webview 生命周期内只建一次 Repository；③ `store.init()` 失败时丢弃缓存自动重试一次。
  - 附带：初始化失败卡片新增「重试 / 重置本地缓存」两个按钮，无需卸载重装即可自愈（重置只清本机副本，不触碰电脑端数据）。
- **系统栏压住界面（顶部标题被状态栏遮住、底部 Tab 被三键导航遮住）**
  - 根因：Android Chrome 的 `env(safe-area-inset-*)` 只对「刘海/挖孔」返回非零值，**不返回系统状态栏/导航栏高度**，纯 CSS 兜不住；且 targetSdk 36 在 Android 15+ 被强制 edge-to-edge。
  - 修复：启动改为 `StatusBar.setOverlaysWebView({ overlay: false })`（WebView 不再绘制到状态栏下方）；新增 `values-v35/styles.xml` 设置 `android:windowOptOutEdgeToEdgeEnforcement=true`，让系统导航栏不透明、内容布局在两栏之间。

### Changed

- 版本 1.14.0 → **1.14.1**（fix/patch）；移动端 versionName `0.1.0` → `0.1.1`、versionCode `1` → `2`。

## [1.14.0] - 2026-10-31

### Added — 移动端（Android / 小米机型）与双端同步（设计文档 M1–M3 首轮落地）

- **共享内核 `core/`（新增，三端共用）**
  - `core/schema/schema.sql`：DDL 单一真源（10 张业务表 + 4 张同步元表 + 索引）；`core/schema/migrations/001_sync_enable.sql` 为存量库补齐软删除列与元表；`core/schema/version.json` 声明 schema 版本与同步表清单。
  - `core/src/domain`、`core/src/repository`（`SqlRepository`：复合游标 / 幂等 upsert / 软删除 / Outbox / 冲突表）、`core/src/sync`（cursor / conflict / engine）、`core/src/transport`（base + `LanTransport`）—— 纯 TypeScript，OS 无关，可单测。
  - 方言约束落地：禁用 CTE / RETURNING / 带冲突目标 UPSERT，upsert 一律「先 UPDATE，0 行再 INSERT」并包事务（`@capacitor-community/sqlite` 在 Android 侧按括号截断 SQL 的已知缺陷）。
- **移动端 App（Capacitor 8 + 复用 renderer，appId `com.taskharbor.mobile`）**
  - 双 build target：`renderer/mobile/index.html` + `vite.mobile.config.ts` → `mobile-dist/`，由 Capacitor 同步进 `android/`。
  - 页面：底部四 Tab（今日 / 任务 / 日程 / 我的）+ 悬浮创建 + 底部半屏表单 + 全屏详情式列表。
  - 「我的」：同步面板（连接状态 / 上次同步 / 待同步数 / 立即同步 / 冲突列表）、配对电脑（地址 + 6 位配对码）、小米 HyperOS 保活自检清单（省电策略 / 自启动 / 多任务加锁 / 通知）、关于与设备 ID。
  - 同步状态常驻标题栏（绿=已同步 / 蓝=同步中 / 橙=离线含待同步数 / 灰=未配对），失败给出可执行修复建议（AP 隔离、升级版本等）。
  - 本地通知提醒（24h 内日程，按 reminder 提前，上限 30 条）；自动同步触发（回前台 / WiFi 恢复 / 启动）。
- **桌面端同步中枢 Hub（`main/src/services/syncServer.ts`）**
  - 独立端口 `18766`（不改造既有 Agent API `18765`）；**默认关闭**，仅用户在「同步与设备」页主动开启时监听；只绑定所选私有网卡地址，不绑 `0.0.0.0`。
  - 端点：`GET /api/sync/meta`、`POST /api/sync/pair`、`POST /api/sync/push`、`GET /api/sync/pull`、`POST /api/sync/verify`；Bearer token 鉴权，PIN 10 分钟有效、错误 3 次自动重生成。
  - 所有落库 `updatedAt` 由 Hub 时钟生成（ADR-03，消除双端时钟漂移）；写入后 `saveDatabase()` 落盘。
  - 新增「同步与设备」页面（侧边栏入口）：网卡地址下拉、开启/停止、二维码 + 配对码展示、已配对设备、安全与排障说明。
  - IPC：`sync:start` / `sync:stop` / `sync:status` / `sync:rotatePin` / `sync:candidates`；preload 对应暴露 `startSync` / `stopSync` / `getSyncStatus` / `rotateSyncPin` / `getSyncCandidates`。

### Changed
- 桌面端现有 service / store 逻辑**未改动**（规避「内核抽取引入桌面端回归」风险），Hub 直接复用主进程既有 DB 实例；DDL 与同步语义由 `core/` 统一。
- `renderer/tsconfig.app.json` 纳入 `core/src` 与 `core/schema/version.json`；Tailwind content 增加移动端入口。

### Notes
- 版本号 1.13.0 → 1.14.0（minor，`feat`）。移动端首版 0.1.0，schema v1。
- **已知偏差（已登记）**：Android `network-security-config` 的 `<domain>` 不支持 CIDR 网段，无法精确放行私有网段；为保证局域网同步可用，`base-config` 放行明文，暴露面改由「Hub 默认关闭 + 仅绑局域网 IP + token 鉴权」收敛，阶段二切换 HTTPS 后改回 `false`。
- **未完成项（后续里程碑）**：二维码扫码（当前为手动输入地址 + 配对码，桌面端已可显示二维码）、token 存入 Keystore（当前用 `@capacitor/preferences`）、JSON 导入导出兜底（FR-12）、一致性校验 UI（FR-11）、真机 30 分钟保活与千条列表帧率验证。

## [1.13.0] - 2026-10-31

### Changed
- **数据复盘结构调整**：将「日程统计」从「统计概览」Tab 底部区块提升为「数据复盘」下与「统计概览」并列的独立 Tab（导航新增「日程统计」入口）。
  - 「统计概览」Tab 不再内嵌日程统计卡片；「日程统计」Tab 独立承载今日 / 本周 / 总日程 / 已过期 / 已完成 五张统计卡 + 可展开的清单面板。
  - 完成态（v1.12.0 的「已完成」统计卡）随结构一并迁入新 Tab，统计逻辑与响应式不变。

### Notes
- 版本号 1.12.0 → 1.13.0（minor，`feat`）。

## [1.12.0] - 2026-10-31

### Added
- **数据复盘「日程统计」完成态同步**：在「日程概览」清单 / 日视图勾选日程完成后，「数据复盘 → 日程统计」段的「已完成」统计卡实时同步计数。
  - `StatsView` 的日程分桶新增 `completed` 桶（基于 `schedule.completed === true`），新增「已完成」统计卡（绿色，可点击展开已完成清单）。
  - 展开清单的 `ScheduleRow` 对已完成日程加删除线 + 降透明度 + 「已完成」徽标，与日程概览视觉一致。
  - 响应式由共享 `useScheduleStore` 保证：日程概览的勾选通过 `updateSchedule` 乐观更新内存 `schedules`，数据复盘页订阅同一 store 自动重算分桶，无需手动刷新。

### Notes
- 依赖 v1.11.0 已落地的 `completed` 数据模型；本版本仅前端统计视图增强。版本号 1.11.0 → 1.12.0（minor，`feat`）。

## [1.11.0] - 2026-10-31

### Added
- **日程「完成标记」**：每条日程新增勾选框，点击即标记完成 / 取消完成（乐观更新，立即生效）。
  - **日视图 / 清单视图**：`ScheduleItem` 卡片左侧新增圆形勾选按钮；勾选后标题置删除线、卡片整体降透明度（70%），并保留编辑 / 删除入口。
  - **月历视图**：已完成日程的色块同步加删除线 + 降透明度，一眼区分。
  - **新建 / 编辑弹窗**：新增「标记完成」勾选项，可在创建或编辑时直接设定完成态。
  - **数据模型**：`schedules` 表新增 `completed INTEGER DEFAULT 0` 字段（新库建表即带；旧库通过 `ALTER TABLE` 在线迁移补齐）。`Schedule` 类型（主进程 `scheduleService` + 渲染进程 `types`）同步增加 `completed?`。
  - **全链路打通**：`scheduleService.createSchedule` 写入、`getScheduleById` / `getSchedules` / `getSchedulesByDate` 读取映射、`updateSchedule` 部分更新均已支持；HTTP API（`POST/PUT /api/schedules`）与 IPC（`schedules:create` / `schedules:update`）透传 `completed`，MCP 亦可写。

### Notes
- 数据模型 + 全链路功能增强；版本号 1.10.0 → 1.11.0（minor，`feat`）。

## [1.10.0] - 2026-10-30

### Added
- **「日程概览」新增「清单」视图**：在月视图 / 日视图切换旁新增「清单」按钮，按日期分组、开始时间排序，把所有日程排成一个可滚动清单，**一屏预览全部日程**（此前月历每天只显示前 2 条、超出折叠为 `+N 更多`，没有跨天总览入口）。
  - 复用现有 `ScheduleItem` 卡片（时间 / 优先级 / 地点 / 描述 / 编辑 / 删除），每个日期分组带吸顶标题（日期 + 星期 + 当日数量）。
  - 搜索框在清单视图同样生效（按标题 / 描述 / 地点过滤）。

### Notes
- 纯前端视图增强，无数据模型 / IPC 变更；版本号 1.9.4 → 1.10.0（minor，`feat`）。

## [1.9.4] - 2026-10-29

### Fixed
- **进度校验触发器从未真正创建过**：`validate_task_progress` 写成 `BEFORE INSERT OR UPDATE ON tasks` —— SQLite 不支持该语法（只支持 `BEFORE INSERT ON` / `BEFORE UPDATE ON`），抛出的语法错误又被 `catch` 统一打印成 "Trigger validate_task_progress already exists"，问题被掩盖至今，全新库和老库都没有这条校验。
  - 拆成 `validate_task_progress_insert`（BEFORE INSERT）与 `validate_task_progress_update`（BEFORE UPDATE）两条，进度 0–100 校验真正生效。
  - 触发器创建统一走 `createTrigger()`，失败时**打印真实错误原因**（不再一律谎报"已存在"），避免同类问题再次被吞。

### Notes
- 纯健壮性修复；版本号 1.9.3 → 1.9.4（patch）。

## [1.9.3] - 2026-10-29

### Fixed（P0 · 阻断级）
- **修复全新电脑安装后首次启动必然崩溃**：`database.ts` 建表时 `agent_messages` 用的是下划线列名 `conversation_id`，但紧随其后的索引却写成驼峰 `CREATE INDEX idx_agent_messages_conv ON agent_messages(conversationId)`。
  - **全新库**：表按 `conversation_id` 创建 → 索引语句抛 `no such column: conversationId` → `setupDatabase()` 中断 → `[App] Failed to initialize app`，**窗口打不开、API 起不来**。
  - **老库不受影响**：历史遗留的 `agent_messages` 表里那列恰好就叫 `conversationId`，索引能建成功，所以从 v1.9.2 往前的版本在已有机子上一直正常，只有新装机才暴露。
  - 复现方式：以全新用户数据目录启动（模拟新电脑）`小湾清单.exe --user-data-dir=<空目录>`，日志必现上述报错。
- 修复方案：
  1. 启动时读取 `PRAGMA table_info(agent_messages)` 判断实际列名；历史库若只有 `conversationId`，先 `ALTER TABLE ... RENAME COLUMN conversationId TO conversation_id`（不支持时退化为 `ADD COLUMN`），再按真实列名建索引。
  2. `agent_conversations` 的 `updated_at` 同样按实际列名（历史库可能是 `updatedAt`）建索引，缺失则跳过。
  3. **所有索引创建改走 `safeIndex()`**：索引只影响查询性能，任何一条 DDL 失败只告警跳过，不再让整个应用初始化失败（防御同类笔误复发）。
  4. 其余 `db.run` 仍全部是 `CREATE TABLE IF NOT EXISTS` 或已包 try/catch，无同类风险点。

### Notes
- 纯兼容性与健壮性修复，无数据模型变更；版本号 1.9.2 → 1.9.3（patch）。建议所有新装机用户直接使用 1.9.3 及以上。

## [1.9.2] - 2026-10-29

### Changed
- **项目卡片改为「宽度随项目名自适应 + 指标横向排列」**：1.9.1 把卡片固定加高到 340px 后，短名项目下方留白明显、长名项目又被 `truncate` 截断，阅读体验两头不讨好。本次按反馈改为：
  - **宽度自适应**：容器从等宽网格（`grid-cols-*`，卡片被强制同等宽度）改为 `flex flex-wrap`；卡片用 `w-fit min-w-[320px] max-w-full`，宽度取「项目名单行宽度」——名短卡片窄、名长卡片宽，最长占满整行后换行显示，**项目名不再截断**。
  - **指标横向排列**：项目名下方原本纵向堆叠的三块（任务数 / 平均进度 / 状态分布）改为一行排布，进度条与状态分布条之间用竖分隔线隔开，卡片高度从 340px 降到约 190px 起。
  - **状态明细改胶囊**：五种状态从「五列纵向明细行」改为可换行的横向胶囊（`色点 + 状态名 + 数量 + 占比`），卡片变宽时自动排成一行，变窄时自动折行，高度随之自适应。
  - 未归类说明文字由 `col-span-full`（网格属性，在 flex 下失效）改为 `w-full`。

### Notes
- 纯 UI/展示层调整，无数据模型与 IPC 改动；版本号 1.9.1 → 1.9.2（patch）。

## [1.9.1] - 2026-10-29

### Changed
- **项目卡片加高约一倍，并补齐信息密度**：原卡片内容只有「任务数 + 平均进度 + 状态标签」，高度约 170px，卡片下方留白明显。现按反馈把高度调整到约 2 倍（`min-h-[340px]`），并用真实内容填满：
  - 任务总数字号放大（`text-4xl`），平均进度条加粗到 `h-2`。
  - 新增**状态占比堆叠条**：一整条按待处理 / 进行中 / 等待确认 / 已完成 / 已暂停的比例着色，一眼看出项目推进程度。
  - 新增**五种状态明细行**：每行色点 + 状态名 + 迷你占比条 + `数量 · 占比`，零计数状态也保留占位，卡片高度稳定不跳动。
  - 底部新增常驻「进入排期看板 →」引导（hover 变主题色），明确卡片可点击下钻。
  - 卡片间距 `gap-4` → `gap-5`，配合加高后的视觉重量。

### Notes
- 纯 UI/展示层调整，无数据模型与 IPC 改动；版本号 1.9.0 → 1.9.1（patch）。

## [1.9.0] - 2026-10-29

### Added
- **Agent 更新类技能正式纳入安装包**：此前 `taskharbor_update_task` / `taskharbor_update_schedule` 两个工具以及支撑它们的 HTTP API `PUT` 部分更新逻辑一直停留在工作区未提交，按「构建前 stash 遗留改动」的红线约定，每次打包都被排除，**安装版 MCP 实际只有 6 个工具**。本次将其正式提交，7/8 号工具真正随安装包分发（`resources/mcp-server/server.mjs`）。
  - `tools/mcp-server/server.mjs`：新增 `taskharbor_update_task` / `taskharbor_update_schedule`，任务/日程字段（含 `actualEndDate`、状态枚举 `todo / in-progress / review / done / blocked`）与部分更新语义（只改传入字段）。
  - `main/src/server/apiServer.ts`：`PUT /api/tasks/:id` 与 `PUT /api/schedules/:id` 增加空 body 400、不存在 404 校验，并返回更新后的完整对象（原先只返回 `{ updated: boolean }`）。
  - `AgentHub`：补充两个 curl「修改任务 / 修改日程」示例，工具列表补上 update 两项。

### Added（机制）
- **Agent 工具清单改为单一数据源，后续新增接口自动同步**：原先 `AgentHub.tsx` 里硬编码了一份 `TOOLS` 常量，与 MCP server 内的定义两处维护，新增工具时极易漏改界面。
  - `server.mjs` 新增 CLI 模式 `node server.mjs --list-tools`，输出 `{ serverInfo, tools: [{ name, description, required, properties }] }`。
  - 新增 `main/src/ipc-handlers/agent-handlers.ts` 与 IPC `agent:listTools`：优先 `spawnSync('node', [serverPath, '--list-tools'])` 读取权威清单；无 Node.js 时退化为正则解析 server 源码提取工具名；再失败才用内置兜底清单（页面会明确提示当前为默认清单）。
  - preload 暴露 `getAgentTools`；「Agent 接入」页工具区改为实时渲染（工具数、描述、**必填参数**、数据来源标注 + 手动刷新按钮）。
  - 规则固化：**以后新增 Agent 技能只需改 `server.mjs`**（需要新端点时同步 `apiServer.ts`），界面无需改动即可显示。

### Fixed
- **修复 HTTP API / MCP 写入不落盘**：`saveDatabase()` 原本只在 IPC 路径与少数 service 中调用，`apiServer.ts` 的所有写操作（增/改/删任务与日程）成功后都不落盘，App 强杀或崩溃时经 API/MCP 写入的数据会全部丢失（v1.7.1 记录的已知缺陷）。现统一收口：新增 `flush()` 辅助函数，6 处写分支（`POST /api/schedules`、`PUT`/`DELETE /api/schedules/:id`、`POST /api/tasks`、`PUT`/`DELETE /api/tasks/:id`）成功后调用。

### Notes
- 本次含 `feat`（新工具纳入分发 + 动态清单机制）与 `fix`（写入落盘），升 minor：1.8.0 → 1.9.0。
- 界面实时清单依赖本机 Node.js（MCP 配置本身也要求 `command: "node"`）；未安装 Node.js 时页面会降级显示内置默认清单并提示，不影响 MCP 配置复制与 curl 示例使用。

## [1.8.0] - 2026-10-29

### Added
- **计划看板改为「项目 → 排期」两级结构**：原先 `/board` 直接铺开所有任务的五列看板，项目一多就混在一起；现在进入计划看板先看到项目，再下钻到具体项目的排期。
  - **项目列表页（`/board`，`BoardView` 重写）**：以卡片网格列出所有项目（**分类即项目**，复用 `tags` 表，无需数据迁移）。每张卡片显示项目名称 + 颜色标识、任务总数、平均进度条、各状态（待处理/进行中/等待确认/已完成/已暂停）计数；支持按项目名搜索、按任务数排序、右上角「新建项目」直接建分类。
  - **项目排期看板（`/board/:projectId`，新增 `ProjectBoardView`）**：只展示该项目下的任务，保留原有的五列状态看板与跨列拖拽改状态；顶部有返回按钮、项目色点与项目名，并显示该项目任务总数。
  - **未归类入口**：没有任何分类关联的任务集中在虚线「未归类」卡片中（仅在存在未归类任务时出现），进入后可查看并在任务编辑里选择分类归入项目，避免任务被隐藏。
  - **项目内新建自动归属**：在项目排期看板点「新建任务」时，任务自动带上当前项目（`TaskEditDialog` 新增 `defaultTagIds`），不需要再手工勾选。

### Changed
- `App.tsx` 新增 `/board/:projectId` 路由；`Layout.tsx` 侧边栏高亮逻辑支持子路径（进入项目看板时「计划看板」仍高亮）。
- 主进程 `tagService` 新增 `getBoardSummary()`（一次查询汇总各项目的任务数 / 状态分布 / 平均进度，以及未归类统计）与 `getAllRelations()`；新增 IPC `tags:getBoardSummary`、`tags:getRelations`，preload 暴露 `getBoardSummary` / `getTaskTagRelations`。

### Notes
- 本次为 `feat`，升 minor：1.7.1 → 1.8.0。
- **无数据库结构变更**：项目维度沿用 `tags` + `task_tag_relations`，与 v1.7.1 统一的分类体系完全一致，升级安装不影响既有数据。

## [1.7.1] - 2026-10-29

### Fixed
- **修复「任务里填了分类，侧边栏分类目录却看不到」（两套分类体系断裂）**：
  - 根因：UI 存在两套互不相通的「分类」——任务编辑框的「分类」文本框写入的是 `tasks.module` 游离文本字段，而侧边栏「分类」目录读的是 `tags` 表 + `task_tag_relations` 关联表，两者无任何同步逻辑。历史成因是旧版 `projects` 表迁移为 `tags` 后，`module` 字段成为无人认领的孤儿字段。
  - 修复：`TaskEditDialog` 保存时把「分类」文本框的值**自动转换为标签**——已存在同名标签则复用，否则新建，并与当前任务建立关联，使其出现在分类目录中。
  - 存量数据：新增一次性启动迁移，把 `tasks.module` 的去重值补建为标签并批量关联（`INSERT OR IGNORE`，可重复执行、幂等）。实测将 21 个任务的 `TaskHarbor 移动端（Cove 手机版）` 正确补建为 1 个分类并关联 21 条。
- **修复「新建任务时勾选的标签不会保存」**：`TaskEditDialog` 的标签保存逻辑被 `if (task?.id)` 守卫，新建场景下 `task.id` 尚不存在，整个关联写入被跳过。现改为把 `tagIds` 随任务数据一并提交，由主进程 `taskService.createTask` / `updateTask` 统一写入 `task_tag_relations`（新建与编辑走同一条路径）。
  - 主进程 `CreateTaskInput` 新增 `tagIds?: string[]`；`updateTask` 仅在**显式传入** `tagIds` 数组时才覆盖关联，未传表示不改动分类，避免误清空既有分类。
  - service 层 CRUD 默认不落盘，创建/更新含标签时显式调用 `saveDatabase()`，避免分类关联在强杀时丢失。

### Notes
- 本次为 `fix`，升 patch：1.7.0 → 1.7.1。
- 存量分类补建在**应用启动时自动执行**（与既有 `projects → tags` 迁移并列），用户重启应用即生效，无需手动操作或外部脚本。

## [1.7.0] - 2026-10-28

### Added
- **新增「计划看板」页面（`BoardView`）**：在侧边导航「数据复盘」与「Agent 接入」之间新增「计划看板」入口（路由 `/board`），提供看板化的任务管理视图。
  - **五列状态看板**：待处理 / 进行中 / 等待确认 / 已完成 / 已暂停，直接映射任务 `status` 字段，与现有 `tasks` 表数据双向联动（无需数据库迁移）。
  - **拖拽改状态**：卡片支持跨列拖拽（HTML5 Drag & Drop），拖入目标列即调用 `updateTaskStatus` 落库；拖拽中目标列高亮、卡片半透明。
  - **卡片信息**：标题、描述摘要、优先级徽标（高/中/低）、标签、负责人、截止日期（逾期标红）。
  - **卡片操作**：悬浮显示编辑 / 删除按钮，编辑复用 `TaskEditDialog`，删除带确认。
  - **顶部工具条**：搜索过滤（标题/描述/标签）、每列任务计数、新建任务入口、列内空态提示。
  - **旧路由兼容**：原 `/kanban` 路由重定向到 `/board`。

### Changed
- `App.tsx` 注册 `/board` 路由并引入 `BoardView`；`Layout.tsx` 新增「计划看板」导航项（图标 `KanbanSquare`）。

### Notes
- 本功能复用现有 `tasks` 表与 `taskStore`，**无数据库结构变更**，升级安装不影响既有数据。
- 按 SemVer，`feat` 升 minor：1.6.2 → 1.7.0。

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
