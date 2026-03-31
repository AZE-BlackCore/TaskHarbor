import { useEffect } from 'react';
import { useForm, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input, TextArea, Select } from '../ui/input';
import { Task, TaskStatus } from '../../types';
import { useProjectStore } from '../../stores/projectStore';
import { useErrorStore } from '../../stores/errorStore';

// Zod 验证 schema
const taskSchema = z.object({
  projectId: z.string().min(1, '必须选择项目'),
  moduleId: z.string().optional(),
  module: z.string().optional(),
  functionModule: z.string().optional(),
  description: z.string().min(1, '任务描述不能为空'),
  progress: z.number().min(0).max(100),
  status: z.enum(['todo', 'in-progress', 'review', 'done', 'blocked']),
  assignee: z.string().optional(),
  startDate: z.string().optional(),
  estimatedEndDate: z.string().optional(),
  issues: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.estimatedEndDate) {
      return new Date(data.startDate) <= new Date(data.estimatedEndDate);
    }
    return true;
  },
  {
    message: '开始时间不能晚于预计结束时间',
    path: ['estimatedEndDate'],
  }
);

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskEditDialogProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'todo', label: '待办' },
  { value: 'in-progress', label: '进行中' },
  { value: 'review', label: '审查中' },
  { value: 'done', label: '已完成' },
  { value: 'blocked', label: '已阻塞' },
];

export function TaskEditDialog({ open, task, onClose, onSave }: TaskEditDialogProps) {
  const { projects } = useProjectStore();
  const { addError } = useErrorStore();

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      projectId: '',
      moduleId: '',
      module: '',
      functionModule: '',
      description: '',
      progress: 0,
      status: 'todo',
      assignee: '',
      startDate: new Date().toISOString().split('T')[0],
      estimatedEndDate: '',
      issues: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (task) {
      reset({
        projectId: task.projectId,
        moduleId: task.moduleId || '',
        module: task.module || '',
        functionModule: task.functionModule || '',
        description: task.description,
        progress: task.progress,
        status: task.status as TaskStatus,
        assignee: task.assignee || '',
        startDate: task.startDate ? task.startDate.split('T')[0] : '',
        estimatedEndDate: task.estimatedEndDate ? task.estimatedEndDate.split('T')[0] : '',
        issues: task.issues || '',
        notes: task.notes || '',
      });
    } else {
      reset({
        projectId: '',
        moduleId: '',
        module: '',
        functionModule: '',
        description: '',
        progress: 0,
        status: 'todo',
        assignee: '',
        startDate: new Date().toISOString().split('T')[0],
        estimatedEndDate: '',
        issues: '',
        notes: '',
      });
    }
  }, [task, open, reset]);

  const onSubmit = (data: TaskFormData) => {
    onSave(data);
    addError(task ? '任务已更新' : '任务已创建', 'success');
    onClose();
  };

  const onError = (errs: FieldErrors<TaskFormData>) => {
    const firstError = Object.values(errs)[0];
    if (firstError && 'message' in firstError) {
      addError(firstError.message as string, 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={task ? '编辑任务' : '新建任务'}
      className="max-w-4xl"
    >
      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
        {/* 第一行：项目和模块 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Select
              label="项目 *"
              value={watch('projectId')}
              onChange={(e) => setValue('projectId', e.target.value)}
              options={[
                { value: '', label: '选择项目...' },
                ...projects.map(p => ({ value: p.id, label: `${p.name} (${p.type === 'personal' ? '个人' : '公司'})` })),
              ]}
            />
            {errors.projectId && (
              <p className="text-red-500 text-xs mt-1">{errors.projectId.message}</p>
            )}
          </div>
          <Input
            label="模块"
            value={watch('module') || ''}
            onChange={(e) => setValue('module', e.target.value)}
            placeholder="例如：用户管理"
          />
        </div>

        {/* 第二行：功能模块和责任人 */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="功能模块"
            value={watch('functionModule') || ''}
            onChange={(e) => setValue('functionModule', e.target.value)}
            placeholder="例如：登录注册"
          />
          <Input
            label="责任人"
            value={watch('assignee') || ''}
            onChange={(e) => setValue('assignee', e.target.value)}
            placeholder="负责人姓名"
          />
        </div>

        {/* 任务描述 */}
        <div>
          <TextArea
            label="任务描述 *"
            value={watch('description')}
            onChange={(e) => setValue('description', e.target.value)}
            rows={4}
            placeholder="详细描述任务内容..."
          />
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* 状态和进度 */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="状态"
            value={watch('status')}
            onChange={(e) => setValue('status', e.target.value as TaskStatus)}
            options={STATUS_OPTIONS}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              进度：{watch('progress')}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={watch('progress')}
              onChange={(e) => setValue('progress', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* 时间信息 */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="开始时间"
            type="date"
            value={watch('startDate') || ''}
            onChange={(e) => setValue('startDate', e.target.value)}
          />
          <div>
            <Input
              label="预计完成时间"
              type="date"
              value={watch('estimatedEndDate') || ''}
              onChange={(e) => setValue('estimatedEndDate', e.target.value)}
            />
            {errors.estimatedEndDate && (
              <p className="text-red-500 text-xs mt-1">{errors.estimatedEndDate.message}</p>
            )}
          </div>
        </div>

        {/* 存在的问题 */}
        <TextArea
          label="存在的问题"
          value={watch('issues') || ''}
          onChange={(e) => setValue('issues', e.target.value)}
          rows={3}
          placeholder="当前遇到的问题和困难..."
        />

        {/* 备注 */}
        <TextArea
          label="备注"
          value={watch('notes') || ''}
          onChange={(e) => setValue('notes', e.target.value)}
          rows={3}
          placeholder="其他备注信息..."
        />

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit">
            {task ? '保存修改' : '创建任务'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
