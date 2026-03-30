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
class DatabaseManager {
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

    // 创建项目表
    db!.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('personal', 'company')),
        description TEXT,
        color TEXT DEFAULT '#3B82F6',
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      )
    `);

    // 创建任务表
    db!.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
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
        updatedAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
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

    // 创建任务标签关联表
    db!.run(`
      CREATE TABLE IF NOT EXISTS task_tags (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        tagName TEXT NOT NULL,
        tagColor TEXT DEFAULT '#3B82F6',
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    // 创建索引
    db!.run(`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(projectId)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_tasks_startDate ON tasks(startDate)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(taskId)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_timelogs_task ON timelogs(taskId)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_dependencies_task ON task_dependencies(taskId)`);
    db!.run(`CREATE INDEX IF NOT EXISTS idx_tags_task ON task_tags(taskId)`);

    // 创建数据验证触发器
    db!.run(`
      CREATE TRIGGER IF NOT EXISTS validate_task_project
      BEFORE INSERT ON tasks
      FOR EACH ROW
      BEGIN
        SELECT CASE
          WHEN (SELECT COUNT(*) FROM projects WHERE id = NEW.projectId) = 0
          THEN RAISE(ABORT, 'Project not found')
        END;
      END;
    `);

    db!.run(`
      CREATE TRIGGER IF NOT EXISTS validate_task_progress
      BEFORE INSERT OR UPDATE ON tasks
      FOR EACH ROW
      BEGIN
        SELECT CASE
          WHEN NEW.progress < 0 OR NEW.progress > 100
          THEN RAISE(ABORT, 'Progress must be between 0 and 100')
        END;
      END;
    `);

    db!.run(`
      CREATE TRIGGER IF NOT EXISTS update_task_timestamp
      AFTER UPDATE ON tasks
      FOR EACH ROW
      BEGIN
        UPDATE tasks SET updatedAt = datetime('now') WHERE id = NEW.id;
      END;
    `);

    db!.run(`
      CREATE TRIGGER IF NOT EXISTS update_project_timestamp
      AFTER UPDATE ON projects
      FOR EACH ROW
      BEGIN
        UPDATE projects SET updatedAt = datetime('now') WHERE id = NEW.id;
      END;
    `);

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
