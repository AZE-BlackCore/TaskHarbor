import { CheckSquare, CalendarDays, Calendar, User } from 'lucide-react';
import { useState } from 'react';
import { useMobileStore } from './store';
import { resetRepository } from '../platform/runtime';
import SyncBadge from './components/SyncBadge';
import CreateSheet from './components/CreateSheet';
import TodayView from './views/TodayView';
import TasksView from './views/TasksView';
import ScheduleView from './views/ScheduleView';
import MineView from './views/MineView';
import TaskDetail from './views/TaskDetail';
import ScheduleDetail from './views/ScheduleDetail';

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
  const [detail, setDetail] = useState<{ type: 'task' | 'schedule'; id: string } | null>(null);
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
              本地数据仍完好，可先重试；连续失败再重置本地缓存（仅清本机副本，不影响电脑端数据）。
            </div>
            <div className="mt-3 flex gap-2">
              <button
                className="cove-btn ghost flex-1"
                style={{ width: 'auto' }}
                onClick={() => {
                  useMobileStore.setState({ initError: null, ready: false });
                  void useMobileStore.getState().init();
                }}
              >
                重试
              </button>
              <button
                className="cove-btn ghost flex-1"
                style={{ width: 'auto' }}
                onClick={async () => {
                  await resetRepository();
                  useMobileStore.setState({ initError: null, ready: false });
                  void useMobileStore.getState().init();
                }}
              >
                重置本地缓存
              </button>
            </div>
          </div>
        )}
        {ready && tab === 'today' && (
          <TodayView
            onOpenTask={(id) => setDetail({ type: 'task', id })}
            onOpenSchedule={(id) => setDetail({ type: 'schedule', id })}
          />
        )}
        {ready && tab === 'tasks' && (
          <TasksView onOpenTask={(id) => setDetail({ type: 'task', id })} />
        )}
        {ready && tab === 'schedule' && (
          <ScheduleView
            onQuickCreate={() => setSheet('schedule')}
            onOpenSchedule={(id) => setDetail({ type: 'schedule', id })}
          />
        )}
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

      {detail?.type === 'task' && (
        <TaskDetail taskId={detail.id} onClose={() => setDetail(null)} />
      )}
      {detail?.type === 'schedule' && (
        <ScheduleDetail scheduleId={detail.id} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}
