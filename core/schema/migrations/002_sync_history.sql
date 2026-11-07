-- 迁移 002：桌面 Hub 侧「同步历史」审计表
-- 定位：仅桌面端（syncServer.ts 的 applySyncSchemaMigration）执行，用于「同步与设备」页展示历史。
--   * 不参与同步（不在 SYNC_TABLES 内）、不进 version.json 的 metaTables 契约；
--   * 移动端不执行本迁移（platform/schema.ts 只加载 001），因此无需随本改动重构建 APK。
-- 脱敏红线：breakdown / detail 只允许写表名、记录 ID、操作类型、条数、设备名与 IP，
--   严禁写入任务标题或正文（见 syncServer.ts 顶部设计约束）。
-- 执行约定：按分号逐条执行，单条失败（表/索引已存在等）静默跳过，不中断整体迁移。

CREATE TABLE IF NOT EXISTS sync_history (
  id          TEXT PRIMARY KEY,
  sessionId   TEXT NOT NULL,
  occurredAt  TEXT NOT NULL,
  direction   TEXT NOT NULL CHECK(direction IN ('up', 'down', 'pair')),
  operation   TEXT NOT NULL CHECK(operation IN ('push', 'pull', 'pair')),
  source      TEXT,
  deviceName  TEXT,
  tableName   TEXT,
  itemCount   INTEGER DEFAULT 0,
  breakdown   TEXT,
  status      TEXT NOT NULL DEFAULT 'ok' CHECK(status IN ('ok', 'partial', 'error')),
  detail      TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_history_time    ON sync_history(occurredAt);
CREATE INDEX IF NOT EXISTS idx_sync_history_session ON sync_history(sessionId);
