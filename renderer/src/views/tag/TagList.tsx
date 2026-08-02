import { useState, useEffect } from 'react';
import { useTagStore } from '../../stores/tagStore';
import { useTaskStore } from '../../stores/taskStore';
import { TagCard } from '../../components/tag/TagCard';
import { TagEditDialog } from '../../components/tag/TagEditDialog';
import { ProjectSkeleton } from '../../components/ui/Skeleton';
import { Plus, Grid, List, PieChart } from 'lucide-react';
import type { Tag } from '../../types';

interface TagStatsMap {
  [tagId: string]: { taskCount: number; completedCount: number; averageProgress: number };
}

interface TagListProps {
  onSelectTag?: (tag: Tag) => void;
}

export function TagList({ onSelectTag }: TagListProps) {
  const { tags, fetchTags, createTag, updateTag, deleteTag, getTagStats, loading, setCurrentTag } = useTagStore();
  const { tasks, fetchTasks } = useTaskStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [statsMap, setStatsMap] = useState<TagStatsMap>({});

  useEffect(() => {
    fetchTags();
    fetchTasks();
  }, [fetchTags, fetchTasks]);

  // Fetch real stats for each tag from backend
  useEffect(() => {
    if (tags.length === 0) return;
    let cancelled = false;
    (async () => {
      const map: TagStatsMap = {};
      for (const tag of tags) {
        const stats = await getTagStats(tag.id);
        if (stats) {
          const byStatus = stats.byStatus || [];
          const taskCount = stats.totalTasks;
          const completedCount = byStatus.find((s: any) => s.status === 'done')?.count || 0;
          map[tag.id] = { taskCount, completedCount, averageProgress: stats.averageProgress };
        } else {
          map[tag.id] = { taskCount: 0, completedCount: 0, averageProgress: 0 };
        }
      }
      if (!cancelled) setStatsMap(map);
    })();
    return () => { cancelled = true; };
  }, [tags, getTagStats]);

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setShowEditDialog(true);
  };

  const handleDelete = async (tagId: string) => {
    if (confirm('确定要删除这个标签吗？')) {
      await deleteTag(tagId);
    }
  };

  const handleSave = async (tagData: Partial<Tag>) => {
    if (editingTag) {
      await updateTag(editingTag.id, tagData);
    } else {
      await createTag(tagData as { name: string; color?: string });
    }
    setShowEditDialog(false);
    setEditingTag(null);
  };

  const getStats = (tagId: string) => {
    return statsMap[tagId] || { taskCount: 0, completedCount: 0, averageProgress: 0 };
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-dark-bg">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-dark-card border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-4">
          {/* 视图切换 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setEditingTag(null); setShowEditDialog(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              新建标签
            </button>
          </div>
        </div>
      </div>

      {/* 标签列表 */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <ProjectSkeleton />
        ) : tags.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <PieChart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">暂无标签</h3>
              <p>点击右上角「新建标签」开始创建</p>
            </div>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {tags.map((tag) => {
              const stats = getStats(tag.id);
              return viewMode === 'grid' ? (
                <TagCard
                  key={tag.id}
                  tag={tag}
                  {...stats}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onClick={(t) => {
                    setCurrentTag(t.id);
                    onSelectTag?.(t);
                  }}
                />
              ) : (
                <div
                  key={tag.id}
                  className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer flex items-center gap-4"
                  onClick={() => {
                    setCurrentTag(tag.id);
                    onSelectTag?.(tag);
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: tag.color + '20' }}
                  >
                    <PieChart className="w-6 h-6" style={{ color: tag.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{tag.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {stats.taskCount} 个任务 · 平均进度 {stats.averageProgress}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      <div className="flex-shrink-0 px-6 py-3 bg-white dark:bg-dark-card border-t border-light-border dark:border-dark-border">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">总标签数:</span>
            <span className="ml-2 font-bold text-gray-900 dark:text-white">{tags.length}</span>
          </div>
          <div className="flex-1" />
          <div>
            <span className="text-gray-600 dark:text-gray-400">总任务数:</span>
            <span className="ml-2 font-bold text-primary">{tasks.length}</span>
          </div>
        </div>
      </div>

      <TagEditDialog
        open={showEditDialog}
        tag={editingTag}
        onClose={() => { setShowEditDialog(false); setEditingTag(null); }}
        onSave={handleSave}
      />
    </div>
  );
}
