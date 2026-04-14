import { useEffect, useState } from 'react';
import { useScheduleStore } from '../../stores/scheduleStore';
import { Clock, MapPin, Repeat, Plus, Search, GripVertical } from 'lucide-react';
import dayjs from 'dayjs';
import type { Schedule } from '../../types';

type ScheduleStatus = 'upcoming' | 'ongoing' | 'completed';

function deriveStatus(schedule: Schedule): ScheduleStatus {
  const now = dayjs();
  const start = dayjs(schedule.startTime);
  const end = dayjs(schedule.endTime);
  if (end.isBefore(now)) return 'completed';
  if (start.isBefore(now) || start.isSame(now)) return 'ongoing';
  return 'upcoming';
}

const COLUMNS: { id: ScheduleStatus; title: string; color: string; bgColor: string; borderColor: string }[] = [
  { id: 'upcoming', title: '待开始', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/10', borderColor: 'border-blue-200 dark:border-blue-800' },
  { id: 'ongoing', title: '进行中', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/10', borderColor: 'border-amber-200 dark:border-amber-800' },
  { id: 'completed', title: '已完成', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/10', borderColor: 'border-green-200 dark:border-green-800' },
];

export function ScheduleKanban() {
  const { schedules, fetchSchedules, updateSchedule, createSchedule } = useScheduleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, ScheduleStatus>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ScheduleStatus | null>(null);
  const [newSchedule, setNewSchedule] = useState({
    title: '', description: '', location: '',
    startTime: dayjs().format('YYYY-MM-DDTHH:mm'),
    endTime: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
    allDay: false, color: '#3B82F6', priority: 'medium' as 'low' | 'medium' | 'high',
  });

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const getStatus = (schedule: Schedule): ScheduleStatus => {
    return localStatuses[schedule.id] ?? deriveStatus(schedule);
  };

  const getSchedulesByStatus = (status: ScheduleStatus) => {
    return schedules
      .filter(s => getStatus(s) === status)
      .filter(s => {
        if (filterPriority !== 'all' && s.priority !== filterPriority) return false;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          return s.title.toLowerCase().includes(q) ||
            s.description?.toLowerCase().includes(q) ||
            s.location?.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => dayjs(a.startTime).unix() - dayjs(b.startTime).unix());
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: ScheduleStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(status);
  };

  const handleDragLeave = () => setDragOverCol(null);

  const handleDrop = async (e: React.DragEvent, status: ScheduleStatus) => {
    e.preventDefault();
    if (!draggingId) return;
    setLocalStatuses(prev => ({ ...prev, [draggingId]: status }));
    const schedule = schedules.find(s => s.id === draggingId);
    if (schedule && status === 'ongoing') {
      const now = dayjs();
      await updateSchedule(schedule.id, {
        startTime: now.toISOString(),
        endTime: (dayjs(schedule.endTime).isBefore(now.add(30, 'minute')) ? now.add(30, 'minute') : dayjs(schedule.endTime)).toISOString(),
      });
    }
    setDraggingId(null);
    setDragOverCol(null);
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-400';
    }
  };

  const getRepeatLabel = (repeat: Schedule['repeat']): string => {
    if (!repeat) return '';
    const map: Record<string, string> = { daily: '天', weekly: '周', monthly: '月', yearly: '年' };
    const base = map[repeat.type];
    return repeat.interval && repeat.interval > 1 ? `每${repeat.interval}${base}` : `每${base}`;
  };

  const handleCreate = async () => {
    if (!newSchedule.title.trim()) return;
    await createSchedule({
      title: newSchedule.title,
      description: newSchedule.description,
      location: newSchedule.location,
      startTime: new Date(newSchedule.startTime).toISOString(),
      endTime: new Date(newSchedule.endTime).toISOString(),
      allDay: newSchedule.allDay,
      color: newSchedule.color,
      priority: newSchedule.priority,
    });
    setShowCreate(false);
    setNewSchedule({ title: '', description: '', location: '', startTime: dayjs().format('YYYY-MM-DDTHH:mm'), endTime: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'), allDay: false, color: '#3B82F6', priority: 'medium' });
  };

  return (
    <div className="h-full flex flex-col bg-light-bg dark:bg-dark-bg">
      {/* 顶部工具栏 */}
      <div className="p-4 border-b border-light-border dark:border-dark-border bg-white dark:bg-dark-card">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">日程看板</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜索日程..."
                className="pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <select value={filterPriority} onChange={e => {
              const v = e.target.value;
              if (v === 'all' || v === 'low' || v === 'medium' || v === 'high') setFilterPriority(v);
            }}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="all">全部优先级</option>
              <option value="high">高</option><option value="medium">中</option><option value="low">低</option>
            </select>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 transition-colors">
              <Plus className="w-4 h-4" /><span>新建日程</span>
            </button>
          </div>
        </div>
      </div>

      {/* 看板主体 */}
      <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
        {COLUMNS.map(col => (
          <div
            key={col.id}
            className={`flex-1 min-w-[280px] max-w-[360px] flex flex-col rounded-lg border ${col.borderColor} ${col.bgColor} transition-all ${
              dragOverCol === col.id ? 'ring-2 ring-primary' : ''
            }`}
            onDragOver={e => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, col.id)}
          >
            {/* 列头 */}
            <div className={`flex items-center justify-between p-3 border-b ${col.borderColor}`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${col.color}`}>{col.title}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.color} ${col.bgColor}`}>
                  {getSchedulesByStatus(col.id).length}
                </span>
              </div>
            </div>

            {/* 卡片列表 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
              {getSchedulesByStatus(col.id).map(schedule => (
                <div
                  key={schedule.id}
                  draggable
                  onDragStart={e => handleDragStart(e, schedule.id)}
                  onClick={() => setEditingSchedule(schedule)}
                  className={`bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${getPriorityBorder(schedule.priority)} cursor-pointer hover:shadow-md transition-shadow group ${
                    draggingId === schedule.id ? 'opacity-40' : ''
                  }`}
                >
                  <div className="p-3">
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-white truncate">{schedule.title}</span>
                          {schedule.repeat && (
                            <Repeat className="w-3 h-3 text-purple-500 flex-shrink-0" aria-label={getRepeatLabel(schedule.repeat)} />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {dayjs(schedule.startTime).format('MM/DD HH:mm')}
                          </span>
                          {schedule.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {schedule.location}
                            </span>
                          )}
                        </div>
                        {schedule.description && (
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{schedule.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: schedule.color }} />
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            schedule.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                            schedule.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                            'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          }`}>
                            {schedule.priority === 'high' ? '高' : schedule.priority === 'medium' ? '中' : '低'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {getSchedulesByStatus(col.id).length === 0 && (
                <div className="flex items-center justify-center h-20 text-sm text-gray-400 dark:text-gray-600">
                  拖拽日程到这里
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 新建弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-lg p-6 w-[480px] shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">新建日程</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">标题 *</label>
                <input type="text" value={newSchedule.title}
                  onChange={e => setNewSchedule({ ...newSchedule, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="输入日程标题..." autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">描述</label>
                <textarea value={newSchedule.description}
                  onChange={e => setNewSchedule({ ...newSchedule, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2} placeholder="日程描述..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">开始时间</label>
                  <input type="datetime-local" value={newSchedule.startTime}
                    onChange={e => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">结束时间</label>
                  <input type="datetime-local" value={newSchedule.endTime}
                    onChange={e => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">优先级</label>
                  <select value={newSchedule.priority}
                    onChange={e => setNewSchedule({ ...newSchedule, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="low">低</option><option value="medium">中</option><option value="high">高</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">颜色</label>
                  <input type="color" value={newSchedule.color}
                    onChange={e => setNewSchedule({ ...newSchedule, color: e.target.value })}
                    className="w-full h-10 px-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg cursor-pointer" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">取消</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editingSchedule && (
        <EditKanbanDialog
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSave={async (updates) => {
            await useScheduleStore.getState().updateSchedule(editingSchedule.id, updates);
            setEditingSchedule(null);
          }}
        />
      )}
    </div>
  );
}

function EditKanbanDialog({ schedule, onClose, onSave }: { schedule: Schedule; onClose: () => void; onSave: (u: Partial<Schedule>) => void }) {
  const [form, setForm] = useState({
    title: schedule.title,
    description: schedule.description || '',
    location: schedule.location || '',
    startTime: dayjs(schedule.startTime).format('YYYY-MM-DDTHH:mm'),
    endTime: dayjs(schedule.endTime).format('YYYY-MM-DDTHH:mm'),
    priority: schedule.priority,
    color: schedule.color,
  });

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({
      ...form,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-card rounded-lg p-6 w-[480px] shadow-xl">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">编辑日程</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">标题 *</label>
            <input type="text" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">描述</label>
            <textarea value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">开始时间</label>
              <input type="datetime-local" value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">结束时间</label>
              <input type="datetime-local" value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">优先级</label>
              <select value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="low">低</option><option value="medium">中</option><option value="high">高</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">颜色</label>
              <input type="color" value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })}
                className="w-full h-10 px-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg cursor-pointer" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">取消</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600">保存</button>
        </div>
      </div>
    </div>
  );
}
