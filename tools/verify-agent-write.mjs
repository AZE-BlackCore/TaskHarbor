/**
 * TaskHarbor「Agent 写入」全链路验证（无 GUI）
 * ----------------------------------------------------------------------------
 * 目标：验证 WorkBuddy Agent 通过 MCP Server 写入「任务 + 日程」到 TaskHarbor 的
 *       整条通道（MCP → 本地 HTTP API → DB）契约正确。
 *
 * 做法：
 *   1. 起一个 sql.js 模拟后端，忠实复刻 apiServer 的 /api/tasks 与 /api/schedules
 *      端点行为（含真实的 tasks / schedules 表结构），端口随机。
 *   2. 启动「真实」的 tools/mcp-server/server.mjs，指向该端口。
 *   3. 通过 stdio 发送 JSON-RPC：initialize → add_task → add_schedule → list_tasks → list_schedules。
 *   4. 断言数据已真正落入模拟后端 DB。
 *
 * 说明：本环境无法启动 GUI Electron，故不直接跑 exe；但 MCP 层是 Agent 的接入面，
 *      用真实 MCP server + 契约一致的模拟后端即可验证 Agent 写入通道的正确性。
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PROJECT_ROOT =
  'E:/AZE-BlackCore-Agent/WorkBuddy_SwEngineer_Space/08-GitRepo/03-Mobile/TaskHarbor-Desktop';
const require = createRequire(path.join(PROJECT_ROOT, 'package.json'));

const initSqlJs = require('sql.js');
const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });

// ---------- 模拟后端：真实表结构 + 复刻 apiServer 行为 ----------
const DB = new SQL.Database();
DB.run(`
  CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    moduleId TEXT, module TEXT, functionModule TEXT,
    description TEXT NOT NULL,
    progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
    status TEXT DEFAULT 'todo',
    assignee TEXT, startDate TEXT, estimatedEndDate TEXT,
    actualEndDate TEXT, issues TEXT, notes TEXT,
    createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
  )
`);
DB.run(`
  CREATE TABLE schedules (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, location TEXT,
    startTime TEXT NOT NULL, endTime TEXT NOT NULL,
    allDay INTEGER DEFAULT 0, color TEXT DEFAULT '#3B82F6',
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
    reminder INTEGER, repeatType TEXT, repeatInterval INTEGER DEFAULT 1,
    repeatEndDate TEXT, relatedTaskId TEXT,
    createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
  )
`);

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const send = (status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  try {
    if (req.method === 'POST' && url.pathname === '/api/tasks') {
      const body = JSON.parse(await readBody(req));
      if (!body.description) return send(400, { error: 'description is required' });
      const id = genId('task');
      DB.run(
        `INSERT INTO tasks (id, module, functionModule, description, progress, status, assignee, startDate, estimatedEndDate, issues, notes, createdAt, updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`,
        [id, body.module || null, body.functionModule || null, body.description,
         body.progress || 0, body.status || 'todo', body.assignee || null,
         body.startDate || null, body.estimatedEndDate || null, body.issues || null, body.notes || null]
      );
      send(201, { success: true, data: { id, ...body, createdAt: new Date().toISOString() } });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/tasks') {
      const rows = queryAll('SELECT * FROM tasks ORDER BY createdAt DESC');
      return send(200, { success: true, data: rows });
    }
    if (req.method === 'POST' && url.pathname === '/api/schedules') {
      const body = JSON.parse(await readBody(req));
      if (!body.title || !body.startTime || !body.endTime)
        return send(400, { error: 'title, startTime, endTime are required' });
      const id = genId('sch');
      DB.run(
        `INSERT INTO schedules (id, title, description, location, startTime, endTime, allDay, color, priority, reminder, repeatType, repeatInterval, repeatEndDate, relatedTaskId, createdAt, updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`,
        [id, body.title, body.description || null, body.location || null, body.startTime, body.endTime,
         body.allDay ? 1 : 0, body.color || '#3B82F6', body.priority || 'medium', body.reminder || null,
         body.repeat?.type || null, body.repeat?.interval || 1, body.repeat?.endDate || null, body.relatedTaskId || null]
      );
      send(201, { success: true, data: { id, ...body } });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/schedules') {
      const rows = queryAll('SELECT * FROM schedules ORDER BY startTime ASC');
      return send(200, { success: true, data: rows });
    }
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return send(200, { ok: true });
    }
    send(404, { error: 'Not found' });
  } catch (e) {
    send(500, { error: String(e) });
  }
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => resolve(d));
    req.on('error', reject);
  });
}
function queryAll(sql) {
  const stmt = DB.prepare(sql);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ---------- 启动 MCP server 并发送 JSON-RPC ----------
function assert(cond, msg) {
  if (!cond) { console.error('  ✗ ' + msg); process.exitCode = 1; }
  else console.log('  ✓ ' + msg);
}

const PORT = 18840;
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
console.log(`[verify] mock backend on http://127.0.0.1:${PORT}`);

const mcp = spawn('node', [path.join(PROJECT_ROOT, 'tools/mcp-server/server.mjs')], {
  env: { ...process.env, TASKHARBOR_API_PORT: String(PORT), TASKHARBOR_API_TOKEN: '' },
  stdio: ['pipe', 'pipe', 'ignore'],
});

let buf = '';
const pending = new Map();
mcp.stdout.setEncoding('utf8');
mcp.stdout.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

function rpc(method, params, id) {
  return new Promise((resolve) => {
    pending.set(id, resolve);
    mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

let fails = 0;
try {
  await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'verify', version: '1' } }, 1);

  // 1) Agent 写入任务
  const taskArgs = {
    description: '验证 Agent 写入任务通道',
    module: '验证模块',
    status: 'in_progress',
    assignee: 'WorkBuddy',
    progress: 30,
    notes: '由 MCP taskharbor_add_task 创建',
  };
  const addTask = await rpc('tools/call', { name: 'taskharbor_add_task', arguments: taskArgs }, 2);
  const taskResult = addTask.result?.content?.[0]?.text;
  let taskId = null;
  try { taskId = JSON.parse(taskResult.split('\n').pop() || '{}').id || JSON.parse(taskResult).data?.id; } catch {}
  // 从文本里取 id 更稳：正则
  const idMatch = taskResult?.match(/"(id|taskId)"\s*:\s*"([^"]+)"/);
  taskId = idMatch ? idMatch[2] : taskId;
  assert(addTask.result && !addTask.result.isError, 'taskharbor_add_task 返回成功');
  console.log('    创建任务返回:', taskResult?.slice(0, 120));

  // 2) Agent 写入日程
  const startT = new Date(Date.now() + 86400000).toISOString();
  const endT = new Date(Date.now() + 86400000 + 3600000).toISOString();
  const schedArgs = {
    title: '验证 Agent 写入日程通道',
    description: '由 MCP taskharbor_add_schedule 创建',
    startTime: startT,
    endTime: endT,
    priority: 'high',
    relatedTaskId: taskId || undefined,
  };
  const addSched = await rpc('tools/call', { name: 'taskharbor_add_schedule', arguments: schedArgs }, 3);
  assert(addSched.result && !addSched.result.isError, 'taskharbor_add_schedule 返回成功');

  // 3) 列出任务，确认落库
  const listTasks = await rpc('tools/call', { name: 'taskharbor_list_tasks', arguments: {} }, 4);
  const taskListText = listTasks.result?.content?.[0]?.text || '';
  const taskRows = JSON.parse(taskListText.split('\n').slice(1).join('\n') || '[]');
  assert(Array.isArray(taskRows) && taskRows.length >= 1, `taskharbor_list_tasks 返回 ${taskRows.length} 条`);
  const created = taskRows.find((t) => t.description === taskArgs.description);
  assert(!!created, '刚写入的任务确实存在于库（Agent→MCP→API→DB 写入成功）');
  if (created) assert(created.status === 'in_progress' && created.assignee === 'WorkBuddy', '任务字段（status/assignee）正确回写');

  // 4) 列出日程，确认落库
  const listScheds = await rpc('tools/call', { name: 'taskharbor_list_schedules', arguments: {} }, 5);
  const schedListText = listScheds.result?.content?.[0]?.text || '';
  const schedRows = JSON.parse(schedListText.split('\n').slice(1).join('\n') || '[]');
  assert(Array.isArray(schedRows) && schedRows.length >= 1, `taskharbor_list_schedules 返回 ${schedRows.length} 条`);
  const createdSched = schedRows.find((s) => s.title === schedArgs.title);
  assert(!!createdSched, '刚写入的日程确实存在于库（Agent→MCP→API→DB 写入成功）');

  console.log(process.exitCode ? '\n[verify] 存在失败项 ❌' : '\n[verify] 任务与日程写入通道全部通过 ✅');
  if (process.exitCode) fails = 1;
} catch (e) {
  console.error('[verify] 异常:', e);
  process.exitCode = 1;
} finally {
  mcp.kill('SIGKILL');
  server.close();
  DB.close();
}
process.exit(process.exitCode || 0);
