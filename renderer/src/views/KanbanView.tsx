import { useEffect } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';
import { Task, TaskStatus } from '../types';
import { Plus, MoreVertical, Edit2, Trash2, Clock, User } from 'lucide-react';

const COLUMNS: Array<{ id: TaskStatus; label: string; color: string }> = [
  { id: 'todo', label: '待办', color: 'bg-gray-500' },
  { id: 'in-progress', label: '进行中', color: 'bg-blue-500' },
  { id: 'review', label: '审查中', color: 'bg-yellow-500' },
  { id: 'done', label: '已完成', color: 'bg-green-500' },
  { id: 'blocked', label: '已阻塞', color: 'bg-red-500' },
];

interface KanbanCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

function KanbanCard({ task, onEdit, onDelete }: KanbanCardProps) {
  const project = useProjectStore(state => state.projects.find(p => p.id === task.projectId));

  return (
    <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-move">
      {/* 项目标签 */}
      {project && (
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {project.name}
          </span>
        </div>
      )}

      {/* 任务描述 */}
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
        {task.description}
      </h3>

      {/* 模块信息 */}
      {(task.module || task.functionModule) && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {task.module && <span>{task.module}</span>}
          {task.module && task.functionModule && <span> / </span>}
          {task.functionModule && <span>{task.functionModule}</span>}
        </div>
      )}

      {/* 进度条 */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500 dark:text-gray-400">进度</span>
          <span className="text-gray-700 dark:text-gray-300">{task.progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[80px]">{task.assignee}</span>
            </div>
          )}
          {task.estimatedEndDate && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(task.estimatedEndDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-light-border dark:border-dark-border">
        <button
          onClick={() => onEdit(task)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <Edit2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
        >
          <Trash2 className="w-3 h-3 text-red-500" />
        </button>
        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded ml-auto">
          <MoreVertical className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
}

export function KanbanView() {
  const { tasks, fetchTasks, deleteTask } = useTaskStore();
  const { fetchProjects } = useProjectStore();

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleEdit = (_task: Task) => {
    // TODO: 打开任务编辑对话框
  };

  const handleDelete = async (taskId: string) => {
    if (confirm('确定要删除这个任务吗？')) {
      deleteTask(taskId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-dark-bg">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-dark-card border-b border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            看板视图
          </h1>
          <button
            onClick={() => setShowNewTaskDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建任务
          </button>
        </div>
      </div>

      {/* 看板列 */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full flex gap-4 p-4">
          {COLUMNS.map(column => {
            const columnTasks = tasks.filter(task => task.status === column.id);
            
            return (
              <div
                key={column.id}
                className="flex-shrink-0 w-80 flex flex-col bg-gray-200 dark:bg-gray-800 rounded-lg"
              >
                {/* 列标题 */}
                <div className="flex-shrink-0 p-3 flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${column.color}`} />
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {column.label}
                  </h2>
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 bg-gray-300 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                {/* 任务列表 */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {columnTasks.map(task => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="flex-shrink-0 p-3 bg-white dark:bg-dark-card border-t border-light-border dark:border-dark-border">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600 dark:text-gray-400">总任务数:</span>
          <span className="font-medium text-gray-900 dark:text-white">{tasks.length}</span>
          <div className="flex-1" />
          <span className="text-gray-600 dark:text-gray-400">总进度:</span>
          <span className="font-medium text-primary">
            {tasks.length > 0 
              ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length)
              : 0}%
          </span>
        </div>
      </div>
    </div>
  );
}
