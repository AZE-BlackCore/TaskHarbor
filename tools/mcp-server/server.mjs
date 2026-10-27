#!/usr/bin/env node
/**
 * TaskHarbor MCP Server（零依赖）
 * ----------------------------------------------------------------------------
 * 通过 stdio 暴露 MCP 工具，内部调用 TaskHarbor 主进程提供的本地 HTTP API
 * （默认 http://127.0.0.1:18765）。需要 TaskHarbor 正在运行且已启用 HTTP API。
 *
 * 环境变量：
 *   TASKHARBOR_API_PORT  默认 18765
 *   TASKHARBOR_API_TOKEN 若 TaskHarbor 端设置了该 token，则此处必须一致
 *
 * 工具：
 *   taskharbor_add_schedule     添加一条日程
 *   taskharbor_list_schedules   按日期/范围列出日程
 *   taskharbor_delete_schedule  删除一条日程
 *   taskharbor_add_task         添加一条任务
 *   taskharbor_list_tasks       按状态/责任人/关键词列出任务
 *   taskharbor_delete_task      删除一条任务
 */

import process from 'node:process';

const PORT = parseInt(process.env.TASKHARBOR_API_PORT || '18765', 10) || 18765;
const TOKEN = process.env.TASKHARBOR_API_TOKEN || '';
const BASE = `http://127.0.0.1:${PORT}`;

const SCHEDULE_PROPS = {
  title: { type: 'string', description: '日程标题（必填）' },
  startTime: { type: 'string', description: '开始时间，ISO 8601，例如 2026-10-27T09:00:00.000Z（必填）' },
  endTime: { type: 'string', description: '结束时间，ISO 8601（必填）' },
  description: { type: 'string', description: '备注/描述' },
  location: { type: 'string', description: '地点' },
  allDay: { type: 'boolean', description: '是否全天事件，默认 false' },
  color: { type: 'string', description: '颜色十六进制，默认 #3B82F6' },
  priority: { type: 'string', enum: ['low', 'medium', 'high'], description: '优先级，默认 medium' },
  reminder: { type: 'number', description: '提前提醒分钟数，例如 15' },
  repeat: {
    type: 'object',
    description: '重复规则',
    properties: {
      type: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
      interval: { type: 'number', description: '间隔，例如每 2 周填 2' },
      endDate: { type: 'string', description: '重复结束日期 ISO' },
    },
  },
  relatedTaskId: { type: 'string', description: '关联任务 ID' },
};

const TASK_PROPS = {
  description: { type: 'string', description: '任务描述（必填）' },
  module: { type: 'string', description: '所属模块名称' },
  functionModule: { type: 'string', description: '功能模块' },
  status: { type: 'string', description: '状态，如 todo / in_progress / done，默认 todo' },
  assignee: { type: 'string', description: '责任人' },
  startDate: { type: 'string', description: '开始日期 ISO，如 2026-10-27' },
  estimatedEndDate: { type: 'string', description: '预计完成日期 ISO' },
  progress: { type: 'number', description: '进度 0-100，默认 0' },
  issues: { type: 'string', description: '问题与阻塞' },
  notes: { type: 'string', description: '备注' },
};

const TOOLS = [
  {
    name: 'taskharbor_add_schedule',
    description: '向 TaskHarbor 添加一条日程（通过本地 HTTP API）。需要 TaskHarbor 正在运行。',
    inputSchema: {
      type: 'object',
      properties: SCHEDULE_PROPS,
      required: ['title', 'startTime', 'endTime'],
    },
  },
  {
    name: 'taskharbor_list_schedules',
    description: '列出 TaskHarbor 日程。可传 date（某天）或 start+end（范围），或 priority/search 过滤。',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: '某一天，ISO 日期如 2026-10-27' },
        start: { type: 'string', description: '范围起始 ISO' },
        end: { type: 'string', description: '范围结束 ISO' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        search: { type: 'string', description: '关键词搜索（标题/描述/地点）' },
      },
    },
  },
  {
    name: 'taskharbor_delete_schedule',
    description: '按 ID 删除一条 TaskHarbor 日程。',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: '日程 ID' } },
      required: ['id'],
    },
  },
  {
    name: 'taskharbor_add_task',
    description: '向 TaskHarbor 添加一条任务（通过本地 HTTP API）。需要 TaskHarbor 正在运行。',
    inputSchema: {
      type: 'object',
      properties: TASK_PROPS,
      required: ['description'],
    },
  },
  {
    name: 'taskharbor_list_tasks',
    description: '列出 TaskHarbor 任务。可传 status / assignee / search 过滤。',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: '状态过滤，如 todo / in_progress / done' },
        assignee: { type: 'string', description: '责任人过滤' },
        search: { type: 'string', description: '关键词搜索（描述/备注/问题）' },
      },
    },
  },
  {
    name: 'taskharbor_delete_task',
    description: '按 ID 删除一条 TaskHarbor 任务。',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: '任务 ID' } },
      required: ['id'],
    },
  },
];

/** 调用本地 HTTP API */
async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = (data && (data.error || data.raw)) || `HTTP ${res.status}`;
    throw new Error(`TaskHarbor API ${method} ${path} 失败: ${msg}`);
  }
  return data;
}

async function callTool(name, args) {
  switch (name) {
    case 'taskharbor_add_schedule': {
      const result = await api('POST', '/api/schedules', args);
      return {
        content: [{ type: 'text', text: '日程已创建：\n' + JSON.stringify(result.data, null, 2) }],
      };
    }
    case 'taskharbor_list_schedules': {
      const params = new URLSearchParams();
      if (args.date) params.set('date', args.date);
      if (args.start) params.set('start', args.start);
      if (args.end) params.set('end', args.end);
      if (args.priority) params.set('priority', args.priority);
      if (args.search) params.set('search', args.search);
      const qs = params.toString();
      const result = await api('GET', '/api/schedules' + (qs ? `?${qs}` : ''));
      const list = result.data || [];
      return {
        content: [
          {
            type: 'text',
            text: `共 ${list.length} 条日程：\n` + JSON.stringify(list, null, 2),
          },
        ],
      };
    }
    case 'taskharbor_delete_schedule': {
      if (!args.id) throw new Error('缺少 id');
      const result = await api('DELETE', `/api/schedules/${encodeURIComponent(args.id)}`);
      return { content: [{ type: 'text', text: '删除结果：' + JSON.stringify(result) }] };
    }
    case 'taskharbor_add_task': {
      const result = await api('POST', '/api/tasks', args);
      return {
        content: [{ type: 'text', text: '任务已创建：\n' + JSON.stringify(result.data, null, 2) }],
      };
    }
    case 'taskharbor_list_tasks': {
      const params = new URLSearchParams();
      if (args.status) params.set('status', args.status);
      if (args.assignee) params.set('assignee', args.assignee);
      if (args.search) params.set('search', args.search);
      const qs = params.toString();
      const result = await api('GET', '/api/tasks' + (qs ? `?${qs}` : ''));
      const list = result.data || [];
      return {
        content: [
          { type: 'text', text: `共 ${list.length} 条任务：\n` + JSON.stringify(list, null, 2) },
        ],
      };
    }
    case 'taskharbor_delete_task': {
      if (!args.id) throw new Error('缺少 id');
      const result = await api('DELETE', `/api/tasks/${encodeURIComponent(args.id)}`);
      return { content: [{ type: 'text', text: '删除结果：' + JSON.stringify(result) }] };
    }
    default:
      throw new Error(`未知工具: ${name}`);
  }
}

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function handleMessage(msg) {
  const id = msg.id;
  try {
    if (msg.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: msg.params?.protocolVersion || '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'taskharbor-mcp', version: '1.0.0' },
        },
      });
      return;
    }
    if (msg.method === 'notifications/initialized' || msg.method === 'ping') {
      // 通知类，无需回复（ping 部分客户端期望 pong，但标准 MCP ping 不回）
      if (msg.method === 'ping' && id !== undefined) {
        send({ jsonrpc: '2.0', id, result: {} });
      }
      return;
    }
    if (msg.method === 'tools/list') {
      send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
      return;
    }
    if (msg.method === 'tools/call') {
      const { name, arguments: args } = msg.params || {};
      callTool(name, args || {})
        .then((result) => send({ jsonrpc: '2.0', id, result }))
        .catch((err) =>
          send({
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: '错误：' + err.message }], isError: true },
          })
        );
      return;
    }
    // 未知方法
    if (id !== undefined) {
      send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
    }
  } catch (err) {
    if (id !== undefined) {
      send({ jsonrpc: '2.0', id, error: { code: -32603, message: String(err) } });
    }
  }
}

// 逐行解析 stdin（MCP stdio 使用换行分隔的 JSON-RPC 消息）
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      handleMessage(msg);
    } catch (e) {
      process.stderr.write('[taskharbor-mcp] parse error: ' + String(e) + '\n');
    }
  }
});
process.stdin.on('end', () => process.exit(0));

process.stderr.write(`[taskharbor-mcp] started, target ${BASE}\n`);
