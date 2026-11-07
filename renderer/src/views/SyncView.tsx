/**
 * 桌面端「同步与设备」页（Hub 控制台）
 * 安全默认：同步默认关闭；开启后仅在局域网监听并绑定 WiFi 网卡地址
 *
 * v1.15.0：新增「同步历史」——按会话聚合每次同步，记录方向（上行/下行/配对）
 * 与内容摘要（表名、操作、条数、记录 ID）。脱敏红线：不记录任务标题与正文。
 */

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  History,
  Link2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Wifi,
} from 'lucide-react';

interface HubStatus {
  running: boolean;
  host: string | null;
  port: number;
  pin: string | null;
  hubId: string;
  pairedDevices: Array<{ id: string; name: string; pairedAt: string; lastSeenAt: string }>;
  lastError: string | null;
  candidates: Array<{ address: string; iface: string }>;
}

/** 与 main/src/services/syncServer.ts 的 SyncHistoryRow 对齐 */
interface HistoryRow {
  id: string;
  sessionId: string;
  occurredAt: string;
  direction: 'up' | 'down' | 'pair';
  operation: 'push' | 'pull' | 'pair';
  source: string | null;
  deviceName: string | null;
  tableName: string | null;
  itemCount: number;
  breakdown: string | null;
  status: 'ok' | 'partial' | 'error';
  detail: string | null;
}

interface HistoryGroup {
  sessionId: string;
  occurredAt: string;
  rows: HistoryRow[];
  up: number;
  down: number;
  pairs: number;
  tables: string[];
  source: string | null;
  deviceName: string | null;
  hasError: boolean;
}

interface Breakdown {
  tables?: Record<string, { upsert?: number; delete?: number }>;
  ops?: Record<string, number>;
  sampleIds?: string[];
  hasMore?: boolean;
}

const api = (window as any).electronAPI;

const DIR_STYLE: Record<HistoryRow['direction'], { short: string; label: string; cls: string }> = {
  up: {
    short: '上行',
    label: '手机 → 电脑',
    cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
  },
  down: {
    short: '下行',
    label: '电脑 → 手机',
    cls: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-200',
  },
  pair: {
    short: '配对',
    label: '设备配对',
    cls: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200',
  },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return iso || '-';
  return d.toLocaleString('zh-CN', { hour12: false });
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('zh-CN', { hour12: false });
}

function parseBreakdown(raw: string | null): Breakdown {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as Breakdown;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

/** 按 sessionId 聚合为「一次同步」；组内按时间正序便于阅读 */
function groupHistory(rows: HistoryRow[]): HistoryGroup[] {
  const map = new Map<string, HistoryRow[]>();
  for (const r of rows) {
    const list = map.get(r.sessionId) ?? [];
    list.push(r);
    map.set(r.sessionId, list);
  }
  const groups: HistoryGroup[] = [];
  for (const [sessionId, list] of map) {
    const sorted = [...list].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    let up = 0;
    let down = 0;
    let pairs = 0;
    let hasError = false;
    let deviceName: string | null = null;
    const tableSet = new Set<string>();
    for (const r of sorted) {
      if (r.direction === 'up') up += Number(r.itemCount ?? 0);
      else if (r.direction === 'down') down += Number(r.itemCount ?? 0);
      else pairs += 1;
      if (r.status !== 'ok') hasError = true;
      if (r.deviceName && !deviceName) deviceName = r.deviceName;
      if (r.tableName) tableSet.add(r.tableName);
      const bd = parseBreakdown(r.breakdown);
      if (bd.tables) Object.keys(bd.tables).forEach((t) => tableSet.add(t));
    }
    groups.push({
      sessionId,
      occurredAt: sorted[sorted.length - 1]?.occurredAt ?? '',
      rows: sorted,
      up,
      down,
      pairs,
      tables: [...tableSet],
      source: sorted[0]?.source ?? null,
      deviceName,
      hasError,
    });
  }
  groups.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return groups;
}

/** 把 breakdown 里的表/操作统计渲染成一行简短摘要 */
function breakdownText(row: HistoryRow): string {
  const bd = parseBreakdown(row.breakdown);
  if (bd.tables) {
    return Object.entries(bd.tables)
      .map(([t, ops]) => {
        const parts: string[] = [];
        if (ops?.upsert) parts.push(`新增/更新 ${ops.upsert}`);
        if (ops?.delete) parts.push(`删除 ${ops.delete}`);
        return `${t}（${parts.join('、') || '0'}）`;
      })
      .join('；');
  }
  if (bd.ops) {
    return Object.entries(bd.ops)
      .map(([op, n]) => `${op === 'delete' ? '删除' : '新增/更新'} ${n}`)
      .join('、');
  }
  return '';
}

export function SyncView() {
  const [status, setStatus] = useState<HubStatus | null>(null);
  const [qr, setQr] = useState<string>('');
  const [host, setHost] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [clearArmed, setClearArmed] = useState(false);

  const refresh = useCallback(async () => {
    if (!api?.getSyncStatus) {
      setError('当前环境不支持同步（需在桌面端运行）');
      return;
    }
    const s = await api.getSyncStatus();
    setStatus(s);
    if (s.candidates?.length && !host) setHost(s.candidates[0].address);
  }, [host]);

  const loadHistory = useCallback(async () => {
    if (!api?.getSyncHistory) return;
    try {
      const rows = await api.getSyncHistory(200);
      setHistory(Array.isArray(rows) ? rows : []);
      setHistoryError(null);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 历史每 5 秒自动刷新（同步由手机端发起，桌面侧无推送通道）
  useEffect(() => {
    void loadHistory();
    const timer = setInterval(() => void loadHistory(), 5000);
    return () => clearInterval(timer);
  }, [loadHistory]);

  useEffect(() => {
    if (!status?.running || !status.host || !status.pin) {
      setQr('');
      return;
    }
    const payload = JSON.stringify({
      h: status.host,
      p: status.port,
      n: status.pin,
      v: '1',
    });
    QRCode.toDataURL(payload, { width: 240, margin: 1 })
      .then(setQr)
      .catch(() => setQr(''));
  }, [status?.running, status?.host, status?.port, status?.pin]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.startSync(host || undefined);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await api.stopSync();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const rotate = async () => {
    await api.rotateSyncPin();
    await refresh();
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 清空历史需两次确认，避免误删（5 秒后自动复位）
  const doClearHistory = async () => {
    if (!clearArmed) {
      setClearArmed(true);
      setTimeout(() => setClearArmed(false), 5000);
      return;
    }
    setClearArmed(false);
    setHistoryBusy(true);
    try {
      await api.clearSyncHistory();
      await loadHistory();
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : String(e));
    } finally {
      setHistoryBusy(false);
    }
  };

  const groups = groupHistory(history);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Wifi className="h-5 w-5 text-blue-600" />
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">同步与设备</h1>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            同步中枢（Hub）
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              status?.running
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {status?.running ? `监听中 ${status.host}:${status.port}` : '已关闭（默认）'}
          </span>
        </div>

        {!status?.running ? (
          <>
            <div className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              开启后仅在本机局域网内监听，绑定所选网卡地址，不会绑定 0.0.0.0。
            </div>
            <select
              className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            >
              {(status?.candidates ?? []).map((c) => (
                <option key={`${c.iface}-${c.address}`} value={c.address}>
                  {c.address} · {c.iface}
                </option>
              ))}
            </select>
            <button
              onClick={start}
              disabled={busy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? '开启中…' : '开启同步并生成配对码'}
            </button>
          </>
        ) : (
          <div className="grid gap-4 md:grid-cols-[auto,1fr]">
            <div>
              {qr ? (
                <img src={qr} alt="配对二维码" className="h-60 w-60 rounded-lg border p-2" />
              ) : (
                <div className="h-60 w-60 animate-pulse rounded-lg bg-slate-100" />
              )}
            </div>
            <div>
              <div className="mb-2 text-sm text-slate-600 dark:text-slate-300">
                在手机端「我的 → 配对电脑」填写：
                <div className="mt-1 rounded bg-slate-100 px-2 py-1 font-mono text-xs dark:bg-slate-900 dark:text-slate-200">
                  http://{status.host}:{status.port}
                </div>
              </div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-300">配对码</span>
                <span className="rounded bg-amber-100 px-3 py-1 font-mono text-lg font-bold tracking-widest text-amber-700">
                  {status.pin}
                </span>
                <button
                  onClick={rotate}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
                >
                  <RefreshCw className="h-3 w-3" />
                  重新生成
                </button>
              </div>
              <div className="text-xs text-slate-400">
                配对码 10 分钟内有效，错误 3 次自动失效并重生成。
              </div>
              <button
                onClick={stop}
                className="mt-3 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100"
              >
                停止监听
              </button>
            </div>
          </div>
        )}
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        {status?.lastError && (
          <div className="mt-2 text-sm text-amber-600">最近错误：{status.lastError}</div>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-2 flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
          <Smartphone className="h-4 w-4" />
          已配对设备（{status?.pairedDevices?.length ?? 0}）
        </div>
        {(status?.pairedDevices ?? []).length === 0 && (
          <div className="text-sm text-slate-400">尚无设备配对。</div>
        )}
        {(status?.pairedDevices ?? []).map((d) => (
          <div key={d.id} className="border-t border-slate-100 py-2 text-sm dark:border-slate-700">
            <div className="text-slate-700 dark:text-slate-200">{d.name}</div>
            <div className="text-xs text-slate-400">
              配对于 {new Date(d.pairedAt).toLocaleString()} · 最近 {new Date(d.lastSeenAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* 同步历史（v1.15.0） */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
            <History className="h-4 w-4" />
            同步历史（{groups.length}）
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadHistory()}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
            >
              <RefreshCw className="h-3 w-3" />
              刷新
            </button>
            <button
              onClick={() => void doClearHistory()}
              disabled={historyBusy || groups.length === 0}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs disabled:opacity-40 ${
                clearArmed
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              <Trash2 className="h-3 w-3" />
              {clearArmed ? '再点一次确认清空' : '清空历史'}
            </button>
          </div>
        </div>
        <div className="mb-3 text-xs text-slate-400">
          按会话聚合每次同步，记录方向与内容摘要（最近 200 条流水，每 5 秒自动刷新）。
          按脱敏约定仅记录表名 / 记录 ID / 操作与条数，不记录任务标题与正文。
        </div>

        {historyError && (
          <div className="mb-2 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-200">
            读取历史失败：{historyError}
          </div>
        )}
        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
            暂无同步记录。开启同步后，手机端每次同步的内容与方向会记录在此。
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => {
              const open = expanded.has(g.sessionId);
              return (
                <div
                  key={g.sessionId}
                  className="rounded-lg border border-slate-100 dark:border-slate-700"
                >
                  <button
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40"
                    onClick={() => toggleExpand(g.sessionId)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {open ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                          {formatTime(g.occurredAt)}
                        </span>
                        {g.hasError && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-950 dark:text-amber-200">
                            部分失败
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {g.up > 0 && (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                            <ArrowUp className="h-3 w-3" />
                            上行 {g.up} 条
                          </span>
                        )}
                        {g.down > 0 && (
                          <span className="inline-flex items-center gap-1 rounded bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-200">
                            <ArrowDown className="h-3 w-3" />
                            下行 {g.down} 条
                          </span>
                        )}
                        {g.pairs > 0 && (
                          <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-950 dark:text-green-200">
                            <Link2 className="h-3 w-3" />
                            配对 {g.pairs}
                          </span>
                        )}
                        {g.up === 0 && g.down === 0 && g.pairs === 0 && (
                          <span className="text-[11px] text-slate-400">无变更</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-5 text-[11px] text-slate-400">
                      <span>来源 {g.deviceName ?? g.source ?? '未知设备'}</span>
                      <span>·</span>
                      <span>{g.rows.length} 次请求</span>
                      {g.tables.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="truncate">涉及 {g.tables.join('、')}</span>
                        </>
                      )}
                    </div>
                  </button>

                  {open && (
                    <div className="space-y-2 border-t border-slate-100 px-3 py-2 dark:border-slate-700">
                      {g.rows.map((r) => {
                        const dir = DIR_STYLE[r.direction] ?? DIR_STYLE.pair;
                        const bd = parseBreakdown(r.breakdown);
                        const summary = breakdownText(r);
                        return (
                          <div key={r.id} className="flex items-start gap-2 text-xs">
                            <span
                              className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${dir.cls}`}
                              title={dir.label}
                            >
                              {dir.short}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-slate-700 dark:text-slate-200">
                                {r.detail ?? `${r.operation} ${r.tableName ?? ''}`}
                                {r.itemCount > 0 && (
                                  <span className="ml-1 text-slate-400">· {r.itemCount} 条</span>
                                )}
                                {r.status !== 'ok' && (
                                  <span className="ml-1 text-amber-600">· {r.status}</span>
                                )}
                              </div>
                              {summary && (
                                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  {summary}
                                  {bd.hasMore ? '（还有下一页）' : ''}
                                </div>
                              )}
                              {bd.sampleIds && bd.sampleIds.length > 0 && (
                                <div className="mt-0.5 break-all font-mono text-[10px] text-slate-400">
                                  ID: {bd.sampleIds.slice(0, 6).join(', ')}
                                  {bd.sampleIds.length > 6 ? ' …' : ''}
                                </div>
                              )}
                            </div>
                            <span className="shrink-0 font-mono text-[10px] text-slate-400">
                              {formatClock(r.occurredAt)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-4 w-4" />
          安全与排障
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs">
          <li>同步默认关闭，退出后不残留监听端口；仅在你主动开启期间可访问。</li>
          <li>手机与电脑须在同一 WiFi；若路由器开启「AP 隔离」将无法连接。</li>
          <li>建议为电脑在路由器上设置静态 IP，避免 DHCP 变更导致配对失效。</li>
          <li>同步历史为桌面本地记录，不参与设备间同步；清空仅影响本页展示。</li>
          <li>阶段一为局域网明文传输，公共网络下请谨慎开启。</li>
        </ul>
      </div>
    </div>
  );
}

export default SyncView;
