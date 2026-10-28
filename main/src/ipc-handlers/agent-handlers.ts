import { ipcMain, app } from 'electron';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

/**
 * Agent 工具信息（供「Agent 接入」页展示）
 */
export interface AgentToolInfo {
  name: string;
  description: string;
  required: string[];
  properties: string[];
}

/**
 * 兜底清单：仅在无法读取内置 MCP server 时使用（例如用户机器没有 node）。
 * 真实来源始终是 tools/mcp-server/server.mjs 的 TOOLS 定义，不要在页面里硬编码维护。
 */
const FALLBACK_TOOLS: AgentToolInfo[] = [
  { name: 'taskharbor_add_schedule', description: '向小湾清单添加一条日程', required: ['title', 'startTime', 'endTime'], properties: [] },
  { name: 'taskharbor_list_schedules', description: '按日期 / 范围 / 关键词列出日程', required: [], properties: [] },
  { name: 'taskharbor_update_schedule', description: '按 ID 修改日程（只改传入字段）', required: ['id'], properties: [] },
  { name: 'taskharbor_delete_schedule', description: '删除一条日程', required: ['id'], properties: [] },
  { name: 'taskharbor_add_task', description: '向小湾清单添加一条任务', required: ['description'], properties: [] },
  { name: 'taskharbor_list_tasks', description: '按状态 / 责任人 / 关键词列出任务', required: [], properties: [] },
  { name: 'taskharbor_update_task', description: '按 ID 修改任务（状态 / 进度 / 责任人等）', required: ['id'], properties: [] },
  { name: 'taskharbor_delete_task', description: '删除一条任务', required: ['id'], properties: [] },
];

/** MCP server 路径：打包后随安装包内置到 resources/mcp-server，开发时指向源码 */
function resolveMcpServerPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'mcp-server', 'server.mjs')
    : path.join(app.getAppPath(), 'tools', 'mcp-server', 'server.mjs');
}

/** 从 server.mjs 源码里正则兜底提取工具名（拿不到描述时用兜底描述补齐） */
function extractToolNamesFromFile(file: string): AgentToolInfo[] {
  const source = readFileSync(file, 'utf8');
  const names = new Set<string>();
  const re = /name:\s*'(taskharbor_[a-zA-Z0-9_]+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    names.add(m[1]);
  }
  if (names.size === 0) return [];
  const descMap = new Map(FALLBACK_TOOLS.map((t) => [t.name, t.description]));
  return [...names].map((name) => ({
    name,
    description: descMap.get(name) || '（详见 MCP server 定义）',
    required: FALLBACK_TOOLS.find((t) => t.name === name)?.required ?? [],
    properties: [],
  }));
}

export function setupAgentHandlers() {
  /**
   * 读取内置 MCP server 的真实工具清单（单一数据源）
   * 优先级：node 执行 server.mjs --list-tools > 解析源码文件 > 内置兜底清单
   */
  ipcMain.handle('agent:listTools', async () => {
    const serverPath = resolveMcpServerPath();

    // 1) 直接执行 server 的 CLI 模式，拿到权威清单（新增工具后无需改任何前端代码）
    try {
      const res = spawnSync('node', [serverPath, '--list-tools'], {
        encoding: 'utf8',
        timeout: 8000,
        windowsHide: true,
      });
      if (!res.error && res.status === 0 && res.stdout) {
        const parsed = JSON.parse(res.stdout.trim());
        if (parsed && Array.isArray(parsed.tools)) {
          return {
            success: true,
            source: 'server' as const,
            serverPath,
            serverVersion: parsed.serverInfo?.version,
            tools: parsed.tools as AgentToolInfo[],
          };
        }
      }
    } catch (e: any) {
      console.warn('[Agent] list tools via CLI failed:', e?.message || e);
    }

    // 2) 没有 node 或执行失败时，退化为解析源码文件
    try {
      if (existsSync(serverPath)) {
        const tools = extractToolNamesFromFile(serverPath);
        if (tools.length > 0) {
          return {
            success: true,
            source: 'file' as const,
            serverPath,
            tools,
          };
        }
      }
    } catch (e: any) {
      console.warn('[Agent] fallback parse server file failed:', e?.message || e);
    }

    // 3) 兜底
    return {
      success: false,
      source: 'fallback' as const,
      serverPath,
      error: '未能读取内置 MCP server 工具清单（可能未安装 Node.js 或文件缺失）',
      tools: FALLBACK_TOOLS,
    };
  });
}
