import { X } from 'lucide-react';
import { Task, Subtask, TimeLog, TaskTag } from '../../types';
import { SubtaskList } from './SubtaskList';
import { TimeTracker } from './TimeTracker';
import { TagManager } from './TagManager';

interface TaskDetailPanelProps {
  task: Task | null;
  subtasks: Subtask[];
  timeLogs: TimeLog[];
  tags: TaskTag[];
  onClose: () => void;
  onAddSubtask: (description: string) => void;
  onToggleSubtask: (id: string, completed: boolean) => void;
  onDeleteSubtask: (id: string) => void;
  onStartTimeLog: (description?: string) => void;
  onStopTimeLog: (id: string) => void;
  onDeleteTimeLog: (id: string) => void;
  onAddTag: (tagName: string, tagColor: string) => void;
  onDeleteTag: (id: string) => void;
}

export function TaskDetailPanel({
  task,
  subtasks,
  timeLogs,
  tags,
  onClose,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onStartTimeLog,
  onStopTimeLog,
  onDeleteTimeLog,
  onAddTag,
  onDeleteTag,
}: TaskDetailPanelProps) {
  if (!task) return null;

  return (
    <div className="w-96 border-l border-light-border dark:border-dark-border bg-white dark:bg-dark-card overflow-y-auto">
      {/* 头部 */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border bg-white dark:bg-dark-card">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">任务详情</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 内容区 */}
      <div className="p-4 space-y-6">
        {/* 任务描述 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            任务描述
          </h3>
          <p className="text-gray-900 dark:text-white">{task.description}</p>
        </div>

        {/* 任务信息 */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            任务信息
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">状态:</span>
              <span className="text-gray-900 dark:text-white capitalize">
                {task.status === 'todo' && '待办'}
                {task.status === 'in-progress' && '进行中'}
                {task.status === 'review' && '审查中'}
                {task.status === 'done' && '已完成'}
                {task.status === 'blocked' && '已阻塞'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">进度:</span>
              <span className="text-gray-900 dark:text-white">{task.progress}%</span>
            </div>
            {task.assignee && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">责任人:</span>
                <span className="text-gray-900 dark:text-white">{task.assignee}</span>
              </div>
            )}
            {task.module && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">模块:</span>
                <span className="text-gray-900 dark:text-white">{task.module}</span>
              </div>
            )}
            {task.functionModule && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">功能模块:</span>
                <span className="text-gray-900 dark:text-white">{task.functionModule}</span>
              </div>
            )}
          </div>
        </div>

        {/* 时间信息 */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            时间信息
          </h3>
          <div className="space-y-1 text-sm">
            {task.startDate && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">开始时间:</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(task.startDate).toLocaleDateString('zh-CN')}
                </span>
              </div>
            )}
            {task.estimatedEndDate && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">预计完成:</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(task.estimatedEndDate).toLocaleDateString('zh-CN')}
                </span>
              </div>
            )}
            {task.actualEndDate && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">实际完成:</span>
                <span className="text-green-600 dark:text-green-400">
                  {new Date(task.actualEndDate).toLocaleDateString('zh-CN')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 子任务 */}
        <div className="border-t border-light-border dark:border-dark-border pt-4">
          <SubtaskList
            taskId={task.id}
            subtasks={subtasks}
            onAdd={onAddSubtask}
            onToggle={onToggleSubtask}
            onDelete={onDeleteSubtask}
          />
        </div>

        {/* 时间追踪 */}
        <div className="border-t border-light-border dark:border-dark-border pt-4">
          <TimeTracker
            taskId={task.id}
            timeLogs={timeLogs}
            onStart={onStartTimeLog}
            onStop={onStopTimeLog}
            onDelete={onDeleteTimeLog}
          />
        </div>

        {/* 标签管理 */}
        <div className="border-t border-light-border dark:border-dark-border pt-4">
          <TagManager
            taskId={task.id}
            tags={tags}
            onAdd={onAddTag}
            onDelete={onDeleteTag}
          />
        </div>

        {/* 问题和备注 */}
        {(task.issues || task.notes) && (
          <div className="border-t border-light-border dark:border-dark-border pt-4 space-y-3">
            {task.issues && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  存在的问题
                </h3>
                <p className="text-sm text-gray-900 dark:text-white">{task.issues}</p>
              </div>
            )}
            {task.notes && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  备注
                </h3>
                <p className="text-sm text-gray-900 dark:text-white">{task.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
