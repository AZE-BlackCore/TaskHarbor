/** 底部半屏创建表单：保存即本地落库并出现在列表，不等网络（FR-09 本地优先） */

import { useState } from 'react';
import { useMobileStore } from '../store';
import { SCHEMA_VERSION } from '../../platform/schema';

interface Props {
  kind: 'task' | 'schedule';
  onClose: () => void;
}

export default function CreateSheet({ kind, onClose }: Props) {
  const createTask = useMobileStore((s) => s.createTask);
  const createSchedule = useMobileStore((s) => s.createSchedule);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const now = new Date();
      if (kind === 'task') {
        await createTask({
          description: title.trim(),
          priority,
          startDate: now.toISOString(),
        });
      } else {
        const start = new Date(now.getTime() + 60 * 60 * 1000);
        await createSchedule({
          title: title.trim(),
          priority,
          startTime: now.toISOString(),
          endTime: start.toISOString(),
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cove-sheet-mask" onClick={onClose}>
      <div className="cove-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 text-base font-bold text-slate-800">
          {kind === 'task' ? '新建任务' : '新建日程'}
        </div>
        <input
          className="cove-input"
          placeholder={kind === 'task' ? '要做什么？' : '日程标题'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <div className="mb-3 flex gap-2">
          {(['low', 'medium', 'high'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={`rounded-full px-3 py-1.5 text-xs ${
                priority === p ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {p === 'low' ? '低' : p === 'medium' ? '中' : '高'}
            </button>
          ))}
        </div>
        <button className="cove-btn" onClick={submit} disabled={saving || !title.trim()}>
          {saving ? '保存中…' : '保存（立即本地生效）'}
        </button>
        <button className="cove-btn ghost mt-2" onClick={onClose}>
          取消
        </button>
        <div className="mt-2 text-[11px] text-slate-400">
          本地即刻写入；联网后自动合流到电脑端（schema v{SCHEMA_VERSION}）
        </div>
      </div>
    </div>
  );
}
