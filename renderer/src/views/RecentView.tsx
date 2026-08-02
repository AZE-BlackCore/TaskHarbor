import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useTaskStore } from '../stores/taskStore';
import { useTagStore } from '../stores/tagStore';
import { Clock, Search, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Loader, Circle } from 'lucide-react';
import type { Task, TaskStatus } from '../types';

type TimeRange = 'today' | 'week' | 'month';

const RANGE_LABELS: Record<TimeRange, string> = {
  today: '今天',
  week: '本周',
  month: '本月',
};

const STATUS_META: Record<TaskStatus, { label: string; icon: typeof Circle; color: string }> = {
  todo: { label: '待处理', icon: Circle, color: 'text-gray-400' },
  'in-progress': { label: '进行中', icon: Loader, color: 'text-blue-500' },
  review: { label: '审核中', icon: AlertCircle, color: 'text-yellow-500' },
  done: { label: '已完成', icon: CheckCircle2, color: 'text-green-500' },
  blocked: { label: '已阻塞', icon: AlertCircle, color: 'text-red-500' },
};

export function RecentView() {
  const { tasks, fetchTasks, updateTaskStatus, loading } = useTaskStore();
  const { tags, fetchTags } = useTagStore();
  const [range, setRange] = useState<TimeRange>('week');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    const now = dayjs();
    let start: string;
    if (range === 'today') {
      start = now.startOf('day').toISOString();
    } else if (range === 'week') {
      start = now.startOf('week').toISOString();
    } else {
      start = now.startOf('month').toISOString();
    }
    const end = now.endOf('day').toISOString();

    fetchTasks({
      dateRange: { start, end },
      dateField: 'createdAt',
      search: searchTerm || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    });
  }, [range, searchTerm, statusFilter, fetchTasks]);

  // Group tasks by date
  const groupedByDate = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    const dateKey = dayjs(task.createdAt).format('YYYY-MM-DD');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const handleToggleStatus = (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    updateTaskStatus(task.id, nextStatus);
  };

  return (
    <div className="h-full flex flex-col bg-light-bg dark:bg-dark-bg">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-teal-500" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">最近待办</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Time range tabs */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(Object.keys(RANGE_LABELS) as TimeRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    range === r
                      ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">全部状态</option>
              <option value="todo">待处理</option>
              <option value="in-progress">进行中</option>
              <option value="review">审核中</option>
              <option value="done">已完成</option>
              <option value="blocked">已阻塞</option>
            </select>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索..."
                className="pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 w-48"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">该时间段内没有任务</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(dateKey => {
              const dayTasks = groupedByDate[dateKey];
              const date = dayjs(dateKey);
              const isToday = date.isSame(dayjs(), 'day');
              return (
                <div key={dateKey}>
                  {/* Date header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isToday
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      {date.format('DD')}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {date.format('YYYY年MM月DD日')}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">
                        {isToday ? '今天' : date.format('dddd')}
                      </span>
                    </div>
                    <div className="flex-1 border-b border-gray-100 dark:border-gray-800" />
                    <span className="text-xs text-gray-400">{dayTasks.length} 项</span>
                  </div>

                  {/* Task list */}
                  <div className="space-y-2 ml-10">
                    {dayTasks.map(task => (
                      <RecentTaskItem
                        key={task.id}
                        task={task}
                        onToggle={handleToggleStatus}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RecentTaskItem({ task, onToggle }: { task: Task; onToggle: (task: Task) => void }) {
  const meta = STATUS_META[task.status] || STATUS_META.todo;
  const StatusIcon = meta.icon;

  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <button
        onClick={() => onToggle(task)}
        className="flex-shrink-0"
        title={task.status === 'done' ? '标记为待处理' : '标记为已完成'}
      >
        <StatusIcon className={`w-5 h-5 ${meta.color} ${task.status === 'in-progress' ? 'animate-spin' : ''}`} />
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${
          task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'
        }`}>
          {task.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs ${meta.color}`}>{meta.label}</span>
          {task.priority && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
              task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
              'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            }`}>
              {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {dayjs(task.createdAt).format('HH:mm')}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {task.progress > 0 && task.status !== 'done' && (
        <div className="flex-shrink-0 w-20">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 text-right block mt-0.5">{task.progress}%</span>
        </div>
      )}
    </div>
  );
}
