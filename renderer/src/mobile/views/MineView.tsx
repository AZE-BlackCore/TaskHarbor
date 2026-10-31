/** 我的：同步面板 + 配对 + 小米保活自检（FR-13）+ 冲突处理 + 关于 */

import { useState } from 'react';
import { useMobileStore } from '../store';
import { MIN_DESKTOP_VERSION, SCHEMA_VERSION, SYNC_TABLES } from '../../platform/schema';

const KEEP_ALIVE_ITEMS = [
  { title: '省电策略设为「无限制」', desc: '设置 → 应用设置 → 应用管理 → 小湾清单 → 省电策略 → 无限制（最关键）' },
  { title: '开启自启动', desc: '同一页面的「自启动」开关打开，进程被回收后可自行恢复' },
  { title: '多任务加锁', desc: '最近任务列表中下拉小湾清单卡片加锁，防止一键清理' },
  { title: '允许通知', desc: '通知权限必须开启，否则提醒失效且后台存活概率显著下降' },
];

export default function MineView() {
  const pairing = useMobileStore((s) => s.pairing);
  const pending = useMobileStore((s) => s.pending);
  const conflicts = useMobileStore((s) => s.conflicts);
  const lastSyncAt = useMobileStore((s) => s.lastSyncAt);
  const deviceId = useMobileStore((s) => s.deviceId);
  const status = useMobileStore((s) => s.status);
  const lastErrorHint = useMobileStore((s) => s.lastErrorHint);
  const syncNow = useMobileStore((s) => s.syncNow);
  const pair = useMobileStore((s) => s.pair);
  const unpair = useMobileStore((s) => s.unpair);
  const conflictList = useMobileStore((s) => s.conflictList);
  const listConflicts = useMobileStore((s) => s.listConflicts);

  const [baseUrl, setBaseUrl] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const doPair = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await pair(baseUrl, pin);
      setMsg('配对成功，已开始首次同步');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const openAppSettings = () => {
    // 交由系统处理 intent：跳转到本应用的系统设置详情页
    const url =
      'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;package=com.taskharbor.mobile;end';
    const win = window.open(url, '_system');
    if (!win) {
      setMsg('无法自动跳转，请手动在「设置 → 应用设置 → 应用管理」中找到小湾清单');
    }
  };

  return (
    <div>
      <div className="cove-card">
        <div className="mb-2 text-sm font-bold text-slate-800">同步</div>
        <div className="space-y-1 text-xs text-slate-500">
          <div>连接状态：{pairing ? pairing.baseUrl : '未配对'}</div>
          <div>上次同步：{lastSyncAt ? new Date(lastSyncAt).toLocaleString() : '从未同步'}</div>
          <div>待同步条目：{pending}</div>
          <div>未处理冲突：{conflicts}</div>
        </div>
        <button className="cove-btn mt-3" onClick={() => void syncNow()} disabled={!pairing}>
          {status === 'syncing' ? '同步中…' : '立即同步'}
        </button>
        {lastErrorHint && (
          <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
            修复建议：{lastErrorHint}
          </div>
        )}
      </div>

      <div className="cove-card">
        <div className="mb-2 text-sm font-bold text-slate-800">配对电脑</div>
        <input
          className="cove-input"
          placeholder="电脑地址，如 http://192.168.1.23:18766"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
        <input
          className="cove-input"
          placeholder="电脑端显示的 6 位配对码"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        <button className="cove-btn" onClick={doPair} disabled={busy}>
          {busy ? '配对中…' : '配对并同步'}
        </button>
        {pairing && (
          <button
            className="cove-btn ghost mt-2"
            onClick={async () => {
              await unpair();
              setMsg('已解除配对');
            }}
          >
            解除配对
          </button>
        )}
        {msg && <div className="mt-2 text-xs text-slate-600">{msg}</div>}
        <div className="mt-2 text-[11px] text-slate-400">
          配对需在电脑端「同步与设备」页开启同步并生成配对码；两端须在同一 WiFi 且路由器未开启 AP 隔离。
        </div>
      </div>

      <div className="cove-card">
        <div className="mb-2 text-sm font-bold text-slate-800">小米 / HyperOS 保活自检</div>
        {KEEP_ALIVE_ITEMS.map((it) => (
          <div key={it.title} className="mb-2">
            <div className="text-xs font-semibold text-slate-700">· {it.title}</div>
            <div className="text-[11px] text-slate-400">{it.desc}</div>
          </div>
        ))}
        <button className="cove-btn ghost" onClick={() => void openAppSettings()}>
          前往系统设置
        </button>
        <div className="mt-2 text-[11px] text-amber-600">
          即使全部设置完成，系统 Doze 仍可能推迟后台同步，请以「上次同步时间」为准。
        </div>
      </div>

      <div className="cove-card">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800">冲突（{conflicts}）</span>
          <button className="text-xs text-blue-600" onClick={() => void listConflicts()}>
            刷新
          </button>
        </div>
        {conflictList.length === 0 && (
          <div className="text-xs text-slate-400">暂无未处理冲突。</div>
        )}
        {conflictList.map((c) => (
          <div key={c.id} className="mb-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
            {c.tableName} · {c.recordId.slice(0, 12)}… · 远端版本 {c.remoteUpdatedAt?.slice(0, 19)}
          </div>
        ))}
      </div>

      <div className="cove-card text-xs text-slate-500">
        <div className="mb-1 font-bold text-slate-800">关于</div>
        <div>移动端 v0.1.0 · schema v{SCHEMA_VERSION}</div>
        <div>要求桌面端 ≥ v{MIN_DESKTOP_VERSION}</div>
        <div>同步表：{SYNC_TABLES.length} 张</div>
        <div className="mt-1 break-all text-[11px] text-slate-400">设备 ID：{deviceId ?? '-'}</div>
      </div>
    </div>
  );
}
