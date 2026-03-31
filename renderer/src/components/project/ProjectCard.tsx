import { FolderOpen, Users, CheckCircle, TrendingUp, Edit2, Trash2 } from 'lucide-react';
import { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
  taskCount?: number;
  completedCount?: number;
  averageProgress?: number;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onClick: (project: Project) => void;
}

export function ProjectCard({ 
  project, 
  taskCount = 0, 
  completedCount = 0, 
  averageProgress = 0,
  onEdit, 
  onDelete,
  onClick 
}: ProjectCardProps) {
  const typeColor = project.type === 'personal' 
    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' 
    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
  
  const typeName = project.type === 'personal' ? '个人' : '公司';

  return (
    <div 
      className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick(project)}
    >
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: project.color + '20' }}
          >
            <FolderOpen 
              className="w-5 h-5" 
              style={{ color: project.color }}
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {project.name}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor}`}>
              {typeName}项目
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(project);
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project.id);
            }}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      {/* 描述 */}
      {project.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
            <Users className="w-3 h-3" />
            <span className="text-xs">任务数</span>
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {taskCount}
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
            <CheckCircle className="w-3 h-3" />
            <span className="text-xs">已完成</span>
          </div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {completedCount}
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs">进度</span>
          </div>
          <div className="text-lg font-bold text-primary">
            {averageProgress}%
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500 dark:text-gray-400">整体进度</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium">{averageProgress}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ 
              width: `${averageProgress}%`,
              backgroundColor: project.color 
            }}
          />
        </div>
      </div>

      {/* 创建时间 */}
      <div className="text-xs text-gray-400 dark:text-gray-500">
        创建于 {new Date(project.createdAt).toLocaleDateString('zh-CN', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </div>
    </div>
  );
}
