import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { useTaskStore } from '../stores/taskStore';
import { TaskEditDialog } from '../components/task/TaskEditDialog';
import { KanbanSquare, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import type { Task, TaskStatus } from '../types';

/** 看板列：直接映射任务状态，与现有 tasks 表数据双向联动 */
const COLUMNS: Array<{
  status: TaskStatus;
  label: string;
  dot: string;
  ring: string;
}> = [
  { status: 'todo', label: '待处理', dot: 'bg-slate-400', ring: 'ring-slate-400' },
  { status: 'in-progress', label: '进行中', dot: 'bg-blue-500', ring: 'ring-blue-500' },
  { status: 'review', label: '等待确认', dot: 'bg-amber-500', ring: 'ring-amber-500' },
  { status: 'done', label: '已完成', dot: 'bg-teal-500', ring: 'ring-teal-500' },
  { status: 'blocked', label: '已暂停', dot: 'bg-red-500', ring: 'ring-red-500' },
];

const PRIORITY_STYLE: Record<string, { text: string; cls: string }> = {
  high: { text: '高', cls: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
  medium: { text: '中', cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' },
  low: { text: '低', cls: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
};

export function BoardView() {
  const { tasks, fetchTasks, createTask, updateTask, updateTaskStatus, deleteTask, loading } = useTaskStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  const reload = () => fetchTasks({});

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keyword = searchTerm.trim().toLowerCase();

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      'in-progress': [],
      review: [],
      done: [],
      blocked: [],
    };
    for (const task of tasks) {
      if (keyword) {
        const haystack = [task.description, task.assignee, task.module, task.functionModule]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(keyword)) continue;
      }
      map[task.status]?.push(task);
    }
    // 每列内按优先级（高→低）再按创建时间正序
    const weight: Record<string, number> = { high: 0, medium: 1, low: 2 };
    for (const status of Object.keys(map) as TaskStatus[]) {
      map[status].sort((a, b) => {
        const w = (weight[a.priority] ?? 3) - (weight[b.priority] ?? 3);
        if (w !== 0) return w;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }
    return map;
  }, [tasks, keyword]);

  const total = useMemo(
    () => COLUMNS.reduce((sum, col) => sum + grouped[col.status].length, 0),
    [grouped]
  );

  const handleCreate = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleSave = async (taskData: Partial<Task>) => {
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
    } else {
      await createTask({ ...taskData, status: 'todo' });
    }
    setDialogOpen(false);
    setEditingTask(null);
    reload();
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个任务吗？')) {
      await deleteTask(id);
      reload();
    }
  };

  const handleDrop = async (status: TaskStatus) => {
    const id = draggingId;
    setDraggingId(null);
    setDragOverStatus(null);
    if (!id) return;
    const target = tasks.find(t => t.id === id);
    if (!target || target.status === status) return;
    await updateTaskStatus(id, status);
  };

  return (
    <div className="h-full flex flex-col bg-light-bg dark:bg-dark-bg">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KanbanSquare className="w-6 h-6 text-teal-500" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">项目计划看板</h1>
            <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 font-medium">
              {total}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索任务"
                className="w-52 pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新建任务
            </button>
          </div>
        </div>

        {loading && tasks.length === 0 && (
          <p className="text-sm text-gray-400">加载中…</p>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-4">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMNS.map((col) => {
            const items = grouped[col.status];
            const isOver = dragOverStatus === col.status;
            return (
              <div
                key={col.status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStatus(col.status);
                }}
                onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
                onDrop={() => handleDrop(col.status)}
                className={`w-72 flex flex-col h-full rounded-xl border transition-all ${
                  isOver
                    ? `border-transparent ring-2 ${col.ring} bg-white dark:bg-dark-card`
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30'
                }`}
              >
                {/* Column header */}
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {col.label}
                  </span>
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{items.length}</span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                  {items.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-8">
                      <p className="text-xs text-gray-400 dark:text-gray-500">拖拽任务到此处</p>
                    </div>
                  ) : (
                    items.map((task) => {
                      const priority = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.low;
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggingId(task.id);
                            e.dataTransfer.setData('text/plain', task.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverStatus(null);
                          }}
                          className={`group cursor-grab active:cursor-grabbing p-3 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow ${
                            draggingId === task.id ? 'opacity-50' : ''
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white break-words">
                            {task.description}
                          </p>

                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${priority.cls}`}>
                              {priority.text}
                            </span>
                            {task.assignee && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                {task.assignee}
                              </span>
                            )}
                            {task.estimatedEndDate && (
                              <span className="text-xs text-gray-400">
                                {dayjs(task.estimatedEndDate).format('MM-DD')} 截止
                              </span>
                            )}
                          </div>

                          {typeof task.progress === 'number' && (
                            <div className="mt-2 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                              <div
                                className="h-full bg-teal-500 transition-all"
                                style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(task)}
                              className="p-1.5 rounded text-gray-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-500 transition-colors"
                              title="编辑"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="p-1.5 rounded text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TaskEditDialog
        open={dialogOpen}
        task={editingTask}
        onClose={() => {
          setDialogOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
