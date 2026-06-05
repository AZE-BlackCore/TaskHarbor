import { useState } from 'react';
import { MoreHorizontal, Edit2, Trash2, Tag } from 'lucide-react';
import type { Tag as TagType } from '../../types';

interface TagCardProps {
  tag: TagType;
  taskCount: number;
  completedCount: number;
  averageProgress: number;
  onEdit: (tag: TagType) => void;
  onDelete: (tagId: string) => void;
  onClick: (tag: TagType) => void;
}

export function TagCard({ tag, taskCount, completedCount, averageProgress, onEdit, onDelete, onClick }: TagCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer group relative"
      onClick={() => onClick(tag)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: tag.color + '20' }}
          >
            <Tag className="w-6 h-6" style={{ color: tag.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{tag.name}</h3>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-500" />
          </button>

          {showMenu && (
            <>
              <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-md shadow-lg z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onEdit(tag);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  编辑
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onDelete(tag.id);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              </div>
              <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
            </>
          )}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">进度</span>
          <span className="font-medium text-gray-900 dark:text-white">{averageProgress}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${averageProgress}%`, backgroundColor: tag.color }}
          />
        </div>
      </div>

      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div>
          <span className="font-medium text-gray-900 dark:text-white">{taskCount}</span> 个任务
        </div>
        <div>
          <span className="font-medium text-green-600 dark:text-green-400">{completedCount}</span> 已完成
        </div>
      </div>
    </div>
  );
}
