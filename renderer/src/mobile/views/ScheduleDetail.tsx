/** 日程全屏详情（M3-1 全屏 Detail 信息架构）：查看 + 改标题/时间/地点/提醒/完成 */

import { useEffect, useState } from 'react';
import { useMobileStore } from '../store';
import type { Schedule } from '../../../../core/src/domain/types';

interface Props {
  scheduleId: string;
  onClose: () => void;
}

/** ISO → 本地 datetime-local 输入值（YYYY-MM-DDTHH:mm） */
function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** 本地输入值 → ISO（按本地时区解释） */
function fromLocalInput(v: string): string {
  return new Date(v).toISOString();
}

export default function ScheduleDetail({ scheduleId, onClose }: Props) {
  const schedule = useMobileStore((s) => s.schedules.find((x) => x.id === scheduleId));
  const updateSchedule = useMobileStore((s) => s.updateSchedule);
  const [draft, setDraft] = useState<Schedule | null>(null);

  useEffect(() => {
    if (schedule) setDraft(schedule);
  }, [scheduleId, schedule]);

  if (!schedule || !draft) {
    return (
      <div className="cove-detail">
        <div className="cove-detail-header">
          <button className="cove-detail-back" onClick={onClose}>
            ‹ 返回
          </button>
        </div>
        <div className="cove-card text-sm text-slate-400">日程不存在或已删除。</div>
      </div>
    );
  }

  const patch = (p: Partial<Schedule>) => setDraft({ ...draft, ...p });
  const save = async () => {
    await updateSchedule(scheduleId, {
      title: draft.title,
      location: draft.location,
      startTime: draft.startTime,
      endTime: draft.endTime,
      reminder: draft.reminder,
      completed: draft.completed,
      description: draft.description,
    });
    onClose();
  };

  return (
    <div className="cove-detail">
      <div className="cove-detail-header">
        <button className="cove-detail-back" onClick={onClose}>
          ‹ 返回
        </button>
        <button
          className="text-sm font-semibold text-blue-600"
          onClick={() => void save()}
        >
          保存
        </button>
      </div>

      <div className="cove-detail-body">
        <input
          className="cove-input"
          value={draft.title}
          placeholder="标题"
          onChange={(e) => patch({ title: e.target.value })}
        />

        <div className="cove-card space-y-2">
          <label className="block text-[11px] text-slate-500">
            开始
            <input
              type="datetime-local"
              className="cove-input mt-1"
              value={toLocalInput(draft.startTime)}
              onChange={(e) => e.target.value && patch({ startTime: fromLocalInput(e.target.value) })}
            />
          </label>
          <label className="block text-[11px] text-slate-500">
            结束
            <input
              type="datetime-local"
              className="cove-input mt-1"
              value={toLocalInput(draft.endTime)}
              onChange={(e) => e.target.value && patch({ endTime: fromLocalInput(e.target.value) })}
            />
          </label>
        </div>

        <div className="cove-card">
          <input
            className="cove-input"
            placeholder="地点"
            value={draft.location ?? ''}
            onChange={(e) => patch({ location: e.target.value || null })}
          />
          <div className="flex items-center justify-between text-sm text-slate-700">
            <span>提前提醒（分钟）</span>
            <input
              type="number"
              className="cove-input mt-0 w-24"
              value={draft.reminder ?? 0}
              onChange={(e) =>
                patch({ reminder: e.target.value ? Number(e.target.value) : null })
              }
            />
          </div>
          <button
            type="button"
            className={`cove-btn ${draft.completed ? '' : 'ghost'}`}
            onClick={() => patch({ completed: !draft.completed })}
          >
            {draft.completed ? '已完成 ✓' : '标记为已完成'}
          </button>
        </div>

        <div className="cove-card">
          <div className="mb-2 text-sm font-bold text-slate-800">备注</div>
          <textarea
            className="cove-input"
            rows={4}
            value={draft.description ?? ''}
            onChange={(e) => patch({ description: e.target.value || null })}
          />
        </div>
      </div>
    </div>
  );
}
