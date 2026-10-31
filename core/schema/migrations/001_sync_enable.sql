-- 迁移 001：为存量库开启同步能力（ADR-08 软删除补齐 + 4 张同步元表）
-- 执行约定：按分号逐条执行，单条失败（列已存在等）静默跳过，不中断整体迁移。
-- 本文件由桌面端 main/src/services/database.ts 与移动端 CapacitorDriver 共用。

ALTER TABLE tags ADD COLUMN deletedAt TEXT;
ALTER TABLE tags ADD COLUMN originDeviceId TEXT;

ALTER TABLE tasks ADD COLUMN deletedAt TEXT;
ALTER TABLE tasks ADD COLUMN originDeviceId TEXT;
ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'medium';

ALTER TABLE task_tag_relations ADD COLUMN deletedAt TEXT;
ALTER TABLE task_tag_relations ADD COLUMN originDeviceId TEXT;

ALTER TABLE subtasks ADD COLUMN deletedAt TEXT;
ALTER TABLE subtasks ADD COLUMN originDeviceId TEXT;
ALTER TABLE subtasks ADD COLUMN updatedAt TEXT;

ALTER TABLE timelogs ADD COLUMN deletedAt TEXT;
ALTER TABLE timelogs ADD COLUMN originDeviceId TEXT;
ALTER TABLE timelogs ADD COLUMN updatedAt TEXT;

ALTER TABLE task_dependencies ADD COLUMN deletedAt TEXT;
ALTER TABLE task_dependencies ADD COLUMN originDeviceId TEXT;

ALTER TABLE schedules ADD COLUMN deletedAt TEXT;
ALTER TABLE schedules ADD COLUMN originDeviceId TEXT;

ALTER TABLE task_reminders ADD COLUMN deletedAt TEXT;
ALTER TABLE task_reminders ADD COLUMN originDeviceId TEXT;

CREATE TABLE IF NOT EXISTS _sync_state (
  tableName   TEXT PRIMARY KEY,
  cursorTs    TEXT,
  cursorId    TEXT,
  updatedAt   TEXT
);

CREATE TABLE IF NOT EXISTS _outbox (
  id          TEXT PRIMARY KEY,
  tableName   TEXT NOT NULL,
  op          TEXT NOT NULL CHECK(op IN ('upsert', 'delete')),
  recordId    TEXT NOT NULL,
  payload     TEXT,
  state       TEXT NOT NULL DEFAULT 'pending'
              CHECK(state IN ('pending', 'sending', 'failed', 'done')),
  retryCount  INTEGER DEFAULT 0,
  lastError   TEXT,
  nextRetryAt TEXT,
  createdAt   TEXT DEFAULT (datetime('now')),
  updatedAt   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS _sync_conflicts (
  id              TEXT PRIMARY KEY,
  tableName       TEXT NOT NULL,
  recordId        TEXT NOT NULL,
  localPayload    TEXT,
  remotePayload   TEXT,
  localUpdatedAt  TEXT,
  remoteUpdatedAt TEXT,
  kind            TEXT DEFAULT 'lww',
  resolved        INTEGER DEFAULT 0,
  createdAt       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS _sync_meta (
  key       TEXT PRIMARY KEY,
  value     TEXT,
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_updatedAt     ON tasks(updatedAt);
CREATE INDEX IF NOT EXISTS idx_schedules_updatedAt ON schedules(updatedAt);
CREATE INDEX IF NOT EXISTS idx_outbox_state        ON _outbox(state);
CREATE INDEX IF NOT EXISTS idx_conflicts_resolved  ON _sync_conflicts(resolved);
