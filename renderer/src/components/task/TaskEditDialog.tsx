import { useState, useEffect } from 'react';
import { Dialog, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input, TextArea, Select } from '../ui/input';
import { Task, TaskStatus } from '../../types';
import { useProjectStore } from '../../stores/projectStore';

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
  const [formData, setFormData] = useState<Partial<Task>>({
    projectId: '',
    moduleId: '',
    module: '',
    functionModule: '',
    description: '',
    progress: 0,
    status: 'todo',
    assignee: '',
    startDate: '',
    estimatedEndDate: '',
    issues: '',
    notes: '',
  });

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        startDate: task.startDate ? task.startDate.split('T')[0] : '',
        estimatedEndDate: task.estimatedEndDate ? task.estimatedEndDate.split('T')[0] : '',
      });
    } else {
      setFormData({
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
  }, [task, open]);

  const handleSave = () => {
    if (!formData.description || !formData.projectId) {
      alert('请填写任务描述和选择项目');
      return;
    }
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof Task, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={task ? '编辑任务' : '新建任务'}
      className="max-w-4xl"
    >
      <div className="space-y-4">
        {/* 第一行：项目和模块 */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="项目 *"
            value={formData.projectId}
            onChange={(e) => handleChange('projectId', e.target.value)}
            options={[
              { value: '', label: '选择项目...' },
              ...projects.map(p => ({ value: p.id, label: `${p.name} (${p.type === 'personal' ? '个人' : '公司'})` })),
            ]}
          />
          <Input
            label="模块"
            value={formData.module || ''}
            onChange={(e) => handleChange('module', e.target.value)}
            placeholder="例如：用户管理"
          />
        </div>

        {/* 第二行：功能模块和责任人 */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="功能模块"
            value={formData.functionModule || ''}
            onChange={(e) => handleChange('functionModule', e.target.value)}
            placeholder="例如：登录注册"
          />
          <Input
            label="责任人"
            value={formData.assignee || ''}
            onChange={(e) => handleChange('assignee', e.target.value)}
            placeholder="负责人姓名"
          />
        </div>

        {/* 任务描述 */}
        <TextArea
          label="任务描述 *"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          placeholder="详细描述任务内容..."
        />

        {/* 状态和进度 */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="状态"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as TaskStatus)}
            options={STATUS_OPTIONS}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              进度：{formData.progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.progress}
              onChange={(e) => handleChange('progress', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* 时间信息 */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="开始时间"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
          />
          <Input
            label="预计完成时间"
            type="date"
            value={formData.estimatedEndDate}
            onChange={(e) => handleChange('estimatedEndDate', e.target.value)}
          />
        </div>

        {/* 存在的问题 */}
        <TextArea
          label="存在的问题"
          value={formData.issues || ''}
          onChange={(e) => handleChange('issues', e.target.value)}
          rows={3}
          placeholder="当前遇到的问题和困难..."
        />

        {/* 备注 */}
        <TextArea
          label="备注"
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          placeholder="其他备注信息..."
        />
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          取消
        </Button>
        <Button onClick={handleSave}>
          {task ? '保存修改' : '创建任务'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
