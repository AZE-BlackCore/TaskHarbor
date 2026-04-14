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
import { Clock, Bell } from 'lucide-react';

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
  // 提醒相关字段
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().optional(),
  reminderCycle: z.enum(['once', 'daily', 'weekly', 'monthly', 'custom']).optional(),
  reminderIntervalDays: z.number().min(0).max(365).optional(),
  reminderIntervalHours: z.number().min(0).max(23).optional(),
  customReminderTimes: z.string().optional(),
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

const REMINDER_CYCLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'once',    label: '仅一次' },
  { value: 'daily',   label: '每天' },
  { value: 'weekly',  label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'custom',  label: '自定义周期' },
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
      reminderEnabled: false,
      reminderTime: '',
      reminderCycle: 'once',
      reminderIntervalDays: 1,
      reminderIntervalHours: 0,
      customReminderTimes: '',
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
        // 提醒相关 - 从 notes 或扩展字段解析
        reminderEnabled: !!(task as any).reminderEnabled || false,
        reminderTime: (task as any).reminderTime || '',
        reminderCycle: (task as any).reminderCycle || 'once',
        reminderIntervalDays: (task as any).reminderIntervalDays ?? 1,
        reminderIntervalHours: (task as any).reminderIntervalHours ?? 0,
        customReminderTimes: (task as any).customReminderTimes || '',
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
        reminderEnabled: false,
        reminderTime: '',
        reminderCycle: 'once',
        reminderIntervalDays: 1,
        reminderIntervalHours: 0,
        customReminderTimes: '',
      });
    }
  }, [task, open, reset]);

  const onSubmit = async (data: TaskFormData) => {
    // 先保存任务（不含提醒字段，onSave 由父组件处理）
    onSave(data);

    // 保存提醒到数据库
    if (window.electronAPI?.createReminder && task?.id) {
      try {
        // 先删除旧提醒，再按需重建
        await window.electronAPI.deleteRemindersByTask(task.id);
        if (data.reminderEnabled && data.reminderTime) {
          await window.electronAPI.createReminder({
            taskId: task.id,
            reminderTime: new Date(data.reminderTime).toISOString(),
            cycle: (data.reminderCycle as any) || 'once',
            intervalDays: data.reminderIntervalDays ?? 1,
            intervalHours: data.reminderIntervalHours ?? 0,
            customTimes: data.customReminderTimes || undefined,
          });
        }
      } catch (err) {
        console.error('[TaskEditDialog] 保存提醒失败:', err);
      }
    }

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

        {/* 提醒设置 */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">任务提醒设置</h4>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="reminderEnabled"
              checked={watch('reminderEnabled')}
              onChange={(e) => setValue('reminderEnabled', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
            />
            <label htmlFor="reminderEnabled" className="text-sm text-gray-700 dark:text-gray-300">
              启用任务提醒
            </label>
          </div>

          {watch('reminderEnabled') && (
            <div className="space-y-3 pl-6 border-l-2 border-primary/30">
              {/* 提醒时间 + 提醒周期 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    首次提醒时间
                  </label>
                  <Input
                    type="datetime-local"
                    value={watch('reminderTime') || ''}
                    onChange={(e) => setValue('reminderTime', e.target.value)}
                    placeholder="选择提醒时间"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    提醒周期
                  </label>
                  <Select
                    value={watch('reminderCycle') || 'once'}
                    onChange={(e) => setValue('reminderCycle', e.target.value as any)}
                    options={REMINDER_CYCLE_OPTIONS}
                  />
                </div>
              </div>

              {/* 自定义周期：间隔天数 + 间隔小时 */}
              {watch('reminderCycle') === 'custom' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        间隔天数
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={365}
                          value={watch('reminderIntervalDays') ?? 1}
                          onChange={(e) => setValue('reminderIntervalDays', parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">天</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        间隔小时
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={23}
                          value={watch('reminderIntervalHours') ?? 0}
                          onChange={(e) => setValue('reminderIntervalHours', parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">小时</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      每日固定提醒时间点（多个用逗号分隔，与间隔模式二选一）
                    </label>
                    <Input
                      value={watch('customReminderTimes') || ''}
                      onChange={(e) => setValue('customReminderTimes', e.target.value)}
                      placeholder="例如：09:00,14:00,18:00"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      填写此项时，将忽略上方的间隔天数/小时，改为每天在指定时刻触发
                    </p>
                  </div>
                </div>
              )}

              {/* 说明卡片 */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">提醒周期说明：</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li><strong>仅一次</strong>：在指定时间提醒一次，触发后自动停止</li>
                      <li><strong>每天</strong>：每天的指定时刻自动提醒</li>
                      <li><strong>每周</strong>：每周的同一天同一时刻提醒</li>
                      <li><strong>每月</strong>：每月的同一日期提醒</li>
                      <li><strong>自定义周期</strong>：按间隔天数/小时重复，或设置每日多个固定时间点</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
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
