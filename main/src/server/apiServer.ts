import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import * as path from 'path';
import { app } from 'electron';
import * as scheduleService from '../services/scheduleService';
import { taskService } from '../services/taskService';

/**
 * TaskHarbor 本地 HTTP API
 * ----------------------------------------------------------------------------
 * 为外部工具（WorkBuddy / MCP / 脚本 / curl）提供写入日程的能力。
 * 仅监听 127.0.0.1（本机回环），不暴露到局域网。
 *
 * 环境变量：
 *   TASKHARBOR_API_PORT  监听端口，默认 18765
 *   TASKHARBOR_API_TOKEN 若设置，则所有请求必须带 `Authorization: Bearer <token>`
 *
 * 端点：
 *   GET  /api/health
 *   POST /api/schedules            body = CreateScheduleInput
 *   GET  /api/schedules?date=      | ?start=&end=&priority=&search=
 *   GET  /api/schedules/:id
 *   PUT  /api/schedules/:id        body = Partial<CreateScheduleInput>
 *   DELETE /api/schedules/:id
 */

const DEFAULT_PORT = 18765;
const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 1_000_000; // 1MB 上限，防滥用

let server: ReturnType<typeof createServer> | null = null;

function getPort(): number {
  const raw = process.env.TASKHARBOR_API_PORT;
  const parsed = raw ? parseInt(raw, 10) : DEFAULT_PORT;
  return Number.isFinite(parsed) ? parsed : DEFAULT_PORT;
}

function getToken(): string | undefined {
  const t = process.env.TASKHARBOR_API_TOKEN;
  return t && t.length > 0 ? t : undefined;
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(body);
}

function readBody(req: IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      data += chunk.toString();
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const reqUrl = new URL(req.url || '/', `http://${HOST}`);
  const pathname = reqUrl.pathname;

  // CORS 预检
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  // 鉴权（仅当设置了 TASKHARBOR_API_TOKEN 时生效）
  const token = getToken();
  if (token) {
    const auth = (req.headers['authorization'] as string) || '';
    if (!auth.startsWith('Bearer ') || auth.slice(7) !== token) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
  }

  try {
    // 健康检查
    if (pathname === '/api/health' && req.method === 'GET') {
      // MCP server 路径：打包后随安装包内置到 resources/mcp-server，开发时指向源码
      const mcpServerPath = app.isPackaged
        ? path.join(process.resourcesPath, 'mcp-server', 'server.mjs')
        : path.join(app.getAppPath(), 'tools', 'mcp-server', 'server.mjs');
      sendJson(res, 200, {
        ok: true,
        version: app.getVersion(),
        uptime: process.uptime(),
        mcpServerPath,
      });
      return;
    }

    // /api/schedules 集合
    if (pathname === '/api/schedules') {
      if (req.method === 'POST') {
        const body = await readBody(req);
        if (!body.title || !body.startTime || !body.endTime) {
          sendJson(res, 400, { error: 'title, startTime, endTime are required' });
          return;
        }
        const schedule = await scheduleService.createSchedule(body as any);
        sendJson(res, 201, { success: true, data: schedule });
        return;
      }

      if (req.method === 'GET') {
        const date = reqUrl.searchParams.get('date');
        if (date) {
          const list = await scheduleService.getSchedulesByDate(date);
          sendJson(res, 200, { success: true, data: list });
          return;
        }
        const start = reqUrl.searchParams.get('start');
        const end = reqUrl.searchParams.get('end');
        const priority = reqUrl.searchParams.get('priority') as
          | 'low'
          | 'medium'
          | 'high'
          | null;
        const search = reqUrl.searchParams.get('search') || undefined;
        const filters: Record<string, any> = {};
        if (start && end) filters.dateRange = { start, end };
        if (priority) filters.priority = priority;
        if (search) filters.search = search;
        const list = await scheduleService.getSchedules(
          Object.keys(filters).length ? filters : undefined
        );
        sendJson(res, 200, { success: true, data: list });
        return;
      }
    }

    // /api/schedules/:id 单体
    const match = pathname.match(/^\/api\/schedules\/([^/]+)$/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      if (req.method === 'GET') {
        const schedule = await scheduleService.getScheduleById(id);
        sendJson(res, 200, { success: true, data: schedule });
        return;
      }
      if (req.method === 'PUT') {
        const body = await readBody(req);
        const schedule = await scheduleService.updateSchedule({ id, ...body } as any);
        sendJson(res, 200, { success: true, data: schedule });
        return;
      }
      if (req.method === 'DELETE') {
        await scheduleService.deleteSchedule(id);
        sendJson(res, 200, { success: true });
        return;
      }
    }

    // ===== /api/tasks 任务 =====
    if (pathname === '/api/tasks') {
      if (req.method === 'POST') {
        const body = await readBody(req);
        if (!body.description) {
          sendJson(res, 400, { error: 'description is required' });
          return;
        }
        const task = await taskService.createTask(body as any);
        sendJson(res, 201, { success: true, data: task });
        return;
      }
      if (req.method === 'GET') {
        const status = reqUrl.searchParams.get('status') || undefined;
        const assignee = reqUrl.searchParams.get('assignee') || undefined;
        const search = reqUrl.searchParams.get('search') || undefined;
        const filters: Record<string, any> = {};
        if (status) filters.status = status;
        if (assignee) filters.assignee = assignee;
        if (search) filters.search = search;
        const list = await taskService.findAll(Object.keys(filters).length ? filters : undefined);
        sendJson(res, 200, { success: true, data: list });
        return;
      }
    }

    const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskMatch) {
      const id = decodeURIComponent(taskMatch[1]);
      if (req.method === 'GET') {
        const task = await taskService.findById(id);
        if (!task) {
          sendJson(res, 404, { error: 'Task not found' });
          return;
        }
        sendJson(res, 200, { success: true, data: task });
        return;
      }
      if (req.method === 'PUT') {
        const body = await readBody(req);
        const ok = await taskService.updateTask(id, body as any);
        sendJson(res, 200, { success: true, data: { updated: ok } });
        return;
      }
      if (req.method === 'DELETE') {
        const ok = await taskService.deleteTask(id);
        sendJson(res, 200, { success: true, data: { deleted: ok } });
        return;
      }
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err: any) {
    console.error('[API] Request error:', err);
    sendJson(res, 500, { error: err?.message || 'Internal error' });
  }
}

export function setupApiServer(): void {
  const port = getPort();
  server = createServer((req, res) => {
    handle(req, res).catch((e) => {
      console.error('[API] Unhandled error:', e);
      if (!res.headersSent) sendJson(res, 500, { error: 'Internal error' });
    });
  });

  server.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE') {
      console.warn(
        `[API] Port ${port} already in use — HTTP API NOT started (another TaskHarbor instance running?)`
      );
    } else {
      console.error('[API] Server error:', e);
    }
  });

  server.listen(port, HOST, () => {
    const tokenHint = getToken() ? ' (Bearer token required)' : ' (no auth)';
    console.log(`[API] TaskHarbor HTTP API listening on http://${HOST}:${port}${tokenHint}`);
  });
}

export function closeApiServer(): void {
  if (server) {
    server.close();
    server = null;
    console.log('[API] HTTP API server closed');
  }
}
