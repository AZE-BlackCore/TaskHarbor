import { useEffect, useState } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import { Bell, BellOff, Clock, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';

export function TaskReminder() {
  const { tasks } = useTaskStore();
  const [reminders, setReminders] = useState<Array<{ id: string; taskName: string; dueDate: string; type: 'reminder' | 'overdue' }>>([]);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    // 每分钟检查一次任务提醒
    const checkReminders = () => {
      const now = dayjs();
      const newReminders: Array<{ id: string; taskName: string; dueDate: string; type: 'reminder' | 'overdue' }> = [];

      tasks.forEach(task => {
        if (!task.estimatedEndDate || task.status === 'done') return;

        const dueDate = dayjs(task.estimatedEndDate);
        const daysUntilDue = dueDate.diff(now, 'day');

        // 逾期任务
        if (daysUntilDue < 0 && (task.status as string) !== 'done') {
          newReminders.push({
            id: task.id,
            taskName: task.description,
            dueDate: dueDate.format('YYYY-MM-DD'),
            type: 'overdue',
          });
        }
        // 今天到期的任务
        else if (daysUntilDue === 0) {
          newReminders.push({
            id: task.id,
            taskName: task.description,
            dueDate: '今天',
            type: 'reminder',
          });
        }
        // 明天到期的任务
        else if (daysUntilDue === 1) {
          newReminders.push({
            id: task.id,
            taskName: task.description,
            dueDate: '明天',
            type: 'reminder',
          });
        }
        // 3 天内到期的任务
        else if (daysUntilDue <= 3) {
          newReminders.push({
            id: task.id,
            taskName: task.description,
            dueDate: dueDate.format('MM-DD'),
            type: 'reminder',
          });
        }
      });

      setReminders(newReminders);

      // 发送通知（如果未静音）
      if (!muted && newReminders.length > 0) {
        newReminders.forEach(reminder => {
          if (window.electronAPI?.sendNotification) {
            if (reminder.type === 'overdue') {
              window.electronAPI.sendNotification('任务逾期', `任务 "${reminder.taskName}" 已逾期！`);
            } else if (reminder.dueDate === '今天') {
              window.electronAPI.sendNotification('任务提醒', `任务 "${reminder.taskName}" 今天到期！`);
            } else if (reminder.dueDate === '明天') {
              window.electronAPI.sendNotification('任务提醒', `任务 "${reminder.taskName}" 明天到期！`);
            }
          }
        });
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60000); // 每分钟检查一次

    return () => clearInterval(interval);
  }, [tasks, muted]);

  if (reminders.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 max-h-96 overflow-y-auto z-50 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          任务提醒
        </h3>
        <button
          onClick={() => setMuted(!muted)}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          title={muted ? '取消静音' : '静音'}
        >
          {muted ? (
            <BellOff className="w-4 h-4 text-gray-500" />
          ) : (
            <Bell className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className={`p-3 rounded-lg shadow-lg border-l-4 ${
            reminder.type === 'overdue'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
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
                  : reminder.dueDate === '今天'
                  ? 'text-orange-600 dark:text-orange-400'
                  : reminder.dueDate === '明天'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}>
                {reminder.type === 'overdue' 
                  ? `已逾期 (${reminder.dueDate})`
                  : `到期：${reminder.dueDate}`
                }
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
