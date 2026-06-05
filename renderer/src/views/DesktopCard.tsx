import { useState, useEffect } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { X, Minus, Settings, GripVertical, Clock, Calendar } from 'lucide-react';
import dayjs from 'dayjs';

interface DesktopCardProps {
  windowId?: number;
}

export function DesktopCard({ windowId }: DesktopCardProps) {
  const { tasks, fetchTasks } = useTaskStore();
  const { schedules, fetchSchedules } = useScheduleStore();
  const [showSettings, setShowSettings] = useState(false);
  const [displayMode, setDisplayMode] = useState<'tasks' | 'schedules' | 'both'>('tasks');
  const [opacity, setOpacity] = useState(0.95);
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');

  useEffect(() => {
    fetchTasks();
    fetchSchedules();
  }, [fetchTasks, fetchSchedules]);

  // 更新窗口透明度
  useEffect(() => {
    // @ts-ignore
    window.electronAPI?.setWindowOpacity?.(opacity);
  }, [opacity]);

  const sizeClasses = {
    small: 'w-64',
    medium: 'w-80',
    large: 'w-96',
  };

  const upcomingTasks = tasks
    .filter(t => t.status !== 'done' && t.estimatedEndDate)
    .sort((a, b) => 
      new Date(a.estimatedEndDate!).getTime() - new Date(b.estimatedEndDate!).getTime()
    )
    .slice(0, 5);

  const upcomingSchedules = schedules
    .filter(s => new Date(s.startTime) >= new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  return (
    <div
      className={`fixed ${sizeClasses[size]} bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden transition-opacity`}
      style={{
        opacity: opacity,
      }}
    >
      {/* 标题栏 */}
      <div
        className="h-10 bg-gradient-to-r from-primary/80 to-primary/60 dark:from-primary/90 dark:to-primary/70 flex items-center justify-between px-3 select-none"
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-white/70" />
          <span className="text-sm font-medium text-white">TaskHarbor 看板</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="设置"
          >
            <Settings className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            onClick={() => {
              // @ts-ignore
              window.electronAPI?.minimizeToTray?.();
            }}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="最小化"
          >
            <Minus className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            onClick={() => {
              // @ts-ignore
              window.electronAPI?.closeFloatingWindow?.(windowId);
            }}
            className="p-1.5 hover:bg-red-500/80 rounded transition-colors"
            title="关闭"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                显示模式
              </label>
              <select
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value as any)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="tasks">仅任务</option>
                <option value="schedules">仅日程</option>
                <option value="both">任务 + 日程</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                透明度：{Math.round(opacity * 100)}%
              </label>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                卡片大小
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSize('small')}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    size === 'small'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  小
                </button>
                <button
                  onClick={() => setSize('medium')}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    size === 'medium'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  中
                </button>
                <button
                  onClick={() => setSize('large')}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    size === 'large'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  大
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 内容区 */}
      <div className="p-3 max-h-[500px] overflow-y-auto">
        {/* 任务列表 */}
        {(displayMode === 'tasks' || displayMode === 'both') && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">即将到期任务</h3>
            </div>
            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 py-2">没有即将到期的任务</p>
            ) : (
              <div className="space-y-1.5">
                {upcomingTasks.map(task => (
                  <div
                    key={task.id}
                    className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-2 border-primary"
                  >
                    <p className="text-xs text-gray-900 dark:text-white truncate">{task.description}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(task.estimatedEndDate!).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        task.progress === 100
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      }`}>
                        {task.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 日程列表 */}
        {(displayMode === 'schedules' || displayMode === 'both') && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">即将开始的日程</h3>
            </div>
            {upcomingSchedules.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 py-2">没有即将开始的日程</p>
            ) : (
              <div className="space-y-1.5">
                {upcomingSchedules.map(schedule => (
                  <div
                    key={schedule.id}
                    className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-2"
                    style={{ borderLeftColor: schedule.color }}
                  >
                    <p className="text-xs text-gray-900 dark:text-white truncate">{schedule.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {dayjs(schedule.startTime).format('MM/DD HH:mm')}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        schedule.priority === 'high'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          : schedule.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      }`}>
                        {schedule.priority === 'high' ? '高' : schedule.priority === 'medium' ? '中' : '低'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}