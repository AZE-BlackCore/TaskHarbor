import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import * as path from 'path';
import { app } from 'electron';
import * as fs from 'fs';

let db: Database | null = null;
let DB_PATH = '';

export async function getDatabase(): Promise<Database> {
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

    // 保存数据库
    saveDatabase();

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}
