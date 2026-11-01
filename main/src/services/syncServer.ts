/**
 * hub/syncServer —— 桌面端同步中枢（权威源）
 *
 * 设计约束：
 *   - 独立端口（18766），不改造 Agent 本地 API（127.0.0.1:18765）
 *   - 默认关闭；仅用户主动开启时监听（最小信任面）
 *   - 只绑定 WiFi / 私有网卡地址，绝不绑 0.0.0.0（ADR-06）
 *   - 所有落库 updatedAt 由 Hub 时钟生成（ADR-03）
 *   - PIN 三次错误即失效并重新生成；token 长期且可撤销
 *   - 日志脱敏：禁止输出任务标题与正文
 */

import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { app } from 'electron';
import { getDatabase, saveDatabase } from './database';

const HUB_PORT = Number(process.env.TASKHARBOR_SYNC_PORT ?? 18766);
const SYNC_TABLES = [
  'tasks',
  'schedules',
  'tags',
  'task_tag_relations',
  'subtasks',
  'timelogs',
  'task_dependencies',
  'task_reminders',
];
const SCHEMA_VERSION = 1;
const HUB_VERSION = '0.1.0';
const PIN_TTL_MS = 10 * 60 * 1000;

interface PairSession {
  pin: string;
  createdAt: number;
  failCount: number;
}

interface HubState {
  running: boolean;
  server: http.Server | null;
  host: string | null;
  port: number;
  pin: PairSession | null;
  token: string | null;
  hubId: string;
  lastError: string | null;
  pairedDevices: Array<{ id: string; name: string; pairedAt: string; lastSeenAt: string }>;
}

export const hubState: HubState = {
  running: false,
  server: null,
  host: null,
  port: HUB_PORT,
  pin: null,
  token: null,
  hubId: '',
  lastError: null,
  pairedDevices: [],
};

// ------------------------------------------------------------------ 工具

function log(msg: string): void {
  console.log(`[SyncHub] ${msg}`);
}

/** 候选监听地址：仅私有网段 IPv4，优先 WLAN/Wi-Fi 网卡 */
export function listCandidateAddresses(): Array<{ address: string; iface: string }> {
  const out: Array<{ address: string; iface: string }> = [];
  const nets = os.networkInterfaces();
  for (const [name, list] of Object.entries(nets)) {
    for (const net of list ?? []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      const a = net.address;
      const isPrivate =
        a.startsWith('192.168.') ||
        a.startsWith('10.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(a);
      if (isPrivate) out.push({ address: a, iface: name });
    }
  }
  out.sort((x, y) => {
    const score = (n: string) => (/wlan|wi-?fi|wireless/i.test(n) ? 0 : 1);
    return score(x.iface) - score(y.iface);
  });
  return out;
}

function generatePin(): string {
  return String(crypto.randomInt(100000, 999999));
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ------------------------------------------------- sql.js 执行封装（复用现有 DB 实例）

/** Hub 启动时已 await getDatabase()，此处使用同步引用 */
let dbRef: any = null;

function queryAll(sql: string, params: unknown[] = []): Array<Record<string, unknown>> {
  const db = dbRef;
  if (!db) throw new Error('database not ready');
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params as any[]);
  const rows: Array<Record<string, unknown>> = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>);
  stmt.free();
  return rows;
}

function runSql(sql: string, params: unknown[] = []): number {
  const db = dbRef;
  if (!db) throw new Error('database not ready');
  db.run(sql, params as any[]);
  return db.getRowsModified();
}

// --------------------------------------------------------------- schema 迁移

/**
 * 应用 core/schema 的增量迁移（DDL 单一真源）
 * 桌面端为存量库，逐条 ALTER 失败（列已存在）属预期，静默跳过。
 */
export async function applySyncSchemaMigration(): Promise<void> {
  try {
    // core/schema 在打包后位于 app.asar 内（electron-builder 的 files 配置），
    // 必须经由 app.getAppPath() 解析（process.resourcesPath 指向 resources/ 根目录，
    // 不含 asar 内的 core/schema），否则打包版会找不到迁移文件、同步元表不创建、
    // 启动同步报 no such table: _sync_meta。
    const base = path.join(app.getAppPath(), 'core', 'schema');
    const file = path.join(base, 'migrations', '001_sync_enable.sql');
    if (!fs.existsSync(file)) {
      log(`migration file not found: ${file}`);
      return;
    }
    const sql = fs.readFileSync(file, 'utf8');
    const db = await getDatabase();
    for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
      try {
        db.run(stmt);
      } catch {
        /* 预期内失败：列/表已存在 */
      }
    }
    saveDatabase();
    log('sync schema migration applied');
  } catch (e) {
    log(`migration failed: ${String(e)}`);
  }
}

// ------------------------------------------------------------------ 业务端点

function ensureAuth(req: http.IncomingMessage): boolean {
  if (!hubState.token) return false;
  const auth = String(req.headers['authorization'] ?? '');
  return auth === `Bearer ${hubState.token}`;
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 20 * 1024 * 1024) {
        reject(new Error('payload too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/** 写库：upsert 拆为先 UPDATE 后 INSERT（规避 Android 侧缺陷，桌面端同样遵守以保持一致） */
function applyChange(change: any, serverTs: string): { ok: boolean; conflict?: boolean; error?: string } {
  const table = String(change?.table ?? '');
  if (!SYNC_TABLES.includes(table)) {
    return { ok: false, error: `table not syncable: ${table}` };
  }
  const id = String(change?.id ?? '');
  if (!id) return { ok: false, error: 'missing id' };

  try {
    if (change.op === 'delete') {
      runSql(`UPDATE ${table} SET deletedAt = ?, updatedAt = ? WHERE id = ?`, [serverTs, serverTs, id]);
      return { ok: true };
    }
    const payload: Record<string, unknown> = {
      ...(change.payload ?? {}),
      id,
      updatedAt: serverTs, // ADR-03：时间戳一律由 Hub 生成
      deletedAt: null,
      originDeviceId: change.originDeviceId ?? null,
    };
    const cols = tableColumns(table);
    const keys = Object.keys(payload).filter((k) => cols.includes(k));
    const values = keys.map((k) => payload[k]);
    const changed = runSql(
      `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
      [...values, id]
    );
    if (changed === 0) {
      runSql(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
        values
      );
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

const columnCache = new Map<string, string[]>();
function tableColumns(table: string): string[] {
  const cached = columnCache.get(table);
  if (cached) return cached;
  const rows = queryAll(`PRAGMA table_info(${table})`);
  const cols = rows.map((r) => String(r.name));
  columnCache.set(table, cols);
  return cols;
}

function handlePull(params: URLSearchParams): { table: string; changes: unknown[]; nextCursor: any; hasMore: boolean } {
  const table = String(params.get('table') ?? '');
  if (!SYNC_TABLES.includes(table)) {
    return { table, changes: [], nextCursor: { ts: null, id: null }, hasMore: false };
  }
  const cursorTs = params.get('cursorTs') || null;
  const cursorId = params.get('cursorId') || null;
  const pageSize = Math.min(Number(params.get('pageSize') ?? 500) || 500, 1000);

  let sql: string;
  let args: unknown[];
  if (!cursorTs) {
    sql = `SELECT * FROM ${table} ORDER BY updatedAt ASC, id ASC LIMIT ?`;
    args = [pageSize + 1];
  } else {
    sql =
      `SELECT * FROM ${table} WHERE (updatedAt > ? OR (updatedAt = ? AND id > ?)) ` +
      `ORDER BY updatedAt ASC, id ASC LIMIT ?`;
    args = [cursorTs, cursorTs, cursorId ?? '', pageSize + 1];
  }
  const rows = queryAll(sql, args);
  const hasMore = rows.length > pageSize;
  const page = hasMore ? rows.slice(0, pageSize) : rows;
  const last = page[page.length - 1];
  return {
    table,
    changes: page.map((r) => ({
      table,
      op: r.deletedAt ? 'delete' : 'upsert',
      id: String(r.id),
      updatedAt: String(r.updatedAt ?? ''),
      deletedAt: r.deletedAt ? String(r.deletedAt) : null,
      originDeviceId: r.originDeviceId ? String(r.originDeviceId) : null,
      payload: r,
    })),
    nextCursor: last ? { ts: String(last.updatedAt ?? ''), id: String(last.id) } : { ts: cursorTs, id: cursorId },
    hasMore,
  };
}

// ------------------------------------------------------------------ 启停

export interface StartHubOptions {
  /** 指定监听地址；缺省自动取第一个私有网卡地址 */
  host?: string;
  port?: number;
}

export async function startHub(opts: StartHubOptions = {}): Promise<{
  host: string;
  port: number;
  pin: string;
  candidates: Array<{ address: string; iface: string }>;
}> {
  if (hubState.running && hubState.server) {
    return {
      host: hubState.host ?? '127.0.0.1',
      port: hubState.port,
      pin: hubState.pin?.pin ?? generatePin(),
      candidates: listCandidateAddresses(),
    };
  }

  dbRef = await getDatabase();
  await applySyncSchemaMigration();

  // 防御：迁移后确认同步元表已就位，避免裸奔报 "no such table: _sync_meta"
  const metaReady = queryAll(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='_sync_meta'"
  );
  if (!metaReady.length) {
    throw new Error('同步元表初始化失败（_sync_meta 缺失）：core/schema 资源未随安装包分发或迁移未执行');
  }

  const candidates = listCandidateAddresses();
  const host = opts.host && opts.host.length ? opts.host : candidates[0]?.address ?? '127.0.0.1';
  const port = opts.port ?? HUB_PORT;
  if (!hubState.token) {
    const rows = queryAll("SELECT value FROM _sync_meta WHERE key = 'hubToken'");
    hubState.token = rows.length ? String(rows[0].value) : generateToken();
    if (!rows.length) {
      runSql("INSERT INTO _sync_meta (key, value, updatedAt) VALUES ('hubToken', ?, ?)", [
        hubState.token,
        new Date().toISOString(),
      ]);
    }
  }
  if (!hubState.hubId) {
    const rows = queryAll("SELECT value FROM _sync_meta WHERE key = 'hubId'");
    hubState.hubId = rows.length ? String(rows[0].value) : `hub_${crypto.randomUUID()}`;
    if (!rows.length) {
      runSql("INSERT INTO _sync_meta (key, value, updatedAt) VALUES ('hubId', ?, ?)", [
        hubState.hubId,
        new Date().toISOString(),
      ]);
    }
  }
  hubState.pin = { pin: generatePin(), createdAt: Date.now(), failCount: 0 };

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://${host}:${port}`);
      const pathname = url.pathname;

      if (pathname === '/api/sync/meta') {
        return json(res, 200, {
          hubVersion: HUB_VERSION,
          appVersion: app.getVersion(),
          schemaVersion: SCHEMA_VERSION,
          syncTables: SYNC_TABLES,
          serverTime: new Date().toISOString(),
          deviceId: hubState.hubId,
        });
      }

      if (pathname === '/api/sync/pair') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const pin = String(body?.pin ?? '');
        const session = hubState.pin;
        if (!session || Date.now() - session.createdAt > PIN_TTL_MS) {
          hubState.pin = { pin: generatePin(), createdAt: Date.now(), failCount: 0 };
          return json(res, 401, { error: 'PIN 已过期，请在桌面端重新生成' });
        }
        if (pin !== session.pin) {
          session.failCount += 1;
          if (session.failCount >= 3) {
            hubState.pin = { pin: generatePin(), createdAt: Date.now(), failCount: 0 };
            return json(res, 401, { error: '配对码错误次数过多，已重新生成' });
          }
          return json(res, 401, { error: '配对码错误' });
        }
        const deviceId = String(body?.deviceId ?? '');
        const existing = hubState.pairedDevices.find((d) => d.id === deviceId);
        const nowIso = new Date().toISOString();
        if (existing) {
          existing.lastSeenAt = nowIso;
        } else {
          hubState.pairedDevices.push({
            id: deviceId || `dev_${Date.now()}`,
            name: String(body?.deviceName ?? '移动端'),
            pairedAt: nowIso,
            lastSeenAt: nowIso,
          });
        }
        saveDatabase();
        return json(res, 200, {
          token: hubState.token,
          hubId: hubState.hubId,
          hubVersion: HUB_VERSION,
          schemaVersion: SCHEMA_VERSION,
        });
      }

      if (!ensureAuth(req)) {
        return json(res, 401, { error: 'unauthorized' });
      }

      if (pathname === '/api/sync/push') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const changes: any[] = Array.isArray(body?.changes) ? body.changes : [];
        const serverTs = new Date().toISOString();
        const results = changes.map((c) => {
          const r = applyChange(c, serverTs);
          return { id: String(c?.id ?? ''), ok: r.ok, hubUpdatedAt: serverTs, error: r.error };
        });
        saveDatabase(); // 关键：写入后落盘（与 Agent API 一致）
        return json(res, 200, { results, serverTime: serverTs });
      }

      if (pathname === '/api/sync/pull') {
        const data = handlePull(url.searchParams);
        return json(res, 200, { ...data, serverTime: new Date().toISOString() });
      }

      if (pathname === '/api/sync/verify') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const summaries: Record<string, any> = body?.summaries ?? {};
        const diffs = Object.keys(summaries).map((table) => {
          const rows = queryAll(`SELECT COUNT(*) AS n FROM ${table}`);
          const hubCount = Number(rows[0]?.n ?? 0);
          const localCount = Number(summaries[table]?.count ?? 0);
          return { table, localCount, hubCount, drift: localCount !== hubCount };
        });
        return json(res, 200, { diffs, serverTime: new Date().toISOString() });
      }

      return json(res, 404, { error: 'not found' });
    } catch (e) {
      hubState.lastError = String(e);
      return json(res, 500, { error: 'internal error' });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });

  hubState.server = server;
  hubState.running = true;
  hubState.host = host;
  hubState.port = port;
  log(`listening on http://${host}:${port}`);

  return { host, port, pin: hubState.pin.pin, candidates };
}

export async function stopHub(): Promise<void> {
  if (!hubState.server) return;
  await new Promise<void>((resolve) => {
    hubState.server?.close(() => resolve());
  });
  hubState.server = null;
  hubState.running = false;
  hubState.host = null;
  hubState.pin = null;
  log('stopped');
}

export function rotatePin(): string {
  hubState.pin = { pin: generatePin(), createdAt: Date.now(), failCount: 0 };
  return hubState.pin.pin;
}

export function getHubStatus() {
  return {
    running: hubState.running,
    host: hubState.host,
    port: hubState.port,
    pin: hubState.pin?.pin ?? null,
    hubId: hubState.hubId,
    pairedDevices: hubState.pairedDevices,
    lastError: hubState.lastError,
    candidates: listCandidateAddresses(),
  };
}

export { SCHEMA_VERSION as HUB_SCHEMA_VERSION, HUB_PORT };
