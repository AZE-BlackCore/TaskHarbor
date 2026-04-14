import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useViewStore } from '../stores/viewStore';
import type { ViewType } from '../stores/viewStore';
import { useViewConfigStore } from '../stores/viewConfigStore';
import { SettingsPanel } from './settings/SettingsPanel';
import { ToastContainer } from './ui/Toast';
import { 
  Sun, 
  Moon, 
  FolderOpen,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface LayoutProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export function Layout({ darkMode, toggleDarkMode }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setView } = useViewStore();
  const { views, loadViews } = useViewConfigStore();
  const [showSettings, setShowSettings] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    loadViews();
  }, [loadViews]);

  const handleViewChange = (view: string, path: string) => {
    setView(view as ViewType);
    navigate(path);
  };

  const NAV_W = collapsed ? 'w-16' : 'w-52';

  return (
    <div className="flex h-screen bg-light-bg dark:bg-dark-bg">
      {/* 侧边导航 */}
      <nav
        className={`${NAV_W} flex flex-col items-center py-4 border-r border-light-border dark:border-dark-border bg-white dark:bg-dark-card transition-all duration-300 ease-in-out`}
      >
        {/* 顶部 Logo + 名称 */}
        <div className={`flex items-center gap-3 mb-6 ${collapsed ? 'justify-center' : 'px-3'}`}>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap overflow-hidden">
              TaskHarbor
            </span>
          )}
        </div>

        {/* 视图切换 */}
        <div className="flex flex-col gap-1 w-full px-2">
          {views.filter(v => v.enabled).map((view) => {
            const isActive = location.pathname === view.path || (view.id === 'projects' && location.pathname === '/');
            return (
              <button
                key={view.id}
                onClick={() => handleViewChange(view.id, view.path)}
                className={`h-11 rounded-lg flex items-center gap-3 transition-colors ${
                  collapsed ? 'justify-center px-0' : 'px-3'
                } ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={collapsed ? view.name : undefined}
              >
                <span className="flex-shrink-0">
                  {view.id === 'projects' ? (
                    <FolderOpen className="w-5 h-5" />
                  ) : (
                    <CalendarIcon className="w-5 h-5" />
                  )}
                </span>
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">{view.name}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 底部按钮 */}
        <div className="mt-auto flex flex-col gap-1 w-full px-2">
          <button
            onClick={() => setShowSettings(true)}
            className={`h-11 rounded-lg flex items-center gap-3 transition-colors ${
              collapsed ? 'justify-center px-0' : 'px-3'
            } text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800`}
            title={collapsed ? '设置' : undefined}
          >
            <span className="flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            {!collapsed && <span className="text-sm font-medium">设置</span>}
          </button>
          <button
            onClick={toggleDarkMode}
            className={`h-11 rounded-lg flex items-center gap-3 transition-colors ${
              collapsed ? 'justify-center px-0' : 'px-3'
            } text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800`}
            title={collapsed ? (darkMode ? '浅色模式' : '深色模式') : undefined}
          >
            <span className="flex-shrink-0">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </span>
            {!collapsed && (
              <span className="text-sm font-medium">{darkMode ? '浅色模式' : '深色模式'}</span>
            )}
          </button>
          {/* 收缩/展开按钮 */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`h-11 rounded-lg flex items-center gap-3 transition-colors ${
              collapsed ? 'justify-center px-0' : 'px-3'
            } text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 mt-1`}
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            <span className="flex-shrink-0">
              {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </span>
            {!collapsed && <span className="text-sm font-medium">收起</span>}
          </button>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

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
