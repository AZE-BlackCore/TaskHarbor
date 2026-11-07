/** 任务全屏详情（M3-1 全屏 Detail 信息架构）：查看 + 改状态/优先级/进度/关键字段 */

import { useEffect, useState } from 'react';
import { useMobileStore } from '../store';
import type { Task } from '../../../../core/src/domain/types';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../constants';

interface Props {
  taskId: string;
  onClose: () => void;
}

export default function TaskDetail({ taskId, onClose }: Props) {
  const task = useMobileStore((s) => s.tasks.find((t) => t.id === taskId));
  const updateTask = useMobileStore((s) => s.updateTask);
  const [draft, setDraft] = useState<Task | null>(null);

  useEffect(() => {
    if (task) setDraft(task);
  }, [taskId, task]);

  if (!task || !draft) {
    return (
      <div className="cove-detail">
        <div className="cove-detail-header">
          <button className="cove-detail-back" onClick={onClose}>
            ‹ 返回
          </button>
        </div>
        <div className="cove-card text-sm text-slate-400">任务不存在或已删除。</div>
      </div>
    );
  }

  const patch = (p: Partial<Task>) => setDraft({ ...draft, ...p });
  const save = async () => {
    await updateTask(taskId, {
      description: draft.description,
      status: draft.status,
      priority: draft.priority,
      progress: draft.progress,
      assignee: draft.assignee,
      estimatedEndDate: draft.estimatedEndDate,
      notes: draft.notes,
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
        <textarea
          className="cove-input"
          rows={3}
          value={draft.description}
          placeholder="任务描述"
          onChange={(e) => patch({ description: e.target.value })}
        />

        <div className="cove-card">
          <div className="mb-2 text-sm font-bold text-slate-800">状态</div>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs ${
                  draft.status === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
                onClick={() => patch({ status: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="cove-card">
          <div className="mb-2 text-sm font-bold text-slate-800">优先级</div>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs ${
                  draft.priority === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
                onClick={() => patch({ priority: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="cove-card">
          <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-800">
            <span>进度</span>
            <span>{draft.progress}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={draft.progress}
            onChange={(e) => patch({ progress: Number(e.target.value) })}
            className="w-full accent-blue-600"
          />
        </div>

        <div className="cove-card space-y-2">
          <div className="text-sm font-bold text-slate-800">详情</div>
          <div className="text-[11px] text-slate-400">
            模块：{draft.module ?? '-'}
            {draft.functionModule ? ` · ${draft.functionModule}` : ''}
          </div>
          <input
            className="cove-input"
            placeholder="责任人"
            value={draft.assignee ?? ''}
            onChange={(e) => patch({ assignee: e.target.value || null })}
          />
          <label className="block text-[11px] text-slate-500">
            截止日期
            <input
              type="date"
              className="cove-input mt-1"
              value={draft.estimatedEndDate?.slice(0, 10) ?? ''}
              onChange={(e) => patch({ estimatedEndDate: e.target.value || null })}
            />
          </label>
          <textarea
            className="cove-input"
            rows={4}
            placeholder="备注"
            value={draft.notes ?? ''}
            onChange={(e) => patch({ notes: e.target.value || null })}
          />
        </div>
      </div>
    </div>
  );
}
