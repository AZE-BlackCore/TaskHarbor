import { useState, useEffect, useMemo } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useTaskStore } from '../../stores/taskStore';
import { ProjectCard } from '../../components/project/ProjectCard';
import { ProjectEditDialog } from '../../components/project/ProjectEditDialog';
import { ProjectSkeleton } from '../../components/ui/Skeleton';
import { cacheService, getProjectStatsCacheKey } from '../../utils/cache';
import { Plus, Grid, List, PieChart } from 'lucide-react';
import { Project } from '../../types';

interface ProjectListProps {
  onSelectProject?: (project: Project) => void;
}

export function ProjectList({ onSelectProject }: ProjectListProps) {
  const { projects, fetchProjects, createProject, updateProject, deleteProject, loading, setCurrentProject } = useProjectStore();
  const { tasks } = useTaskStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'personal' | 'company'>('all');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setShowEditDialog(true);
  };

  const handleDelete = async (projectId: string) => {
    if (confirm('确定要删除这个项目吗？删除后项目下的所有任务也会被删除！')) {
      await deleteProject(projectId);
    }
  };

  const handleSave = async (projectData: Partial<Project>) => {
    if (editingProject) {
      await updateProject(editingProject.id, projectData);
    } else {
      await createProject(projectData as { name: string; type: 'personal' | 'company'; description?: string; color?: string });
    }
    setShowEditDialog(false);
    setEditingProject(null);
  };

  // 计算项目统计（使用缓存优化）
  const getProjectStats = useMemo(() => {
    return (projectId: string): { taskCount: number; completedCount: number; averageProgress: number } => {
      const cacheKey = getProjectStatsCacheKey(projectId);
      const cached = cacheService.get<{ taskCount: number; completedCount: number; averageProgress: number }>(cacheKey);
      if (cached) return cached;

      const projectTasks = tasks.filter(t => t.projectId === projectId);
      const completed = projectTasks.filter(t => t.status === 'done').length;
      const avgProgress = projectTasks.length > 0
        ? Math.round(projectTasks.reduce((sum, t) => sum + t.progress, 0) / projectTasks.length)
        : 0;

      const stats = { taskCount: projectTasks.length, completedCount: completed, averageProgress: avgProgress };
      cacheService.set(cacheKey, stats, 5000);
      return stats;
    };
  }, [tasks]);

  const filteredProjects = projects.filter(project => {
    if (filterType === 'all') return true;
    return project.type === filterType;
  });

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-dark-bg">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-dark-card border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-4">
          {/* 过滤选项 */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded p-1">
            {(['all', 'personal', 'company'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  filterType === type
                    ? 'bg-white dark:bg-dark-card shadow text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {type === 'all' ? '全部' : type === 'personal' ? '个人' : '公司'}
              </button>
            ))}
          </div>

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
              onClick={() => { setEditingProject(null); setShowEditDialog(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              新建项目
            </button>
          </div>
        </div>
      </div>

      {/* 项目列表 */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <ProjectSkeleton />
        ) : filteredProjects.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <PieChart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">暂无项目</h3>
              <p>点击右上角「新建项目」开始创建</p>
            </div>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {filteredProjects.map((project) => {
              const stats = getProjectStats(project.id);
              return viewMode === 'grid' ? (
                <ProjectCard
                  key={project.id}
                  project={project}
                  {...stats}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onClick={(p) => {
                    setCurrentProject(p.id);
                    onSelectProject?.(p);
                  }}
                />
              ) : (
                <div
                  key={project.id}
                  className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer flex items-center gap-4"
                  onClick={() => {
                    setCurrentProject(project.id);
                    onSelectProject?.(project);
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: project.color + '20' }}
                  >
                    <Plus className="w-6 h-6" style={{ color: project.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {stats.taskCount} 个任务 · 平均进度 {stats.averageProgress}%
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    project.type === 'personal'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                  }`}>
                    {project.type === 'personal' ? '个人' : '公司'}
                  </span>
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
            <span className="text-gray-600 dark:text-gray-400">总项目数:</span>
            <span className="ml-2 font-bold text-gray-900 dark:text-white">{projects.length}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">个人项目:</span>
            <span className="ml-2 font-bold text-purple-600 dark:text-purple-400">
              {projects.filter(p => p.type === 'personal').length}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">公司项目:</span>
            <span className="ml-2 font-bold text-blue-600 dark:text-blue-400">
              {projects.filter(p => p.type === 'company').length}
            </span>
          </div>
          <div className="flex-1" />
          <div>
            <span className="text-gray-600 dark:text-gray-400">总任务数:</span>
            <span className="ml-2 font-bold text-primary">{tasks.length}</span>
          </div>
        </div>
      </div>

      <ProjectEditDialog
        open={showEditDialog}
        project={editingProject}
        onClose={() => { setShowEditDialog(false); setEditingProject(null); }}
        onSave={handleSave}
      />
    </div>
  );
}
