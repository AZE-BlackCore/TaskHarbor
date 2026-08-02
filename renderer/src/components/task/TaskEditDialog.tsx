import { useEffect, useState } from 'react';
import { useForm, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input, TextArea, Select } from '../ui/input';
import { Task, TaskStatus } from '../../types';
import { useTagStore } from '../../stores/tagStore';
import { useErrorStore } from '../../stores/errorStore';
import { Clock, Bell, Tag as TagIcon, AlertCircle } from 'lucide-react';

// Zod 验证 schema
const taskSchema = z.object({
  description: z.string().min(1, '任务描述不能为空'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['todo', 'in-progress', 'review', 'done', 'blocked']).default('todo'),
  progress: z.number().min(0).max(100).default(0),
  module: z.string().optional(),
  functionModule: z.string().optional(),
  assignee: z.string().optional(),
  startDate: z.string().optional(),
  estimatedEndDate: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
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

const STATUS_OPTIONS: Array<{ value: string; label: string; color: string }> = [
  { value: 'todo', label: '待办', color: 'bg-gray-400' },
  { value: 'in-progress', label: '进行中', color: 'bg-blue-500' },
  { value: 'review', label: '等待确认', color: 'bg-yellow-500' },
  { value: 'done', label: '已完成', color: 'bg-green-500' },
  { value: 'blocked', label: '已暂停', color: 'bg-red-500' },
];

const PRIORITY_OPTIONS: Array<{ value: string; label: string; color: string; bgColor: string }> = [
  { value: 'low', label: '低', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700' },
  { value: 'medium', label: '中', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700' },
  { value: 'high', label: '高', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700' },
];

const REMINDER_CYCLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'once',    label: '仅一次' },
  { value: 'daily',   label: '每天' },
  { value: 'weekly',  label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'custom',  label: '自定义周期' },
];

export function TaskEditDialog({ open, task, onClose, onSave }: TaskEditDialogProps) {
  const { tags, fetchTags } = useTagStore();
  const { addError } = useErrorStore();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema) as any,
    defaultValues: {
      description: '',
      priority: 'medium',
      status: 'todo',
      progress: 0,
      module: '',
      functionModule: '',
      assignee: '',
      startDate: new Date().toISOString().split('T')[0],
      estimatedEndDate: '',
      tagIds: [],
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
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    if (task) {
      reset({
        description: task.description,
        priority: (task as any).priority || 'medium',
        status: task.status as TaskStatus,
        progress: task.progress,
        module: task.module || '',
        functionModule: task.functionModule || '',
        assignee: task.assignee || '',
        startDate: task.startDate ? task.startDate.split('T')[0] : '',
        estimatedEndDate: task.estimatedEndDate ? task.estimatedEndDate.split('T')[0] : '',
        tagIds: (task as any).tagIds || [],
        issues: task.issues || '',
        notes: task.notes || '',
        reminderEnabled: !!(task as any).reminderEnabled || false,
        reminderTime: (task as any).reminderTime || '',
        reminderCycle: (task as any).reminderCycle || 'once',
        reminderIntervalDays: (task as any).reminderIntervalDays ?? 1,
        reminderIntervalHours: (task as any).reminderIntervalHours ?? 0,
        customReminderTimes: (task as any).customReminderTimes || '',
      });
      setSelectedTagIds((task as any).tagIds || []);
    } else {
      reset({
        description: '',
        priority: 'medium',
        status: 'todo',
        progress: 0,
        module: '',
        functionModule: '',
        assignee: '',
        startDate: new Date().toISOString().split('T')[0],
        estimatedEndDate: '',
        tagIds: [],
        issues: '',
        notes: '',
        reminderEnabled: false,
        reminderTime: '',
        reminderCycle: 'once',
        reminderIntervalDays: 1,
        reminderIntervalHours: 0,
        customReminderTimes: '',
      });
      setSelectedTagIds([]);
    }
  }, [task, open, reset]);

  const onSubmit = async (data: TaskFormData) => {
    // 合并表单数据和标签、优先级
    const taskData = {
      ...data,
      priority: data.priority || 'medium',
    } as Partial<Task>;
    
    // 添加 tagIds 到任务数据
    (taskData as any).tagIds = selectedTagIds;
    
    // 保存任务
    onSave(taskData);

    // 保存标签关联
    if (task?.id && window.electronAPI) {
      try {
        // 先清除所有旧标签关联
        const currentTags = await window.electronAPI.getTags(task.id);
        if (currentTags.success && currentTags.data) {
          for (const tag of currentTags.data) {
            await window.electronAPI.removeTagFromTask(task.id, tag.id as string);
          }
        }
        // 添加新标签关联
        for (const tagId of selectedTagIds) {
          await window.electronAPI.addTagToTask(task.id, tagId);
        }
      } catch (err) {
        console.error('[TaskEditDialog] 保存标签关联失败:', err);
      }
    }

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
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit(onSubmit as any, onError)} className="space-y-5">
        {/* 任务描述 - 优先显示 */}
        <div>
          <TextArea
            label="任务描述 *"
            value={watch('description')}
            onChange={(e) => setValue('description', e.target.value)}
            rows={3}
            placeholder="详细描述任务内容..."
          />
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* 优先级和状态 - 横向排列 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 优先级选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              优先级
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('priority', opt.value as 'low' | 'medium' | 'high')}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    watch('priority') === opt.value
                      ? `${opt.bgColor} ${opt.color} border-current`
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 状态选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              状态
            </label>
            <Select
              value={watch('status')}
              onChange={(e) => setValue('status', e.target.value as TaskStatus)}
              options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))}
            />
          </div>
        </div>

        {/* 进度条 */}
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
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* 分类和位置 */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="分类"
            value={watch('module') || ''}
            onChange={(e) => setValue('module', e.target.value)}
            placeholder="例如：工作、生活、学习"
          />
          <Input
            label="子分类"
            value={watch('functionModule') || ''}
            onChange={(e) => setValue('functionModule', e.target.value)}
            placeholder="例如：项目A、健身、阅读"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="负责人"
            value={watch('assignee') || ''}
            onChange={(e) => setValue('assignee', e.target.value)}
            placeholder="负责人姓名或自己"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="开始日期"
              type="date"
              value={watch('startDate') || ''}
              onChange={(e) => setValue('startDate', e.target.value)}
            />
            <Input
              label="截止日期"
              type="date"
              value={watch('estimatedEndDate') || ''}
              onChange={(e) => setValue('estimatedEndDate', e.target.value)}
            />
          </div>
        </div>

        {/* 标签选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <span className="flex items-center gap-1">
              <TagIcon className="w-4 h-4" />
              标签
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.length === 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">暂无标签，请先创建标签</span>
            )}
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  if (selectedTagIds.includes(tag.id)) {
                    setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id));
                  } else {
                    setSelectedTagIds([...selectedTagIds, tag.id]);
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2 ${
                  selectedTagIds.includes(tag.id)
                    ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900'
                    : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: selectedTagIds.includes(tag.id) 
                    ? tag.color + '20' 
                    : 'transparent',
                  borderColor: tag.color,
                  color: tag.color,
                }}
              >
                {tag.name}
              </button>
            ))}
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

        {/* 遇到的问题 */}
        <TextArea
          label="遇到的问题"
          value={watch('issues') || ''}
          onChange={(e) => setValue('issues', e.target.value)}
          rows={2}
          placeholder="记录执行中遇到的困难或障碍..."
        />

        {/* 备注 */}
        <TextArea
          label="补充说明"
          value={watch('notes') || ''}
          onChange={(e) => setValue('notes', e.target.value)}
          rows={2}
          placeholder="附加信息、参考资料、想法备注等..."
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
