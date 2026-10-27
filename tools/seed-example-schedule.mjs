/**
 * 将一条示例日程写入真实的 TaskHarbor 数据库（%APPDATA%/TaskHarbor/todolist.db）
 * ----------------------------------------------------------------------------
 * ⚠️ 安全约束：仅当 TaskHarbor 完全关闭时才能运行。
 *    - 若检测到 TaskHarbor.exe 正在运行，直接中止（避免与内存态冲突丢数据）。
 *    - 写入前自动备份原库为 todolist.db.bak.<时间戳>。
 *
 * 用法：先关闭 TaskHarbor，然后 `node tools/seed-example-schedule.mjs`
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT =
  'E:/AZE-BlackCore-Agent/WorkBuddy_SwEngineer_Space/08-GitRepo/03-Mobile/TaskHarbor-Desktop';
const require = createRequire(path.join(PROJECT_ROOT, 'package.json'));
const initSqlJs = require('sql.js');

const appData = process.env.APPDATA || process.env.LOCALAPPDATA;
if (!appData) {
  console.error('[seed] 无法确定 APPDATA 路径'); process.exit(1);
}
const DB_PATH = path.join(appData, 'TaskHarbor', 'todolist.db');

// 0) 安全检测：TaskHarbor 是否在运行（使用 PowerShell Get-Process，检测异常时保守中止）
function isTaskHarborRunning() {
  try {
    const out = execSync(
      'powershell.exe -NoProfile -Command "Get-Process -Name TaskHarbor -ErrorAction SilentlyContinue | Measure-Object | ForEach-Object { $_.Count }"',
      { stdio: ['ignore', 'pipe', 'ignore'] }
    )
      .toString()
      .trim();
    const count = parseInt(out, 10);
    return Number.isFinite(count) && count > 0;
  } catch {
    // 检测本身失败 → 保守判定为「正在运行」并中止，避免误写实时库
    return true;
  }
}
if (isTaskHarborRunning()) {
  console.error('[seed] 检测到 TaskHarbor 正在运行（或进程检测不可用），已中止写入。');
  console.error('[seed] 请先完全退出 TaskHarbor（包括托盘），再运行本脚本，避免数据冲突。');
  process.exit(2);
}

if (!fs.existsSync(DB_PATH)) {
  console.error('[seed] 未找到数据库文件:', DB_PATH);
  process.exit(1);
}

// 1) 备份
const bakPath = `${DB_PATH}.bak.${Date.now()}`;
fs.copyFileSync(DB_PATH, bakPath);
console.log('[seed] 已备份原库 ->', bakPath);

// 2) 打开并写入示例日程
const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
const db = new SQL.Database(fs.readFileSync(DB_PATH));

try {
  // 确保表存在（理论上已存在）
  db.run(`CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, location TEXT,
    startTime TEXT NOT NULL, endTime TEXT NOT NULL, allDay INTEGER DEFAULT 0,
    color TEXT DEFAULT '#3B82F6', priority TEXT DEFAULT 'medium',
    reminder INTEGER, repeatType TEXT, repeatInterval INTEGER DEFAULT 1,
    repeatEndDate TEXT, relatedTaskId TEXT, createdAt TEXT, updatedAt TEXT)`);

  const id = `sch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 86400000);
  const start = new Date(tomorrow); start.setHours(9, 0, 0, 0);
  const end = new Date(tomorrow); end.setHours(10, 0, 0, 0);

  db.run(
    `INSERT INTO schedules (
      id, title, description, location, startTime, endTime,
      allDay, color, priority, reminder, repeatType, repeatInterval, repeatEndDate, relatedTaskId, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      '示例日程 · TaskHarbor 对接验证',
      '由 WorkBuddy 通过 HTTP API / MCP 写入的示例日程，验证对接通道可用。',
      'WorkBuddy',
      start.toISOString(),
      end.toISOString(),
      0,
      '#3B82F6',
      'medium',
      15,
      null, 1, null, null,
      now, now,
    ]
  );
  console.log('[seed] 已写入示例日程，id =', id);
} catch (e) {
  console.error('[seed] 写入失败:', e);
  process.exit(1);
} finally {
  // 3) 落盘
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();
  console.log('[seed] 已写回数据库:', DB_PATH);
  console.log('[seed] 完成 ✅ 重新打开 TaskHarbor 即可看到该示例日程。');
}
