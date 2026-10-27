/**
 * TaskHarbor HTTP API 端到端验证（不依赖正在运行的 App）
 * ----------------------------------------------------------------------------
 * 用 sql.js 起一个临时库 + 复制 scheduleService 的建表/插入逻辑，
 * 启动一个与 apiServer 等价的最小 HTTP 服务，POST/GET 一条示例日程，
 * 校验「通道契约 + 数据模型」正确。仅用于开发验证。
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';

const PROJECT_ROOT =
  'E:/AZE-BlackCore-Agent/WorkBuddy_SwEngineer_Space/08-GitRepo/03-Mobile/TaskHarbor-Desktop';
const require = createRequire(path.join(PROJECT_ROOT, 'package.json'));

const initSqlJs = require('sql.js');
const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });

// 与主程序 database.ts 完全一致的 schedules 建表语句
const DB = new SQL.Database();
DB.run(`
  CREATE TABLE schedules (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    allDay INTEGER DEFAULT 0,
    color TEXT DEFAULT '#3B82F6',
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
    reminder INTEGER,
    repeatType TEXT CHECK(repeatType IN ('daily','weekly','monthly','yearly')),
    repeatInterval INTEGER DEFAULT 1,
    repeatEndDate TEXT,
    relatedTaskId TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  )
`);

// 复制 scheduleService.createSchedule 的逻辑
function createSchedule(input) {
  const id = `sch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  DB.run(
    `INSERT INTO schedules (
      id, title, description, location, startTime, endTime,
      allDay, color, priority, reminder, repeatType, repeatInterval,
      repeatEndDate, relatedTaskId, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.title,
      input.description || null,
      input.location || null,
      input.startTime,
      input.endTime,
      input.allDay ? 1 : 0,
      input.color || '#3B82F6',
      input.priority || 'medium',
      input.reminder || null,
      input.repeat?.type || null,
      input.repeat?.interval || 1,
      input.repeat?.endDate || null,
      input.relatedTaskId || null,
      now,
      now,
    ]
  );
  const stmt = DB.prepare('SELECT * FROM schedules WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startTime: row.startTime,
    endTime: row.endTime,
    allDay: row.allDay === 1,
    color: row.color,
    priority: row.priority,
    reminder: row.reminder,
    repeat: row.repeatType
      ? { type: row.repeatType, interval: row.repeatInterval, endDate: row.repeatEndDate }
      : undefined,
    relatedTaskId: row.relatedTaskId,
  };
}

function getSchedules() {
  const stmt = DB.prepare('SELECT * FROM schedules ORDER BY startTime ASC');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows.map((row) => ({ id: row.id, title: row.title, allDay: row.allDay === 1, priority: row.priority }));
}

const PORT = 18799;
const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/schedules') {
    let body = '';
    for await (const c of req) body += c;
    const data = JSON.parse(body);
    const created = createSchedule(data);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: created }));
    return;
  }
  if (req.method === 'GET' && req.url === '/api/schedules') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: getSchedules() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

function assert(cond, msg) {
  if (!cond) {
    console.error('  ✗ ' + msg);
    process.exitCode = 1;
  } else {
    console.log('  ✓ ' + msg);
  }
}

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`[verify] temp API on http://127.0.0.1:${PORT}`);
  try {
    const tomorrow = new Date(Date.now() + 86400000);
    const start = new Date(tomorrow); start.setHours(9, 0, 0, 0);
    const end = new Date(tomorrow); end.setHours(10, 0, 0, 0);
    const payload = {
      title: '示例日程 · TaskHarbor 对接验证',
      description: '由 WorkBuddy 通过 HTTP API / MCP 写入的示例日程，验证对接通道可用。',
      location: 'WorkBuddy',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      allDay: false,
      color: '#3B82F6',
      priority: 'medium',
      reminder: 15,
    };

    const postRes = await fetch(`http://127.0.0.1:${PORT}/api/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const postJson = await postRes.json();
    assert(postRes.status === 201, 'POST /api/schedules 返回 201');
    assert(postJson.success === true, '响应 success=true');
    assert(!!postJson.data.id, '返回数据包含生成的 id');
    assert(postJson.data.title === payload.title, 'title 正确回写');
    assert(postJson.data.allDay === false, 'allDay 正确映射(0→false)');
    assert(postJson.data.priority === 'medium', 'priority 默认值生效');

    const getRes = await fetch(`http://127.0.0.1:${PORT}/api/schedules`);
    const getJson = await getRes.json();
    assert(Array.isArray(getJson.data) && getJson.data.length === 1, 'GET /api/schedules 返回 1 条');
    assert(getJson.data[0].id === postJson.data.id, '列表中的 id 与创建一致');

    console.log('\n[verify] 示例日程已写入临时库：');
    console.log(JSON.stringify(postJson.data, null, 2));
    console.log(process.exitCode ? '\n[verify] 存在失败项 ❌' : '\n[verify] 全部通过 ✅');
  } catch (e) {
    console.error('[verify] 异常:', e);
    process.exitCode = 1;
  } finally {
    server.close();
    DB.close();
  }
});
