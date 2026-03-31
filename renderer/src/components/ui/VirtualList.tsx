import { useRef, useState, useCallback } from 'react';
import { Task, TaskStatus } from '../../types';
import { Edit2, Trash2 } from 'lucide-react';

interface VirtualTaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  getStatusColor: (status: TaskStatus) => string;
  getStatusLabel: (status: TaskStatus) => string;
}

const ROW_HEIGHT = 64; // 每行高度（像素）
const OVERSCAN = 5; // 额外渲染的行数

export function VirtualTaskList({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  getStatusColor,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getStatusLabel: _getStatusLabel,
}: VirtualTaskListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const containerHeight = Math.min(tasks.length * ROW_HEIGHT, 600);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p>暂无任务</p>
          <p className="text-sm mt-2">点击右上角"新建任务"开始创建</p>
        </div>
      </div>
    );
  }

  // 计算可见范围
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(tasks.length - 1, startIndex + visibleCount);

  const totalHeight = tasks.length * ROW_HEIGHT;
  const offsetY = startIndex * ROW_HEIGHT;

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflowY: 'auto', position: 'relative' }}
      onScroll={handleScroll}
    >
      {/* 撑开滚动区域 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 可见行 */}
        <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
          {tasks.slice(startIndex, endIndex + 1).map((task) => (
            <div
              key={task.id}
              style={{ height: ROW_HEIGHT }}
              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-4 px-4 py-2 h-full">
                {/* 任务描述 */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 dark:text-white truncate">
                    {task.description}
                  </div>
                  {task.module && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {task.module} {task.functionModule && `· ${task.functionModule}`}
                    </div>
                  )}
                </div>

                {/* 状态下拉框 */}
                <select
                  value={task.status}
                  onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status as TaskStatus)}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="todo">待办</option>
                  <option value="in-progress">进行中</option>
                  <option value="review">审查中</option>
                  <option value="done">已完成</option>
                  <option value="blocked">已阻塞</option>
                </select>

                {/* 进度条 */}
                <div className="flex items-center gap-2 w-32">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                    {task.progress}%
                  </span>
                </div>

                {/* 责任人 */}
                <div className="text-sm text-gray-500 dark:text-gray-400 w-24 truncate">
                  {task.assignee || '-'}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(task)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => onDelete(task.id)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
