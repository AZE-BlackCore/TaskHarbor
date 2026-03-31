import { useState } from 'react';
import { CheckSquare, Square, Plus, Trash2 } from 'lucide-react';
import { Subtask as SubtaskType } from '../../types';

interface SubtaskListProps {
  taskId: string;
  subtasks: SubtaskType[];
  onAdd: (description: string) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SubtaskList({ taskId: _taskId, subtasks, onAdd, onToggle, onDelete }: SubtaskListProps) {
  const [newSubtask, setNewSubtask] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = () => {
    if (!newSubtask.trim()) return;
    onAdd(newSubtask.trim());
    setNewSubtask('');
    setShowAdd(false);
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  return (
    <div className="space-y-2">
      {/* 子任务统计 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          子任务 ({completedCount}/{subtasks.length})
        </span>
        <span className="text-gray-500 dark:text-gray-500">{progress}%</span>
      </div>

      {/* 进度条 */}
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 子任务列表 */}
      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded group"
          >
            <button
              onClick={() => onToggle(subtask.id, !subtask.completed)}
              className="flex-shrink-0"
            >
              {subtask.completed ? (
                <CheckSquare className="w-4 h-4 text-green-500" />
              ) : (
                <Square className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              )}
            </button>
            <span className={`flex-1 text-sm ${
              subtask.completed 
                ? 'line-through text-gray-500 dark:text-gray-500' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {subtask.description}
            </span>
            <button
              onClick={() => onDelete(subtask.id)}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
            >
              <Trash2 className="w-3 h-3 text-red-500" />
            </button>
          </div>
        ))}
      </div>

      {/* 添加子任务 */}
      {showAdd ? (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setShowAdd(false);
            }}
            placeholder="输入子任务..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary-600"
          >
            添加
          </button>
          <button
            onClick={() => setShowAdd(false)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            取消
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary mt-2"
        >
          <Plus className="w-3 h-3" />
          添加子任务
        </button>
      )}
    </div>
  );
}
