/** 日程：日视图为主（FR-15），底部半屏表单创建 */

import { Plus } from 'lucide-react';
import { useMobileStore } from '../store';

interface Props {
  onQuickCreate: () => void;
}

export default function ScheduleView({ onQuickCreate }: Props) {
  const schedules = useMobileStore((s) => s.schedules);

  const groups = schedules.reduce<Record<string, typeof schedules>>((acc, s) => {
    const day = s.startTime.slice(0, 10);
    (acc[day] ||= []).push(s);
    return acc;
  }, {});

  const days = Object.keys(groups).sort();

  return (
    <div>
      <button className="cove-btn mb-3" onClick={onQuickCreate}>
        <Plus size={16} className="mr-1 inline" />
        新建日程
      </button>

      {days.length === 0 && (
        <div className="cove-card text-sm text-slate-400">暂无日程记录。</div>
      )}

      {days.map((day) => (
        <div key={day}>
          <div className="cove-section-title">{day}</div>
          {groups[day].map((s) => (
            <div key={s.id} className="cove-card">
              <div className="flex items-center gap-2">
                <span
                  className="cove-status-dot"
                  style={{ background: s.color || '#3B82F6' }}
                />
                <span className="text-sm font-semibold text-slate-800">
                  {s.startTime.slice(11, 16)}–{s.endTime.slice(11, 16)} {s.title}
                </span>
              </div>
              {s.location && <div className="mt-1 text-xs text-slate-500">{s.location}</div>}
              {s.reminder ? (
                <div className="mt-1 text-[11px] text-slate-400">提前 {s.reminder} 分钟提醒</div>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
