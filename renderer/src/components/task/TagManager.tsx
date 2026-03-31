import { useState } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import { TaskTag } from '../../types';

interface TagManagerProps {
  taskId: string;
  tags: TaskTag[];
  onAdd: (tagName: string, tagColor: string) => void;
  onDelete: (tagId: string) => void;
}

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TagManager({ taskId: _taskId, tags, onAdd, onDelete }: TagManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const handleAdd = () => {
    if (!newTagName.trim()) return;
    onAdd(newTagName.trim(), selectedColor);
    setNewTagName('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            标签
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {tags.length} 个标签
        </span>
      </div>

      {/* 标签列表 */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white"
            style={{ backgroundColor: tag.tagColor }}
          >
            {tag.tagName}
            <button
              onClick={() => onDelete(tag.id)}
              className="hover:bg-white/20 rounded p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {/* 添加标签 */}
      {showAdd ? (
        <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="标签名称..."
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          
          {/* 颜色选择 */}
          <div className="flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  selectedColor === color
                    ? 'border-gray-900 dark:border-white scale-110'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary-600"
            >
              添加
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
        >
          <Plus className="w-3 h-3" />
          添加标签
        </button>
      )}
    </div>
  );
}
