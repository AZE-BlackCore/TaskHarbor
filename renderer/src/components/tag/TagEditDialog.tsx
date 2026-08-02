import { useState, useEffect } from 'react';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import type { Tag } from '../../types';

interface TagEditDialogProps {
  open: boolean;
  tag: Tag | null;
  onClose: () => void;
  onSave: (tagData: Partial<Tag>) => Promise<void>;
}

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

export function TagEditDialog({ open, tag, onClose, onSave }: TagEditDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');

  useEffect(() => {
    if (tag) {
      setName(tag.name);
      setColor(tag.color);
    } else {
      setName('');
      setColor('#3B82F6');
    }
  }, [tag, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave({ name: name.trim(), color });
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      title={tag ? '编辑标签' : '新建标签'} 
      className="sm:max-w-md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            标签名称
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入标签名称"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            标签颜色
          </label>
          <div className="flex gap-2 flex-wrap items-center">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${
                  color === c ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            {/* Custom color picker */}
            <div className="relative w-10 h-10">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 w-full h-full rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer opacity-0"
                title="自定义颜色"
              />
              <div
                className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center"
                style={{ backgroundColor: color && !COLORS.includes(color) ? color : 'transparent' }}
              >
                {!COLORS.includes(color) && (
                  <span className="text-xs text-gray-400">+</span>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            当前: <span className="font-mono">{color}</span>
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-5">
        <Button variant="secondary" onClick={onClose}>
          取消
        </Button>
        <Button onClick={handleSave} disabled={!name.trim()}>
          保存
        </Button>
      </div>
    </Dialog>
  );
}
