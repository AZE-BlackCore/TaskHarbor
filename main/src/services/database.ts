import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import * as path from 'path';
import { app } from 'electron';
import * as fs from 'fs';
import { getUTCNow } from '../utils/timestamp';

let db: Database | null = null;
let DB_PATH = '';
let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DELAY = 1000; // 1 秒防抖延迟

/**
 * 数据库管理器 - 单例模式
 */
export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private db: Database | null = null;
  private dbPath: string = '';
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly SAVE_DELAY = 1000;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  getDatabase(): Database | null {
    return this.db;
  }

  getDbPath(): string {
    return this.dbPath;
  }

  /**
   * 延迟保存数据库，避免频繁 I/O 操作
   */
  async saveDatabase() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      if (this.db) {
        try {
          const data = this.db!.export();
          const buffer = Buffer.from(data);
          fs.writeFileSync(this.dbPath, buffer);
          console.log('[Database] Saved at', getUTCNow());
        } catch (error) {
          console.error('[Database] Save error:', error);
        }
      }
    }, this.SAVE_DELAY);
  }

  /**
   * 强制立即保存（应用退出时使用）
   */
  async forceSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
      console.log('[Database] Force saved at', getUTCNow());
    }
  }
}

const dbManager = DatabaseManager.getInstance();

export async function getDatabase(): Promise<Database> {
  const db = dbManager.getDatabase();
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function setupDatabase() {
  try {
    const SQL = await initSqlJs();
    
    // 初始化数据库路径
    DB_PATH = path.join(app.getPath('userData'), 'todolist.db');
    
    // 确保数据库目录存在
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 如果数据库文件存在，加载它
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
      console.log('Database loaded from:', DB_PATH);
    } else {
      db = new SQL.Database();
      console.log('Creating new database at:', DB_PATH);
    }

    // 更新 dbManager 状态
    const manager = DatabaseManager.getInstance();
    // @ts-ignore - 访问私有属性进行初始化
    manager.db = db;
    // @ts-ignore
    manager.dbPath = DB_PATH;

    // 启用外键约束（SQLite 默认关闭，必须每次连接后手动启用）
    db!.run('PRAGMA foreign_keys = ON');
    console.log('[Database] Foreign keys enabled');

    // 创建标签表
    db!.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#3B82F6',
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      )
    `);

    // 创建任务表
    db!.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        moduleId TEXT,
        module TEXT,
        functionModule TEXT,
        description TEXT NOT NULL,
        progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
        status TEXT DEFAULT 'todo',
        assignee TEXT,
        startDate TEXT,
        estimatedEndDate TEXT,
        actualEndDate TEXT,
        issues TEXT,
        notes TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      )
    `);

    // 创建任务-标签关联表
    db!.run(`
      CREATE TABLE IF NOT EXISTS task_tag_relations (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        tagId TEXT NOT NULL,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE(taskId, tagId)
      )
    `);

    // 创建子任务表
    db!.run(`
      CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        description TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        orderIndex INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    // 创建时间日志表
    db!.run(`
      CREATE TABLE IF NOT EXISTS timelogs (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT,
        durationSeconds INTEGER DEFAULT 0,
        description TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    // 创建任务依赖表
    db!.run(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        dependencyTaskId TEXT NOT NULL,
        type TEXT DEFAULT 'finish-to-start',
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (dependencyTaskId) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    // 创建日程表
    db!.run(`
      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        allDay INTEGER DEFAULT 0,
        color TEXT DEFAULT '#3B82F6',
        priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
        reminder INTEGER,
        repeatType TEXT CHECK(repeatType IN ('daily', 'weekly', 'monthly', 'yearly')),
        repeatInterval INTEGER DEFAULT 1,
        repeatEndDate TEXT,
        relatedTaskId TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (relatedTaskId) REFERENCES tasks(id) ON DELETE SET NULL
      )
    `);

    // ===== 任务提醒配置表 =====
    // 存储每个任务的提醒规则（可与 tasks 表分离，支持多条提醒规则）
    db!.run(`
      CREATE TABLE IF NOT EXISTS task_reminders (
        id            TEXT PRIMARY KEY,
        taskId        TEXT NOT NULL,
        reminderTime  TEXT NOT NULL,          -- 首次/基准提醒时间 (ISO)
        cycle         TEXT NOT NULL DEFAULT 'once'
                      CHECK(cycle IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
        intervalDays  INTEGER DEFAULT 0,      -- 自定义周期：间隔天数（cycle='custom' 时有效）
        intervalHours INTEGER DEFAULT 0,      -- 自定义周期：间隔小时（cycle='custom' 时有效）
        customTimes   TEXT,                   -- 每日固定提醒时间列表，逗号分隔 "09:00,14:00"
        lastFiredAt   TEXT,                   -- 上次触发时间 (ISO)
        nextFireAt    TEXT,                   -- 下次触发时间 (ISO, 预计算，用于调度)
        enabled       INTEGER NOT NULL DEFAULT 1, -- 是否启用
        createdAt     TEXT DEFAULT (datetime('now')),
        updatedAt     TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    // ===== Agent 对话历史表 =====
    // 存储 AI 助手的对话会话
    db!.run(`
      CREATE TABLE IF NOT EXISTS agent_conversations (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL DEFAULT '新对话',
        created_at  TEXT DEFAULT (datetime('now')),
        updated_at  TEXT DEFAULT (datetime('now')),
        provider    TEXT,
        model       TEXT
      )
    `);

    // 存储对话中的每条消息记录
    db!.run(`
      CREATE TABLE IF NOT EXISTS agent_messages (
        id              TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role            TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant', 'tool')),
        content         TEXT NOT NULL,
        toolCalls       TEXT,   -- JSON 序列化的 ToolCall[] 数组
        toolCallId      TEXT,   -- 工具调用 ID（role='tool' 时使用）
        created_at      TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE CASCADE
      )
    `);

    // Agent 相关索引
    db!.run(`CREATE INDEX IF NOT EXISTS idx_agent_messages_conv ON agent_messages(conversationId)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_agent_messages_role ON agent_messages(role)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_agent_conv_updated ON agent_conversations(updated_at)`);

    // ===== 数据库在线迁移（为现有表添加缺失字段）=====
    // 若字段已存在，ALTER TABLE 会抛异常，catch 掉即可（sqlite 无 IF NOT EXISTS 语法）
    const migrateColumn = (sql: string) => { try { db!.run(sql); } catch (_) {} };
    
    // Agent 表迁移：添加 provider/model 字段
    migrateColumn(`ALTER TABLE agent_conversations ADD COLUMN provider TEXT`);
    migrateColumn(`ALTER TABLE agent_conversations ADD COLUMN model TEXT`);
    
    // tasks 表迁移：添加提醒字段
    migrateColumn(`ALTER TABLE tasks ADD COLUMN reminderEnabled INTEGER DEFAULT 0`);
    migrateColumn(`ALTER TABLE tasks ADD COLUMN reminderTime TEXT`);
    migrateColumn(`ALTER TABLE tasks ADD COLUMN reminderCycle TEXT DEFAULT 'once'`);
    migrateColumn(`ALTER TABLE tasks ADD COLUMN reminderInterval INTEGER DEFAULT 1`);
    migrateColumn(`ALTER TABLE tasks ADD COLUMN reminderIntervalUnit TEXT DEFAULT 'day'`);
    migrateColumn(`ALTER TABLE tasks ADD COLUMN customReminderTimes TEXT`);
    migrateColumn(`ALTER TABLE tasks ADD COLUMN reminderLastFired TEXT`);

    // 创建索引
    db!.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_tasks_startDate ON tasks(startDate)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(taskId)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_timelogs_task ON timelogs(taskId)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_dependencies_task ON task_dependencies(taskId)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_task_tag_relations_task ON task_tag_relations(taskId)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_task_tag_relations_tag ON task_tag_relations(tagId)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_schedules_startTime ON schedules(startTime)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_schedules_endTime ON schedules(endTime)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_schedules_priority ON schedules(priority)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_task_reminders_task ON task_reminders(taskId)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_task_reminders_nextFire ON task_reminders(nextFireAt)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_task_reminders_enabled ON task_reminders(enabled)`);

    // 数据迁移：将现有的 projects 表迁移为 tags 表
    try {
      // 检查 projects 表是否存在且有数据
      const checkProjectsStmt = db!.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'");
      let hasProjectsTable = false;
      if (checkProjectsStmt.step()) {
        hasProjectsTable = true;
      }
      checkProjectsStmt.free();

      if (hasProjectsTable) {
        // 迁移项目到标签
        const migrateProjectsStmt = db!.prepare(`
          INSERT OR IGNORE INTO tags (id, name, color, createdAt, updatedAt)
          SELECT id, name, color, createdAt, updatedAt FROM projects
        `);
        migrateProjectsStmt.run();
        migrateProjectsStmt.free();

        // 迁移任务与项目的关联到任务-标签关联
        const checkTasksHasProjectId = db!.prepare("PRAGMA table_info(tasks)");
        let hasProjectIdColumn = false;
        while (checkTasksHasProjectId.step()) {
          const col = checkTasksHasProjectId.getAsObject() as any;
          if (col.name === 'projectId') {
            hasProjectIdColumn = true;
            break;
          }
        }
        checkTasksHasProjectId.free();

        if (hasProjectIdColumn) {
          const migrateTaskRelationsStmt = db!.prepare(`
            INSERT OR IGNORE INTO task_tag_relations (id, taskId, tagId, createdAt)
            SELECT 
              hex(randomblob(16)) || lower(hex(randomblob(4))) || lower(hex(randomblob(4))) || lower(hex(randomblob(4))) || lower(hex(randomblob(12))),
              id, 
              projectId, 
              datetime('now')
            FROM tasks 
            WHERE projectId IS NOT NULL
          `);
          migrateTaskRelationsStmt.run();
          migrateTaskRelationsStmt.free();
        }

        console.log('[Database] Projects migrated to tags successfully');
      }
    } catch (e) {
      console.log('[Database] Migration skipped or failed:', e);
    }

    // 创建数据验证触发器
    try {
      db!.run(`
        CREATE TRIGGER validate_task_progress
        BEFORE INSERT OR UPDATE ON tasks
        FOR EACH ROW
        BEGIN
          SELECT CASE
            WHEN NEW.progress < 0 OR NEW.progress > 100
            THEN RAISE(ABORT, 'Progress must be between 0 and 100')
          END;
        END;
      `);
    } catch (e) {
      console.log('Trigger validate_task_progress already exists');
    }

    try {
      db!.run(`
        CREATE TRIGGER update_task_timestamp
        AFTER UPDATE ON tasks
        FOR EACH ROW
        BEGIN
          UPDATE tasks SET updatedAt = datetime('now') WHERE id = NEW.id;
        END;
      `);
    } catch (e) {
      console.log('Trigger update_task_timestamp already exists');
    }

    try {
      db!.run(`
        CREATE TRIGGER update_tag_timestamp
        AFTER UPDATE ON tags
        FOR EACH ROW
        BEGIN
          UPDATE tags SET updatedAt = datetime('now') WHERE id = NEW.id;
        END;
      `);
    } catch (e) {
      console.log('Trigger update_tag_timestamp already exists');
    }

    // 保存数据库
    dbManager.saveDatabase();

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * 延迟保存数据库（防抖）
 */
export function saveDatabase() {
  dbManager.saveDatabase();
}

/**
 * 强制立即保存数据库
 */
export function forceSaveDatabase() {
  dbManager.forceSave();
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
  forceSaveDatabase();
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 运行数据库事务
 * @param operation 事务操作函数
 * @returns 操作结果
 */
export async function runTransaction<T>(
  operation: (db: Database) => Promise<T>
): Promise<T> {
  const database = await getDatabase();
  
  try {
    database.run('BEGIN TRANSACTION');
    const result = await operation(database);
    database.run('COMMIT');
    saveDatabase();
    return result;
  } catch (error) {
    database.run('ROLLBACK');
    console.error('[Database] Transaction failed:', error);
    throw error;
  }
}

/**
 * 软删除辅助函数
 * @param table 表名
 * @param id 记录 ID
 */
export function softDelete(table: string, id: string) {
  const database = dbManager.getDatabase();
  if (!database) {
    throw new Error('Database not initialized');
  }
  
  const stmt = database.prepare(`
    UPDATE ${table} SET deletedAt = ? WHERE id = ?
  `);
  stmt.run([getUTCNow(), id]);
  saveDatabase();
}

/**
 * 检查记录是否已被软删除
 * @param table 表名
 * @param id 记录 ID
 * @returns 是否已删除
 */
export function isDeleted(table: string, id: string): boolean {
  const database = dbManager.getDatabase();
  if (!database) {
    throw new Error('Database not initialized');
  }
  
  const stmt = database.prepare(`
    SELECT deletedAt FROM ${table} WHERE id = ?
  `);
  stmt.bind([id]);
  
  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    return row.deletedAt !== null && row.deletedAt !== undefined;
  }
  
  return false;
}
