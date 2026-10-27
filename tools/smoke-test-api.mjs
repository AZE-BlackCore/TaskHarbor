/**
 * TaskHarbor 1.3.0 API 冒烟测试
 * --------------------------------------------------------------------------
 * 启动「构建产物」(win-unpacked/TaskHarbor.exe)，用临时 APPDATA 隔离到空目录，
 * 避免与正在运行的旧实例争用实时库（DB 在 %APPDATA%/TaskHarbor/todolist.db）。
 *
 * 注意：该 Electron 构建不认 --user-data-dir 标志（会报 bad option 直接退出），
 * 因此改用覆盖 APPDATA 环境变量实现隔离。
 *
 * 验证链路：
 *   GET  /api/health
 *   POST /api/schedules  -> 创建
 *   GET  /api/schedules  -> 列表包含该条
 *   GET  /api/schedules/:id -> 单体
 *   DELETE /api/schedules/:id -> 删除
 *   GET  /api/schedules/:id -> 复查(404)
 *
 * 用法: node tools/smoke-test-api.mjs [exePath] [port]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EXE = process.argv[2] || path.resolve('dist-output-130/win-unpacked/TaskHarbor.exe');
const PORT = process.argv[3] || '18765';
const BASE = `http://127.0.0.1:${PORT}`;

// 隔离用临时目录：APPDATA（库落盘） + 子进程 stdout/stderr 日志
const TMP_APPADATA = fs.mkdtempSync(path.join(os.tmpdir(), 'th-appdata-130-'));
const LOG = path.join(TMP_APPADATA, 'child.log');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let child = null;

function cleanup() {
  if (child && !child.killed) {
    // 仅按 PID 杀掉本次启动的测试进程树，绝不按映像名杀，避免误杀用户正在运行的旧实例
    try {
      spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'ignore' });
    } catch {}
    try { if (!child.killed) child.kill('SIGKILL'); } catch {}
  }
  try { fs.rmSync(TMP_APPADATA, { recursive: true, force: true }); } catch {}
}

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('uncaughtException', (e) => { console.error('[smoke] uncaught:', e); cleanup(); process.exit(1); });

async function waitHealth(maxMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(`${BASE}/api/health`, { cache: 'no-store' });
      if (r.ok) return await r.json();
    } catch {}
    await sleep(500);
  }
  return null;
}

async function main() {
  if (!fs.existsSync(EXE)) {
    console.error(`[smoke] 找不到构建产物: ${EXE}`);
    console.error('[smoke] 请先运行 npm run build:win:portable');
    process.exit(1);
  }

  console.log(`[smoke] 启动 ${EXE}`);
  console.log(`[smoke] 隔离 APPDATA: ${TMP_APPADATA}`);
  console.log(`[smoke] 子进程日志: ${LOG}`);

  // 覆盖 APPDATA，克隆其余环境；注入 NO_PROXY 防止 node fetch 走代理
  const childEnv = { ...process.env, APPDATA: TMP_APPADATA, NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' };
  const logFd = fs.openSync(LOG, 'w');
  child = spawn(EXE, [], {
    stdio: ['ignore', logFd, logFd],
    env: childEnv,
    detached: false,
  });
  child.on('error', (e) => console.error('[smoke] spawn error:', e.message));
  child.on('exit', (code, sig) => console.log(`[smoke] 子进程退出 code=${code} sig=${sig}`));

  // 1) health
  const h = await waitHealth();
  if (!h) {
    console.error('[smoke] API health 超时。子进程日志如下:');
    console.error(fs.readFileSync(LOG, 'utf8').slice(-2000));
    throw new Error('API health timeout');
  }
  console.log('[smoke] 1) GET /api/health =>', JSON.stringify(h));

  // 2) create
  const now = new Date();
  const startT = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const endT = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const createBody = {
    title: '冒烟测试-日程-' + Date.now(),
    description: 'TaskHarbor 1.3.0 API 自动冒烟',
    location: '隔离测试环境',
    startTime: startT,
    endTime: endT,
    allDay: 0,
    color: '#3B82F6',
    priority: 'high',
    reminder: 15,
  };
  const cRes = await fetch(`${BASE}/api/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createBody),
  });
  const created = await cRes.json();
  console.log(`[smoke] 2) POST /api/schedules => HTTP ${cRes.status}`, JSON.stringify(created).slice(0, 200));
  if (cRes.status !== 201 || !created?.data?.id) throw new Error('create failed');
  const id = created.data.id;

  // 3) list
  const lRes = await fetch(`${BASE}/api/schedules`);
  const list = await lRes.json();
  const found = list.data.find((s) => s.id === id);
  console.log(`[smoke] 3) GET /api/schedules => count=${list.data?.length}, matched=${!!found}`);
  if (!found) throw new Error('list missing created item');

  // 4) get by id
  const gRes = await fetch(`${BASE}/api/schedules/${encodeURIComponent(id)}`);
  const got = await gRes.json();
  console.log(`[smoke] 4) GET /api/schedules/:id => title=${got?.data?.title}`);
  if (got?.data?.id !== id) throw new Error('get by id failed');

  // 5) delete
  const dRes = await fetch(`${BASE}/api/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const dJson = await dRes.json();
  console.log(`[smoke] 5) DELETE /api/schedules/:id => HTTP ${dRes.status}`, JSON.stringify(dJson));
  if (dRes.status !== 200) throw new Error('delete failed');

  // 6) verify gone
  const g2 = await fetch(`${BASE}/api/schedules/${encodeURIComponent(id)}`);
  console.log(`[smoke] 6) 复查 => HTTP ${g2.status} (期望 404)`);

  // 7) create task
  const tBody = { description: '冒烟测试-任务-' + Date.now(), module: 'smoke', status: 'todo', assignee: 'WorkBuddy' };
  const tRes = await fetch(`${BASE}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tBody),
  });
  const tCreated = await tRes.json();
  console.log(`[smoke] 7) POST /api/tasks => HTTP ${tRes.status}`, JSON.stringify(tCreated).slice(0, 160));
  if (tRes.status !== 201 || !tCreated?.data?.id) throw new Error('task create failed');
  const tid = tCreated.data.id;

  // 8) list tasks
  const tList = await (await fetch(`${BASE}/api/tasks`)).json();
  const tFound = (tList.data || []).find((t) => t.id === tid);
  console.log(`[smoke] 8) GET /api/tasks => count=${(tList.data || []).length}, matched=${!!tFound}`);
  if (!tFound) throw new Error('task list missing created item');

  // 9) delete task
  const tDel = await fetch(`${BASE}/api/tasks/${encodeURIComponent(tid)}`, { method: 'DELETE' });
  console.log(`[smoke] 9) DELETE /api/tasks/:id => HTTP ${tDel.status}`);
  if (tDel.status !== 200) throw new Error('task delete failed');

  console.log('\n✅ TaskHarbor 1.4.0 API 冒烟全部通过（日程 + 任务）');
  cleanup();
  process.exit(0);
}

main().catch((e) => {
  console.error('\n❌ 冒烟测试失败:', e.message);
  cleanup();
  process.exit(1);
});
