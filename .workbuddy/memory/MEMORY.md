# TodoListDesktop 长期记忆

## 项目概况
- Electron + React + TypeScript + SQLite(sql.js) + Zustand + Tailwind 桌面 Todo 应用
- 开发模式：`npm run dev`（同时启动 Vite 5173 + Electron）
- 打包命令：`npx electron-builder --win --dir --publish=never --config.directories.output=dist-build`（注意：`release` 目录可能被 Windows Defender 锁定，改用 `dist-build` 输出）

## 架构关键点
- **preload**：打包后必须放在 `extraResources` 里（asar 外），路径 `resources/preload/dist/index.js`
- **sql.js wasm**：必须 `asarUnpack`，否则 Node.js 无法读取 wasm 文件
- **Zustand store**：使用 Immer 中间件，taskStore + projectStore + errorStore
- **乐观更新回滚**：不能调用带 IPC 的 delete 方法，应直接操作 state（内联 rollback 函数）
- **临时 ID**：乐观更新用 `temp_${Date.now()}` 格式，删除时判断 `id.startsWith('temp_')` 直接本地删除

## 已完成的优化 Phase
- Phase 1：数据库层优化（防抖保存、事务、触发器、外键约束 PRAGMA foreign_keys=ON）
- Phase 2：状态管理优化（Immer、乐观更新、errorStore、Toast）
- Phase 3：服务层重构（TaskService、ProjectService，IPC handler 代码量 -60%）
- Phase 4：UX 优化（骨架屏、虚拟滚动）
- Phase 5：性能优化（索引、缓存 cacheService）

## 常见陷阱
- 不要在 Electron 项目中使用 React `StrictMode`（会导致 input 焦点问题）
- `release` 目录会被 Windows Defender 实时保护锁定，打包时改输出目录
- react-window 2.x API 变化，`FixedSizeList` 改名为 `List`；或直接用原生 IntersectionObserver 虚拟滚动
- dayjs `isBetween` 需要单独 `extend` 插件
- Zustand Immer 中间件下 `Object.assign` 直接修改 draft 对象来替换临时 ID

## 下一步计划
- 嘉立创 EDA 深度集成（Run API Gateway 插件，WebSocket 实时操控）
- Agent 能力集成（智能任务助手，混合模式 Ollama + DeepSeek）
