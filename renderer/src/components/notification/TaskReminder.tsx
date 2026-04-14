/**
 * TaskReminder - 悬浮任务提醒面板
 *
 * 两层提醒来源：
 * 1. 基于到期日自动检测（daysUntilDue <= 3 或已逾期）
 * 2. 基于 task_reminders 表中已触发（lastFiredAt 在最近 2 分钟内）的定制提醒
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import { Bell, BellOff, Clock, AlertTriangle, Move, CalendarClock } from 'lucide-react';
import dayjs from 'dayjs';

interface ReminderItem {
  id: string;
  taskName: string;
  dueDate: string;
  type: 'reminder' | 'overdue' | 'custom';
  /** 自定义提醒：下次触发时间 */
  nextFireAt?: string;
}

export function TaskReminder() {
  const { tasks } = useTaskStore();
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedPosition = localStorage.getItem('taskReminderPosition');
    if (savedPosition) {
      try {
        setPosition(JSON.parse(savedPosition));
      } catch (e) {
        console.error('Failed to load position:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (position.x && position.y) {
      localStorage.setItem('taskReminderPosition', JSON.stringify(position));
    }
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    setPosition({
      x: Math.max(0, Math.min(newX, window.innerWidth - 320)),
      y: Math.max(0, Math.min(newY, window.innerHeight - 100)),
    });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const checkReminders = async () => {
      const now = dayjs();
      const newReminders: ReminderItem[] = [];
      const notified = new Set<string>();

      // ── 层 1：基于 estimatedEndDate 的到期/逾期提醒 ──
      tasks.forEach(task => {
        if (!task.estimatedEndDate || task.status === 'done') return;
        const dueDate = dayjs(task.estimatedEndDate);
        const daysUntilDue = dueDate.diff(now, 'day');

        if (daysUntilDue < 0) {
          newReminders.push({ id: task.id, taskName: task.description,
            dueDate: dueDate.format('YYYY-MM-DD'), type: 'overdue' });
        } else if (daysUntilDue === 0) {
          newReminders.push({ id: task.id, taskName: task.description, dueDate: '今天', type: 'reminder' });
        } else if (daysUntilDue === 1) {
          newReminders.push({ id: task.id, taskName: task.description, dueDate: '明天', type: 'reminder' });
        } else if (daysUntilDue <= 3) {
          newReminders.push({ id: task.id, taskName: task.description,
            dueDate: dueDate.format('MM-DD'), type: 'reminder' });
        }
      });

      // ── 层 2：从数据库读取最近触发的自定义提醒 ──
      if (window.electronAPI?.getRemindersByTask) {
        for (const task of tasks) {
          try {
            const res = await window.electronAPI.getRemindersByTask(task.id);
            if (!res.success || !res.data) continue;
            for (const rem of res.data) {
              if (!rem.enabled) continue;
              // lastFiredAt 在最近 2 分钟内 → 展示
              if (rem.lastFiredAt) {
                const firedAt = dayjs(rem.lastFiredAt);
                if (now.diff(firedAt, 'minute') <= 2) {
                  const key = `custom_${rem.id}`;
                  if (!notified.has(key)) {
                    notified.add(key);
                    newReminders.push({
                      id: key,
                      taskName: task.description,
                      dueDate: firedAt.format('HH:mm'),
                      type: 'custom',
                      nextFireAt: rem.nextFireAt,
                    });
                  }
                }
              }
            }
          } catch (_) {
            // 忽略单个任务读取失败
          }
        }
      }

      setReminders(newReminders);

      // 发送系统通知（未静音时）
      if (!muted) {
        newReminders.forEach(reminder => {
          if (window.electronAPI?.sendNotification) {
            if (reminder.type === 'overdue') {
              window.electronAPI.sendNotification('任务逾期', `任务 "${reminder.taskName}" 已逾期！`);
            } else if (reminder.type === 'reminder' && reminder.dueDate === '今天') {
              window.electronAPI.sendNotification('任务提醒', `任务 "${reminder.taskName}" 今天到期！`);
            } else if (reminder.type === 'reminder' && reminder.dueDate === '明天') {
              window.electronAPI.sendNotification('任务提醒', `任务 "${reminder.taskName}" 明天到期！`);
            }
            // custom 类型的通知已由主进程调度器在 tick 时发出，此处不重复发送
          }
        });
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60_000);
    return () => clearInterval(interval);
  }, [tasks, muted]);

  if (reminders.length === 0) return null;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className="fixed w-80 max-h-96 overflow-y-auto z-50"
      style={{ left: position.x, top: position.y, cursor: isDragging ? 'grabbing' : 'default' }}
    >
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="relative p-3 bg-white dark:bg-dark-card rounded-full shadow-lg border-2 border-blue-500 hover:shadow-xl transition-all hover:scale-110"
          title="展开提醒"
        >
          <Bell className="w-5 h-5 text-blue-500 animate-bounce" />
          {reminders.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {reminders.length}
            </span>
          )}
        </button>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="drag-handle flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 cursor-grab active:cursor-grabbing select-none">
            <div className="flex items-center gap-2">
              <Move className="w-3 h-3 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-500" />
                任务提醒
                {reminders.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                    {reminders.length}
                  </span>
                )}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title={muted ? '取消静音' : '静音'}
              >
                {muted ? <BellOff className="w-4 h-4 text-gray-500" /> : <Bell className="w-4 h-4 text-gray-500" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setCollapsed(true); }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="收起"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-3 space-y-2">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`p-3 rounded-lg border-l-4 transition-all hover:shadow-md ${
                  reminder.type === 'overdue'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                    : reminder.type === 'custom'
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500'
                    : reminder.dueDate === '今天'
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                    : reminder.dueDate === '明天'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                }`}
              >
                <div className="flex items-start gap-2">
                  {reminder.type === 'overdue' ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : reminder.type === 'custom' ? (
                    <CalendarClock className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {reminder.taskName}
                    </p>
                    <p className={`text-xs mt-1 ${
                      reminder.type === 'overdue'
                        ? 'text-red-600 dark:text-red-400'
                        : reminder.type === 'custom'
                        ? 'text-purple-600 dark:text-purple-400'
                        : reminder.dueDate === '今天'
                        ? 'text-orange-600 dark:text-orange-400'
                        : reminder.dueDate === '明天'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {reminder.type === 'overdue'
                        ? `已逾期 (${reminder.dueDate})`
                        : reminder.type === 'custom'
                        ? `已提醒 ${reminder.dueDate}${reminder.nextFireAt ? `  |  下次：${dayjs(reminder.nextFireAt).format('MM-DD HH:mm')}` : ''}`
                        : `到期：${reminder.dueDate}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
