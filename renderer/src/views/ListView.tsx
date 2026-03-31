import { useEffect, useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';
import { Task, TaskStatus } from '../types';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { TaskEditDialog } from '../components/task/TaskEditDialog';

export function ListView() {
  const { tasks, fetchTasks, createTask, updateTaskStatus, deleteTask, updateTask, loading } = useTaskStore();
  const { currentProjectId } = useProjectStore();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  useEffect(() => {
    fetchTasks(currentProjectId ? { projectId: currentProjectId } : undefined);
  }, [currentProjectId, fetchTasks]);

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowEditDialog(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (editingTask) {
      // 更新任务
      await updateTask(editingTask.id, taskData);
    } else {
      // 创建新任务
      await createTask({
        ...taskData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setShowEditDialog(false);
    setEditingTask(null);
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'blocked': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }
  };


  const filteredTasks = tasks.filter(task => {
    // 搜索过滤
    const matchSearch = 
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.module && task.module.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.functionModule && task.functionModule.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.assignee && task.assignee.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // 状态过滤
    const matchStatus = filterStatus === 'all' || task.status === filterStatus;
    
    // 责任人过滤
    const matchAssignee = filterAssignee === 'all' || task.assignee === filterAssignee;
    
    return matchSearch && matchStatus && matchAssignee;
  });

  // 获取所有责任人列表
  const assignees = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean)));

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-card">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 p-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            任务列表
          </h1>
          <button
            onClick={() => {
              setEditingTask(null);
              setShowEditDialog(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建任务
          </button>
        </div>

        <div className="flex gap-3">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索任务、模块、责任人..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* 状态过滤 */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">所有状态</option>
            <option value="todo">待办</option>
            <option value="in-progress">进行中</option>
            <option value="review">审查中</option>
            <option value="done">已完成</option>
            <option value="blocked">已阻塞</option>
          </select>

          {/* 责任人过滤 */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">所有责任人</option>
            {assignees.map(assignee => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>

          {/* 清除过滤 */}
          {(filterStatus !== 'all' || filterAssignee !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilterStatus('all');
                setFilterAssignee('all');
                setSearchQuery('');
              }}
              className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                任务描述
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                模块
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                进度
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                责任人
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                开始时间
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                预计完成
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                实际完成
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    </td>
                  </tr>
                ))}
              </>
            ) : (
              <>
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-white">{task.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {task.module || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}
                      >
                        <option value="todo">待办</option>
                        <option value="in-progress">进行中</option>
                        <option value="review">审查中</option>
                        <option value="done">已完成</option>
                        <option value="blocked">已阻塞</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-10">
                          {task.progress}%
                        </span>
                      </div>
                    </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {task.assignee || '-'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {task.startDate ? task.startDate.split('T')[0] : '-'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {task.estimatedEndDate ? task.estimatedEndDate.split('T')[0] : '-'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {task.actualEndDate ? task.actualEndDate.split('T')[0] : '-'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(task)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>

        {!loading && filteredTasks.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p>暂无任务</p>
              <p className="text-sm mt-2">点击右上角"新建任务"开始创建</p>
            </div>
          </div>
        )}
      </div>

      {/* 任务编辑对话框 */}
      <TaskEditDialog
        open={showEditDialog}
        task={editingTask}
        onClose={() => {
          setShowEditDialog(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
      />
    </div>
  );
}
