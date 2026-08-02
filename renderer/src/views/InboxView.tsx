import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useTaskStore } from '../stores/taskStore';
import { useTagStore } from '../stores/tagStore';
import { Inbox, Search, Plus, Play, Trash2, AlertCircle } from 'lucide-react';
import type { Task } from '../types';

export function InboxView() {
  const { tasks, fetchTasks, createTask, updateTaskStatus, deleteTask, loading } = useTaskStore();
  const { tags, fetchTags } = useTagStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    fetchTasks({
      status: 'todo',
      search: searchTerm || undefined,
      priority: priorityFilter === 'all' ? undefined : priorityFilter,
    });
  }, [searchTerm, priorityFilter, fetchTasks]);

  const handleQuickCreate = async () => {
    if (!newDesc.trim()) return;
    await createTask({
      description: newDesc.trim(),
      status: 'todo',
      priority: newPriority,
      progress: 0,
    });
    setNewDesc('');
    setShowCreate(false);
    // Refresh inbox
    fetchTasks({ status: 'todo' });
  };

  const handleStart = (task: Task) => {
    updateTaskStatus(task.id, 'in-progress');
    // Refresh inbox after status change
    setTimeout(() => fetchTasks({ status: 'todo' }), 300);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个任务吗？')) {
      await deleteTask(id);
    }
  };

  const PRIORITY_COLORS: Record<string, string> = {
    high: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    low: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  };

  return (
    <div className="h-full flex flex-col bg-light-bg dark:bg-dark-bg">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Inbox className="w-6 h-6 text-teal-500" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">待办箱</h1>
            <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 font-medium">
              {tasks.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Priority filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">全部优先级</option>
              <option value="high">高优先级</option>
              <option value="medium">中优先级</option>
              <option value="low">低优先级</option>
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

            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              快速添加
            </button>
          </div>
        </div>

        {/* Quick create form */}
        {showCreate && (
          <div className="flex items-center gap-2 p-3 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-gray-700 mb-3 animate-slide-in">
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleQuickCreate();
                if (e.key === 'Escape') { setShowCreate(false); setNewDesc(''); }
              }}
              placeholder="输入任务描述，回车创建..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
            <button
              onClick={handleQuickCreate}
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm"
            >
              创建
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewDesc(''); }}
              className="px-3 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-sm"
            >
              取消
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Inbox className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">待办箱已清空</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              所有任务已处理完毕，点击「快速添加」创建新任务
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-4 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow group"
              >
                {/* Priority indicator */}
                <div className={`w-1 h-10 rounded-full flex-shrink-0 ${
                  task.priority === 'high' ? 'bg-red-400' :
                  task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                }`} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {task.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {task.priority && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      创建于 {dayjs(task.createdAt).format('MM-DD HH:mm')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStart(task)}
                    className="p-2 rounded-lg text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                    title="开始处理"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
