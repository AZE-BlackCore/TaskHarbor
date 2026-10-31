import { CheckSquare, CalendarDays, Calendar, User } from 'lucide-react';
import { useState } from 'react';
import { useMobileStore } from './store';
import SyncBadge from './components/SyncBadge';
import CreateSheet from './components/CreateSheet';
import TodayView from './views/TodayView';
import TasksView from './views/TasksView';
import ScheduleView from './views/ScheduleView';
import MineView from './views/MineView';

export type TabKey = 'today' | 'tasks' | 'schedule' | 'mine';

const TABS: Array<{ key: TabKey; label: string; icon: typeof CheckSquare }> = [
  { key: 'today', label: '今日', icon: CalendarDays },
  { key: 'tasks', label: '任务', icon: CheckSquare },
  { key: 'schedule', label: '日程', icon: Calendar },
  { key: 'mine', label: '我的', icon: User },
];

export default function App() {
  const [tab, setTab] = useState<TabKey>('today');
  const [sheet, setSheet] = useState<'task' | 'schedule' | null>(null);
  const ready = useMobileStore((s) => s.ready);
  const initError = useMobileStore((s) => s.initError);

  const title = TABS.find((t) => t.key === tab)?.label ?? '今日';

  return (
    <div className="cove-app">
      <header className="cove-header">
        <div className="text-lg font-bold text-slate-800">{title}</div>
        <SyncBadge />
      </header>

      <main className="cove-content">
        {!ready && <div className="cove-card text-sm text-slate-500">正在打开本地数据库…</div>}
        {initError && (
          <div className="cove-card text-sm text-red-600">
            初始化失败：{initError}
            <div className="mt-1 text-xs text-slate-500">
              请重启应用；若持续失败，请导出诊断包后重置本地数据。
            </div>
          </div>
        )}
        {ready && tab === 'today' && <TodayView />}
        {ready && tab === 'tasks' && <TasksView />}
        {ready && tab === 'schedule' && <ScheduleView onQuickCreate={() => setSheet('schedule')} />}
        {ready && tab === 'mine' && <MineView />}
      </main>

      {(tab === 'today' || tab === 'tasks') && (
        <button
          className="cove-fab"
          aria-label="新建"
          onClick={() => setSheet(tab === 'tasks' ? 'task' : 'task')}
        >
          +
        </button>
      )}

      <nav className="cove-tabbar">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`cove-tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {sheet && <CreateSheet kind={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
