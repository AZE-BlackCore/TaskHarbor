/** 同步状态常驻标识（FR-10：不隐藏延迟，失败必须给出可执行动作） */

import { useMobileStore } from '../store';

function relativeTime(iso: string | null): string {
  if (!iso) return '从未同步';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return '刚刚同步';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前同步`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前同步`;
  return `${Math.floor(diff / 86_400_000)} 天前同步`;
}

export default function SyncBadge() {
  const status = useMobileStore((s) => s.status);
  const pending = useMobileStore((s) => s.pending);
  const lastSyncAt = useMobileStore((s) => s.lastSyncAt);
  const pairing = useMobileStore((s) => s.pairing);
  const syncNow = useMobileStore((s) => s.syncNow);

  const map: Record<string, { color: string; text: string }> = {
    idle: { color: pairing ? '#0e9f6e' : '#94a3b8', text: pairing ? relativeTime(lastSyncAt) : '未配对' },
    syncing: { color: '#3b82f6', text: '同步中…' },
    ok: { color: '#0e9f6e', text: relativeTime(lastSyncAt) },
    offline: { color: '#f59e0b', text: `离线 · ${pending} 条待同步` },
    error: { color: '#ef4444', text: '同步异常' },
    unpaired: { color: '#94a3b8', text: '未配对' },
  };
  const view = map[status] ?? map.idle;

  return (
    <button
      onClick={() => void syncNow()}
      className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm ring-1 ring-slate-200"
    >
      <span className="cove-status-dot" style={{ background: view.color }} />
      <span>{view.text}</span>
    </button>
  );
}
