import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from './ui/sidebar';
import { 
  List, 
  Calendar as CalendarIcon, 
  BarChart3, 
  Columns, 
  Network,
  Sun,
  Moon,
  Plus,
  FolderOpen,
  Grid3X3,
  Settings,
  Clock
} from 'lucide-react';
import { SettingsPanel } from './settings/SettingsPanel';
import { ToastContainer } from './ui/Toast';
import { useViewStore } from '../stores/viewStore';
import type { ViewType } from '../stores/viewStore';
import { useViewConfigStore } from '../stores/viewConfigStore';
import { useProjectStore } from '../stores/projectStore';
import { useTaskStore } from '../stores/taskStore';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  List,
  Grid3X3,
  Network,
  Columns,
  Calendar: CalendarIcon,
  BarChart3,
  Clock,
};

interface LayoutProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export function Layout({ darkMode, toggleDarkMode }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setView } = useViewStore();
  const { views, loadViews } = useViewConfigStore();
  const { projects, fetchProjects, createProject } = useProjectStore();
  const { fetchTasks } = useTaskStore();
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState<'personal' | 'company'>('personal');

  useEffect(() => {
    loadViews();
    fetchProjects();
    fetchTasks();
  }, [loadViews, fetchProjects, fetchTasks]);

  const handleViewChange = (view: string, path: string) => {
    setView(view as ViewType);
    navigate(path);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    const project = await createProject({
      name: newProjectName,
      type: newProjectType,
      color: newProjectType === 'personal' ? '#8B5CF6' : '#3B82F6',
    });
    
    if (project) {
      setNewProjectName('');
      setShowNewProjectDialog(false);
    }
  };

  return (
    <div className="flex h-screen bg-light-bg dark:bg-dark-bg">
      {/* 侧边栏 */}
      <Sidebar className="w-64 border-r border-light-border dark:border-dark-border bg-white dark:bg-dark-card">
        <SidebarHeader className="p-4 border-b border-light-border dark:border-dark-border">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Todo List
            </h1>
          </div>
        </SidebarHeader>

        <SidebarContent className="flex-1 overflow-y-auto p-4">
          {/* 视图切换 - 动态渲染 */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              视图
            </h3>
            <SidebarMenu>
              {views.filter(v => v.enabled).map((view) => {
                const IconComponent = ICON_MAP[view.icon] || List;
                return (
                  <SidebarMenuItem key={view.id}>
                    <SidebarMenuButton
                      onClick={() => handleViewChange(view.id, view.path)}
                      active={location.pathname === view.path || (view.id === 'list' && location.pathname === '/')}
                      icon={<IconComponent className="w-4 h-4" />}
                    >
                      {view.name}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </div>

          {/* 项目列表 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                项目
              </h3>
              <button
                onClick={() => setShowNewProjectDialog(true)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <SidebarMenu>
              {projects.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    onClick={() => navigate(`/list?project=${project.id}`)}
                    icon={
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: project.color }}
                      />
                    }
                  >
                    {project.name}
                    <span className="text-xs text-gray-500 ml-auto">
                      {project.type === 'personal' ? '个人' : '公司'}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        </SidebarContent>

        <SidebarFooter className="p-4 border-t border-light-border dark:border-dark-border">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors mb-2"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm">设置</span>
          </button>
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-2 w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            {darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
            <span className="text-sm">
              {darkMode ? '浅色模式' : '深色模式'}
            </span>
          </button>
        </SidebarFooter>
      </Sidebar>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* 新建项目对话框 */}
      {showNewProjectDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-lg p-6 w-96 shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              新建项目
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  项目名称
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="输入项目名称..."
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  项目类型
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="projectType"
                      checked={newProjectType === 'personal'}
                      onChange={() => setNewProjectType('personal')}
                      className="text-primary"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">个人项目</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="projectType"
                      checked={newProjectType === 'company'}
                      onChange={() => setNewProjectType('company')}
                      className="text-primary"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">公司项目</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewProjectDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleCreateProject}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 设置面板 */}
      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />

      {/* Toast 通知容器 */}
      <ToastContainer />
    </div>
  );
}
