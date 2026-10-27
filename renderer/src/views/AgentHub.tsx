import { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Server,
  Plug,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

/** 可复制按钮：成功写入剪贴板后短暂显示「已复制」 */
function CopyButton({ text, label = '复制' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('insecure');
      }
    } catch {
      // 降级方案（Electron 非安全上下文也能复制）
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={onCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? '已复制' : label}
    </button>
  );
}

interface Health {
  ok: boolean;
  version?: string;
  uptime?: number;
  mcpServerPath?: string;
}

interface AppInfo {
  success?: boolean;
  version?: string;
  isPackaged?: boolean;
  resourcesPath?: string;
  appPath?: string;
  mcpServerPath?: string;
}

const TOOLS: [string, string][] = [
  ['taskharbor_add_schedule', '添加一条日程'],
  ['taskharbor_list_schedules', '按日期 / 范围 / 关键词列出日程'],
  ['taskharbor_delete_schedule', '删除一条日程'],
  ['taskharbor_add_task', '添加一条任务'],
  ['taskharbor_list_tasks', '按状态 / 责任人 / 关键词列出任务'],
  ['taskharbor_delete_task', '删除一条任务'],
];

export function AgentHub() {
  const [port, setPort] = useState('18765');
  const [health, setHealth] = useState<Health | null>(null);
  const [checking, setChecking] = useState(false);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  const check = useCallback(async (p: string) => {
    setChecking(true);
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 3000);
      const res = await fetch(`http://127.0.0.1:${p}/api/health`, {
        signal: ctl.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        setHealth({
          ok: true,
          version: data.version,
          uptime: data.uptime,
          mcpServerPath: data.mcpServerPath,
        });
      } else {
        setHealth({ ok: false });
      }
    } catch {
      setHealth({ ok: false });
    } finally {
      setChecking(false);
    }
  }, []);

  // 挂载后自动检测，并每 15s 轮询一次
  useEffect(() => {
    const p = port.trim() || '18765';
    check(p);
    const id = setInterval(() => check(p), 15000);
    return () => clearInterval(id);
  }, [port, check]);

  // 挂载时直接经 IPC 读取真实安装目录（不依赖 HTTP API 是否就绪）
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.getAppInfo) {
      api
        .getAppInfo()
        .then((info: AppInfo) => setAppInfo(info || null))
        .catch(() => setAppInfo(null));
    }
  }, []);

  const effectivePort = port.trim() || '18765';
  const base = `http://127.0.0.1:${effectivePort}`;

  // MCP server 路径：优先用 IPC 返回的真实安装目录（最可靠），其次用 API 健康检查，最后给占位
  const resolvedMcpPath =
    appInfo?.mcpServerPath ||
    health?.mcpServerPath ||
    '<TaskHarbor安装目录>/resources/mcp-server/server.mjs';
  const mcpJson = JSON.stringify(
    {
      mcpServers: {
        taskharbor: {
          command: 'node',
          args: [resolvedMcpPath],
          env: { TASKHARBOR_API_PORT: effectivePort },
        },
      },
    },
    null,
    2
  );

  const curlSchedule = `curl -X POST ${base}/api/schedules \\
  -H "Content-Type: application/json" \\
  -d '{"title":"团队周会","startTime":"2026-10-28T01:00:00.000Z","endTime":"2026-10-28T02:00:00.000Z","location":"线上"}'`;

  const curlTask = `curl -X POST ${base}/api/tasks \\
  -H "Content-Type: application/json" \\
  -d '{"description":"完成 Agent 接入面板","status":"in_progress","assignee":"WorkBuddy"}'`;

  const fmtUptime = (s?: number) => {
    if (s == null) return '—';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m} 分 ${sec} 秒`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white shadow-sm">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Agent 接入</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            让 WorkBuddy / AI Agent / 脚本通过本地 API 与 MCP 写入任务与日程
          </p>
        </div>
      </div>

      {/* 连接状态 */}
      <section className="p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Plug className="w-5 h-5 text-teal-500" />
          连接状态
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">API 端口</span>
            <input
              type="text"
              value={port}
              onChange={(e) => setPort(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="18765"
              className="w-24 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {health?.ok ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              API 在线
            </span>
          ) : checking ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              检测中…
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
              <AlertCircle className="w-4 h-4" />
              未连接
            </span>
          )}

          <button
            onClick={() => check(effectivePort)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重新检测
          </button>
        </div>

        {health?.ok && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 bg-white dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">应用版本</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">v{health.version}</p>
            </div>
            <div className="p-3 bg-white dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">API 运行时长</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {fmtUptime(health.uptime)}
              </p>
            </div>
          </div>
        )}
        {!health?.ok && !checking && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            提示：请确认 TaskHarbor 已启动且本地 HTTP API 已启用（默认监听 127.0.0.1:18765）。
          </p>
        )}
      </section>

      {/* 本地 API 信息 */}
      <section className="p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-teal-500" />
          本地 API
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <code className="px-3 py-2 text-sm font-mono rounded-md bg-gray-900 dark:bg-black/40 text-gray-100 break-all">
            {base}
          </code>
          <CopyButton text={base} label="复制地址" />
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          仅监听 127.0.0.1（本机回环），不暴露到局域网。可用 curl / 脚本 / MCP 直接调用：
        </p>
        <ul className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400 list-disc list-inside">
          <li>GET /api/health — 健康检查</li>
          <li>POST /api/schedules · GET /api/schedules · GET/PUT/DELETE /api/schedules/:id</li>
          <li>POST /api/tasks · GET /api/tasks · GET/PUT/DELETE /api/tasks/:id</li>
        </ul>
      </section>

      {/* MCP 配置 */}
      <section className="p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Plug className="w-5 h-5 text-teal-500" />
          MCP 配置（WorkBuddy / Claude 等）
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          在 AI 客户端的自定义 MCP 配置中加入以下内容，即可让 Agent 直接读写 TaskHarbor：
        </p>
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">~/.workbuddy/mcp.json（或对应客户端配置）</span>
          <CopyButton text={mcpJson} label="复制配置" />
        </div>
        <pre className="p-3 rounded-md bg-gray-900 dark:bg-black/40 text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre">
{mcpJson}
        </pre>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          说明：<code className="font-mono">server.mjs</code> 已随安装包内置，上方配置中的路径已自动指向安装目录的{' '}
          <code className="font-mono">resources/mcp-server/server.mjs</code>，无需手动替换。
          若显示占位路径，请确认 TaskHarbor 已启动后点「重新检测」。添加后需在连接器管理中点 <strong>Trust</strong> 启用。
        </p>

        <h3 className="mt-5 mb-2 text-sm font-semibold text-gray-900 dark:text-white">可用工具</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TOOLS.map(([name, desc]) => (
            <div
              key={name}
              className="p-2.5 bg-white dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <p className="text-xs font-mono font-semibold text-teal-600 dark:text-teal-400">{name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 快速指令 */}
      <section className="p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-teal-500" />
          快速指令（curl 示例）
        </h2>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">创建日程</span>
            <CopyButton text={curlSchedule} />
          </div>
          <pre className="p-3 rounded-md bg-gray-900 dark:bg-black/40 text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre">
{curlSchedule}
          </pre>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">创建任务</span>
            <CopyButton text={curlTask} />
          </div>
          <pre className="p-3 rounded-md bg-gray-900 dark:bg-black/40 text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre">
{curlTask}
          </pre>
        </div>
      </section>

      <p className="text-xs text-center text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5">
        <ExternalLink className="w-3.5 h-3.5" />
        Agent 接入通道自 v1.4.0 起提供，所有写入均落盘到本机 TaskHarbor 数据库
      </p>
    </div>
  );
}
