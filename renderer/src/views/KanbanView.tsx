import { useEffect, useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';
import { Task, TaskStatus } from '../types';
import { Plus, MoreVertical, Edit2, Trash2, Clock, User } from 'lucide-react';
import { TaskEditDialog } from '../components/task/TaskEditDialog';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

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
  isDragging?: boolean;
}

function KanbanCard({ task, onEdit, onDelete, isDragging }: KanbanCardProps) {
  const project = useProjectStore(state => state.projects.find(p => p.id === task.projectId));

  return (
    <div 
      className={`bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-3 shadow-sm transition-shadow ${
        isDragging ? 'shadow-xl opacity-90 rotate-2' : 'hover:shadow-md cursor-move'
      }`}
    >
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
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <Edit2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
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

// 可拖拽的任务卡片
function DraggableTaskCard({ task, onEdit, onDelete }: { task: Task; onEdit: (t: Task) => void; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `task-${task.id}`,
    data: { task, type: 'task' },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <KanbanCard task={task} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

// 可放置的列
function DroppableColumn({ 
  columnId, 
  title, 
  color, 
  tasks, 
  onEdit, 
  onDelete,
  isOver,
}: { 
  columnId: TaskStatus; 
  title: string; 
  color: string;
  tasks: Task[];
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  isOver: boolean;
}) {
  const { setNodeRef, isOver: isOverDirect } = useDroppable({
    id: `column-${columnId}`,
    data: { columnId, type: 'column' },
  });

  const isOverNow = isOver || isOverDirect;

  return (
    <div
      className={`flex-shrink-0 w-80 flex flex-col bg-gray-100 dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg transition-colors ${
        isOverNow ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900' : ''
      }`}
    >
      {/* 列标题 */}
      <div className="flex-shrink-0 p-3 flex items-center gap-2 border-b border-light-border dark:border-dark-border">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <h2 className="font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* 任务列表 */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50 dark:bg-dark-bg">
        {tasks.map(task => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-4">
            拖拽任务到此处
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanView() {
  const { tasks, fetchTasks, deleteTask, updateTask, updateTaskStatus } = useTaskStore();
  const { fetchProjects } = useProjectStore();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 拖动 8px 后激活，避免误触
      },
    })
  );

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowEditDialog(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
    }
    setShowEditDialog(false);
    setEditingTask(null);
  };

  const handleDelete = async (taskId: string) => {
    if (confirm('确定要删除这个任务吗？')) {
      deleteTask(taskId);
    }
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const taskId = active.id?.toString().replace('task-', '');
    const task = tasks.find(t => t.id === taskId);
    setDraggedTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setDraggedTask(null);
      return;
    }

    const taskId = active.id?.toString().replace('task-', '');
    const overId = over.id?.toString();
    
    // 获取目标列的状态
    let newStatus: TaskStatus | undefined;
    if (overId?.startsWith('column-')) {
      const columnId = overId.replace('column-', '') as TaskStatus;
      newStatus = columnId;
    }

    if (taskId && newStatus) {
      await updateTaskStatus(taskId, newStatus);
    }

    setDraggedTask(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-dark-card">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* 顶部工具栏 */}
        <div className="flex-shrink-0 p-4 bg-white dark:bg-dark-bg border-b border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              看板视图
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
        </div>

        {/* 看板列 */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="h-full flex gap-4 p-4">
            {COLUMNS.map(column => {
              const columnTasks = tasks.filter(task => task.status === column.id);
              
              return (
                <DroppableColumn
                  key={column.id}
                  columnId={column.id}
                  title={column.label}
                  color={column.color}
                  tasks={columnTasks}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isOver={false}
                />
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {draggedTask && (
            <KanbanCard task={draggedTask} onEdit={() => {}} onDelete={() => {}} isDragging />
          )}
        </DragOverlay>
      </DndContext>

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
