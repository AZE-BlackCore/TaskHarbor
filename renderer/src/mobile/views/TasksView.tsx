/** 任务：列表 + 状态筛选 + 勾选完成（移动端为单列，长按多选为后续增强） */

import { useMemo, useState } from 'react';
import { useMobileStore } from '../store';
import type { Task } from '../../../../core/src/domain/types';

const FILTERS: Array<{ key: string; label: string; match: (t: Task) => boolean }> = [
  { key: 'all', label: '全部', match: () => true },
  { key: 'todo', label: '待办', match: (t) => t.status === 'todo' },
  { key: 'doing', label: '进行中', match: (t) => t.status === 'in-progress' },
  { key: 'done', label: '已完成', match: (t) => t.status === 'done' },
];

export default function TasksView() {
  const tasks = useMobileStore((s) => s.tasks);
  const setTaskStatus = useMobileStore((s) => s.setTaskStatus);
  const [filter, setFilter] = useState('all');
  const [keyword, setKeyword] = useState('');

  const list = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
    return tasks.filter((t) => f.match(t) && (!keyword || t.description.includes(keyword)));
  }, [tasks, filter, keyword]);

  return (
    <div>
      <input
        className="cove-input"
        placeholder="搜索任务"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <div className="mb-3 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              filter === f.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <div className="cove-card text-sm text-slate-400">
          没有符合条件的任务。离线也能新建，联网后会自动同步。
        </div>
      )}

      {list.map((t) => (
        <div key={t.id} className="cove-card">
          <div className="flex items-start gap-3">
            <button
              onClick={() => void setTaskStatus(t.id, t.status === 'done' ? 'todo' : 'done')}
              className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${
                t.status === 'done' ? 'border-green-500 bg-green-500' : 'border-slate-300'
              }`}
              aria-label="切换完成"
            />
            <div className="min-w-0 flex-1">
              <div
                className={`text-sm ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}
              >
                {t.description}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                <span className="cove-badge bg-slate-100">
                  {{ todo: '待办', 'in-progress': '进行中', review: '评审', done: '已完成', blocked: '阻塞' }[t.status]}
                </span>
                <span>{t.progress}%</span>
                {t.estimatedEndDate && <span>截止 {t.estimatedEndDate.slice(0, 10)}</span>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
