/** 今日：今日日程 + 今日待办 + 逾期高亮（默认落地页，单列纵向流） */

import { AlertTriangle, CalendarDays } from 'lucide-react';
import { useMobileStore } from '../store';

function isSameDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

const PRIORITY_COLOR: Record<string, string> = {
  high: '#dc2626',
  medium: '#d97706',
  low: '#0e9f6e',
};

export default function TodayView({
  onOpenTask,
  onOpenSchedule,
}: {
  onOpenTask: (id: string) => void;
  onOpenSchedule: (id: string) => void;
}) {
  const tasks = useMobileStore((s) => s.tasks);
  const schedules = useMobileStore((s) => s.schedules);
  const setTaskStatus = useMobileStore((s) => s.setTaskStatus);

  const now = new Date();
  const todaySchedules = schedules.filter((s) => isSameDay(s.startTime, now));
  const overdue = tasks.filter(
    (t) => t.status !== 'done' && t.estimatedEndDate && new Date(t.estimatedEndDate) < now
  );
  const todo = tasks.filter((t) => t.status !== 'done' && !overdue.includes(t));

  return (
    <div>
      <div className="cove-section-title">
        <CalendarDays size={13} className="mr-1 inline" />
        今日日程（{todaySchedules.length}）
      </div>
      {todaySchedules.length === 0 && (
        <div className="cove-card text-sm text-slate-400">今天没有日程，去「日程」页添加一条。</div>
      )}
      {todaySchedules.map((s) => (
        <div
          key={s.id}
          className="cove-card cursor-pointer"
          onClick={() => onOpenSchedule(s.id)}
        >
          <div className="text-sm font-semibold text-slate-800">
            {new Date(s.startTime).toTimeString().slice(0, 5)} {s.title}
            {s.completed ? <span className="ml-1 text-xs text-green-600">·已完成</span> : null}
          </div>
          {s.location && <div className="mt-1 text-xs text-slate-500">{s.location}</div>}
        </div>
      ))}

      {overdue.length > 0 && (
        <>
          <div className="cove-section-title text-red-500">
            <AlertTriangle size={13} className="mr-1 inline" />
            逾期（{overdue.length}）
          </div>
          {overdue.map((t) => (
            <div key={t.id} className="cove-card border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void setTaskStatus(t.id, t.status === 'done' ? 'todo' : 'done');
                  }}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-red-300"
                  aria-label="切换完成"
                />
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => onOpenTask(t.id)}
                >
                  <div className="text-sm text-slate-800">{t.description}</div>
                  <div className="mt-1 text-[11px] text-red-500">
                    原定 {t.estimatedEndDate?.slice(0, 10)} · 已逾期
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="cove-section-title">今日待办（{todo.length}）</div>
      {todo.length === 0 && (
        <div className="cove-card text-sm text-slate-400">没有待办，点右下角 + 快速记录。</div>
      )}
      {todo.map((t) => (
        <div key={t.id} className="cove-card flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              void setTaskStatus(t.id, t.status === 'done' ? 'todo' : 'done');
            }}
            className="h-5 w-5 shrink-0 rounded-full border-2"
            style={{ borderColor: PRIORITY_COLOR[t.priority] ?? '#d97706' }}
            aria-label="切换完成"
          />
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onOpenTask(t.id)}>
            <div className="truncate text-sm text-slate-800">{t.description}</div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              {{ high: '高优先级', medium: '中优先级', low: '低优先级' }[t.priority]}
              {t.estimatedEndDate ? ` · 截止 ${t.estimatedEndDate.slice(0, 10)}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
