import { useState, useEffect } from 'react';
import { Dialog, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input, TextArea, Select } from '../ui/input';
import { Project } from '../../types';

interface ProjectEditDialogProps {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (project: Partial<Project>) => void;
}

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'personal', label: '个人项目' },
  { value: 'company', label: '公司项目' },
];

const COLORS = [
  '#3B82F6', // 蓝色
  '#10B981', // 绿色
  '#F59E0B', // 黄色
  '#EF4444', // 红色
  '#8B5CF6', // 紫色
  '#EC4899', // 粉色
  '#06B6D4', // 青色
  '#6366F1', // 靛蓝
];

export function ProjectEditDialog({ open, project, onClose, onSave }: ProjectEditDialogProps) {
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    type: 'personal',
    description: '',
    color: '#3B82F6',
  });

  useEffect(() => {
    if (project) {
      setFormData(project);
    } else {
      setFormData({
        name: '',
        type: 'personal',
        description: '',
        color: '#3B82F6',
      });
    }
  }, [project, open]);

  const handleSave = () => {
    if (!formData.name) {
      alert('请填写项目名称');
      return;
    }
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof Project, value: Project[keyof Project]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={project ? '编辑项目' : '新建项目'}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* 项目名称 */}
        <Input
          label="项目名称 *"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="例如：电商平台重构"
          autoFocus
        />

        {/* 项目类型 */}
        <Select
          label="项目类型 *"
          value={formData.type}
          onChange={(e) => handleChange('type', e.target.value as 'personal' | 'company')}
          options={TYPE_OPTIONS}
        />

        {/* 项目描述 */}
        <TextArea
          label="项目描述"
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          placeholder="描述项目的目标、范围等信息..."
        />

        {/* 项目颜色 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            项目颜色
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleChange('color', color)}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                  formData.color === color 
                    ? 'border-gray-900 dark:border-white scale-110' 
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded"
              style={{ backgroundColor: formData.color }}
            />
            <input
              type="text"
              value={formData.color}
              onChange={(e) => handleChange('color', e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
              placeholder="#3B82F6"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          取消
        </Button>
        <Button onClick={handleSave}>
          {project ? '保存修改' : '创建项目'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
