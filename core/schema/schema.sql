-- =============================================================================
-- TaskHarbor / 小湾清单（Cove） 数据库 Schema 单一真源
-- -----------------------------------------------------------------------------
-- 本文件是 DDL 的唯一真源（ADR-01 / ADR-08 / 红线：禁止双写）。
-- 桌面端（Electron + sql.js）、移动端（Capacitor + 原生 SQLite）都必须由本文件建库。
--
-- 方言约束（见设计文档 4.8）：
--   1. 禁止 CTE（WITH）与 RETURNING —— 社区 SQLite 插件在 Android 侧会错误截断
--   2. 禁止带冲突目标的 UPSERT（ON CONFLICT）—— 一律拆成「先 UPDATE，0 行再 INSERT」
--   3. 所有写操作需在事务中执行
--
-- 升级存量库请见 migrations/ 目录下的增量脚本（按文件名顺序执行）。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 一、业务表（10 张）
-- 参与同步的表额外带：deletedAt（软删除，ADR-08）、originDeviceId（变更来源设备）
-- agent_conversations / agent_messages 为端本地数据，不参与同步（不进 SYNC_TABLES）
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tags (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  color         TEXT DEFAULT '#3B82F6',
  createdAt     TEXT DEFAULT (datetime('now')),
  updatedAt     TEXT DEFAULT (datetime('now')),
  deletedAt     TEXT,
  originDeviceId TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  id              TEXT PRIMARY KEY,
  moduleId        TEXT,
  module          TEXT,
  functionModule  TEXT,
  description     TEXT NOT NULL,
  progress        INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
  status          TEXT DEFAULT 'todo',
  priority        TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
  assignee        TEXT,
  startDate       TEXT,
  estimatedEndDate TEXT,
  actualEndDate   TEXT,
  issues          TEXT,
  notes           TEXT,
  createdAt       TEXT DEFAULT (datetime('now')),
  updatedAt       TEXT DEFAULT (datetime('now')),
  deletedAt       TEXT,
  originDeviceId  TEXT
);

CREATE TABLE IF NOT EXISTS task_tag_relations (
  id        TEXT PRIMARY KEY,
  taskId    TEXT NOT NULL,
  tagId     TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  deletedAt TEXT,
  originDeviceId TEXT,
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tagId)  REFERENCES tags(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subtasks (
  id          TEXT PRIMARY KEY,
  taskId      TEXT NOT NULL,
  description TEXT NOT NULL,
  completed   INTEGER DEFAULT 0,
  orderIndex  INTEGER DEFAULT 0,
  createdAt   TEXT DEFAULT (datetime('now')),
  updatedAt   TEXT DEFAULT (datetime('now')),
  deletedAt   TEXT,
  originDeviceId TEXT,
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS timelogs (
  id              TEXT PRIMARY KEY,
  taskId          TEXT NOT NULL,
  startTime       TEXT NOT NULL,
  endTime         TEXT,
  durationSeconds INTEGER DEFAULT 0,
  description     TEXT,
  createdAt       TEXT DEFAULT (datetime('now')),
  updatedAt       TEXT DEFAULT (datetime('now')),
  deletedAt       TEXT,
  originDeviceId  TEXT,
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_dependencies (
  id                TEXT PRIMARY KEY,
  taskId            TEXT NOT NULL,
  dependencyTaskId  TEXT NOT NULL,
  type              TEXT DEFAULT 'finish-to-start',
  createdAt         TEXT DEFAULT (datetime('now')),
  deletedAt         TEXT,
  originDeviceId    TEXT,
  FOREIGN KEY (taskId)           REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (dependencyTaskId) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schedules (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT,
  location       TEXT,
  startTime      TEXT NOT NULL,
  endTime        TEXT NOT NULL,
  allDay         INTEGER DEFAULT 0,
  color          TEXT DEFAULT '#3B82F6',
  priority       TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
  reminder       INTEGER,
  repeatType     TEXT CHECK(repeatType IN ('daily', 'weekly', 'monthly', 'yearly')),
  repeatInterval INTEGER DEFAULT 1,
  repeatEndDate  TEXT,
  relatedTaskId  TEXT,
  completed      INTEGER DEFAULT 0,
  createdAt      TEXT DEFAULT (datetime('now')),
  updatedAt      TEXT DEFAULT (datetime('now')),
  deletedAt      TEXT,
  originDeviceId TEXT,
  FOREIGN KEY (relatedTaskId) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS task_reminders (
  id            TEXT PRIMARY KEY,
  taskId        TEXT NOT NULL,
  reminderTime  TEXT NOT NULL,
  cycle         TEXT NOT NULL DEFAULT 'once'
                CHECK(cycle IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
  intervalDays  INTEGER DEFAULT 0,
  intervalHours INTEGER DEFAULT 0,
  customTimes   TEXT,
  lastFiredAt   TEXT,
  nextFireAt    TEXT,
  enabled       INTEGER NOT NULL DEFAULT 1,
  createdAt     TEXT DEFAULT (datetime('now')),
  updatedAt     TEXT DEFAULT (datetime('now')),
  deletedAt     TEXT,
  originDeviceId TEXT,
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_conversations (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL DEFAULT '新对话',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  provider   TEXT,
  model      TEXT
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role            TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant', 'tool')),
  content         TEXT NOT NULL,
  toolCalls       TEXT,
  toolCallId      TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- 二、同步元表（4 张）
-- -----------------------------------------------------------------------------

-- 每张同步表的增量拉取游标（复合游标：cursorTs + cursorId，见设计文档 4.3）
CREATE TABLE IF NOT EXISTS _sync_state (
  tableName   TEXT PRIMARY KEY,
  cursorTs    TEXT,
  cursorId    TEXT,
  updatedAt   TEXT
);

-- 本地写操作的持久化待发队列（FR-09）
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

-- 被 LWW 覆盖掉的版本留档（ADR-05，红线：不得静默丢数据）
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

-- 键值元数据：schema 版本 / 设备 ID / Hub 配对信息 / 最后同步时间
CREATE TABLE IF NOT EXISTS _sync_meta (
  key       TEXT PRIMARY KEY,
  value     TEXT,
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------------------
-- 三、索引
-- 注意：索引是纯性能优化，任何一条失败都不得拖垮初始化（两端执行器需 catch）
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_tasks_status        ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee      ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_startDate     ON tasks(startDate);
CREATE INDEX IF NOT EXISTS idx_tasks_updatedAt     ON tasks(updatedAt);
CREATE INDEX IF NOT EXISTS idx_subtasks_task       ON subtasks(taskId);
CREATE INDEX IF NOT EXISTS idx_timelogs_task       ON timelogs(taskId);
CREATE INDEX IF NOT EXISTS idx_dependencies_task   ON task_dependencies(taskId);
CREATE INDEX IF NOT EXISTS idx_task_tag_rel_task   ON task_tag_relations(taskId);
CREATE INDEX IF NOT EXISTS idx_task_tag_rel_tag    ON task_tag_relations(tagId);
CREATE INDEX IF NOT EXISTS idx_schedules_startTime ON schedules(startTime);
CREATE INDEX IF NOT EXISTS idx_schedules_endTime   ON schedules(endTime);
CREATE INDEX IF NOT EXISTS idx_schedules_priority  ON schedules(priority);
CREATE INDEX IF NOT EXISTS idx_schedules_updatedAt ON schedules(updatedAt);
CREATE INDEX IF NOT EXISTS idx_task_reminders_task ON task_reminders(taskId);
CREATE INDEX IF NOT EXISTS idx_task_reminders_next ON task_reminders(nextFireAt);
CREATE INDEX IF NOT EXISTS idx_task_reminders_en   ON task_reminders(enabled);
CREATE INDEX IF NOT EXISTS idx_agent_messages_conv ON agent_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_role ON agent_messages(role);
CREATE INDEX IF NOT EXISTS idx_agent_conv_updated  ON agent_conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_outbox_state        ON _outbox(state);
CREATE INDEX IF NOT EXISTS idx_conflicts_resolved  ON _sync_conflicts(resolved);
