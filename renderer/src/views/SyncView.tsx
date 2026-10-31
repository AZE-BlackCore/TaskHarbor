/**
 * 桌面端「同步与设备」页（Hub 控制台）
 * 安全默认：同步默认关闭；开启后仅在局域网监听并绑定 WiFi 网卡地址
 */

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { RefreshCw, Smartphone, ShieldCheck, Wifi } from 'lucide-react';

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

const api = (window as any).electronAPI;

export function SyncView() {
  const [status, setStatus] = useState<HubStatus | null>(null);
  const [qr, setQr] = useState<string>('');
  const [host, setHost] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!api?.getSyncStatus) {
      setError('当前环境不支持同步（需在桌面端运行）');
      return;
    }
    const s = await api.getSyncStatus();
    setStatus(s);
    if (s.candidates?.length && !host) setHost(s.candidates[0].address);
  }, [host]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-4 w-4" />
          安全与排障
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs">
          <li>同步默认关闭，退出后不残留监听端口；仅在你主动开启期间可访问。</li>
          <li>手机与电脑须在同一 WiFi；若路由器开启「AP 隔离」将无法连接。</li>
          <li>建议为电脑在路由器上设置静态 IP，避免 DHCP 变更导致配对失效。</li>
          <li>阶段一为局域网明文传输，公共网络下请谨慎开启。</li>
        </ul>
      </div>
    </div>
  );
}

export default SyncView;
