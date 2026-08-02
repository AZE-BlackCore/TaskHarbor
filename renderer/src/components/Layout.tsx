import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useViewStore } from '../stores/viewStore';
import type { ViewType } from '../stores/viewStore';
import { useViewConfigStore } from '../stores/viewConfigStore';
import { useTagStore } from '../stores/tagStore';
import { useUserProfileStore } from '../stores/userProfileStore';
import { SettingsPanel } from './settings/SettingsPanel';
import { TagEditDialog } from './tag/TagEditDialog';
import { ToastContainer } from './ui/Toast';
import {
  Sun,
  Moon,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  RefreshCw,
  Sparkles,
  FileText,
  CalendarDays,
  Inbox,
  BarChart3,
  FolderOpen,
  Plus,
  Settings,
  Trash2,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import type { Tag as TagType } from '../types';

interface LayoutProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const MAIN_NAV: NavItem[] = [
  { id: 'day-todo', label: 'Day Todo', icon: <Sparkles className="w-5 h-5" />, path: '/day-todo' },
  { id: 'recent', label: '最近待办', icon: <FileText className="w-5 h-5" />, path: '/recent' },
  { id: 'schedule', label: '日程概览', icon: <CalendarDays className="w-5 h-5" />, path: '/schedule' },
  { id: 'inbox', label: '待办箱', icon: <Inbox className="w-5 h-5" />, path: '/inbox' },
  { id: 'review', label: '数据复盘', icon: <BarChart3 className="w-5 h-5" />, path: '/review' },
];

export function Layout({ darkMode, toggleDarkMode }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setView } = useViewStore();
  const { views, loadViews } = useViewConfigStore();
  const { tags, fetchTags, createTag, setCurrentTag } = useTagStore();
  const { profile } = useUserProfileStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<{ categories: boolean; tags: boolean }>({
    categories: false,
    tags: false,
  });

  useEffect(() => {
    loadViews();
    fetchTags();
  }, [loadViews, fetchTags]);

  const handleNavClick = (item: NavItem) => {
    setView(item.id as ViewType);
    navigate(item.path);
  };

  const toggleSection = (section: 'categories' | 'tags') => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleTagClick = (tag: TagType) => {
    setCurrentTag(tag.id);
    navigate('/tags');
  };

  const handleTagSave = async (tagData: Partial<TagType>) => {
    await createTag(tagData as { name: string; color?: string });
    setShowTagDialog(false);
  };

  const NAV_W = collapsed ? 'w-16' : 'w-64';

  return (
    <div className="flex h-screen bg-light-bg dark:bg-dark-bg">
      {/* Sidebar */}
      <nav
        className={`${NAV_W} flex flex-col py-4 border-r border-light-border dark:border-dark-border bg-white dark:bg-dark-card transition-all duration-300 ease-in-out`}
      >
        {/* Top: Logo + User */}
        <div className={`flex items-center gap-3 mb-6 ${collapsed ? 'justify-center px-0' : 'px-4'}`}>
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
              {profile.nickname?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-sm font-bold text-gray-900 dark:text-white truncate block">
                    {profile.nickname || '用户'}
                  </span>
                  {profile.signature && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate block mt-0.5" title={profile.signature}>
                      {profile.signature}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                    title="设置"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-4 mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索"
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <div className="flex flex-col gap-1 w-full px-3 mb-4">
          {MAIN_NAV.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/day-todo' && location.pathname === '/');
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`h-10 rounded-lg flex items-center gap-3 transition-colors ${
                  collapsed ? 'justify-center px-0' : 'px-3'
                } ${
                  isActive
                    ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Categories Section - uses tags as categories */}
        {!collapsed && (
          <div className="px-4 mb-4">
            <button
              onClick={() => toggleSection('categories')}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-500 dark:text-gray-400 mb-2"
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                分类
              </span>
              {collapsedSections.categories ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
            {!collapsedSections.categories && (
              <div className="flex flex-col gap-1 ml-6 max-h-40 overflow-y-auto">
                {tags.length === 0 ? (
                  <span className="text-xs text-gray-400 py-1">暂无分类</span>
                ) : (
                  tags.slice(0, 8).map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagClick(tag)}
                      className="h-8 rounded-md flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                      <span className="truncate">{tag.name}</span>
                    </button>
                  ))
                )}
                <button
                  onClick={() => setShowTagDialog(true)}
                  className="h-8 rounded-md flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新建分类
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tags Section */}
        {!collapsed && (
          <div className="px-4 mb-4">
            <button
              onClick={() => toggleSection('tags')}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-500 dark:text-gray-400 mb-2"
            >
              <span className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                标签
              </span>
              {collapsedSections.tags ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
            {!collapsedSections.tags && (
              <div className="flex flex-col gap-1 ml-6">
                <button
                  onClick={() => navigate('/tags')}
                  className="h-8 rounded-md flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                >
                  所有标签 ({tags.length})
                </button>
                <button
                  onClick={() => navigate('/tags')}
                  className="h-8 rounded-md flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  管理标签
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bottom buttons */}
        <div className="mt-auto flex flex-col gap-2 w-full px-3">
          {!collapsed && (
            <div className="flex gap-2">
              <button className="flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <CheckCircle2 className="w-4 h-4" />
                已达成
              </button>
              <button className="flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <Trash2 className="w-4 h-4" />
                回收站
              </button>
            </div>
          )}

          <div className="flex gap-1">
            <button
              onClick={() => setShowSettings(true)}
              className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-colors ${
                collapsed ? 'px-0' : 'px-2'
              } text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800`}
              title={collapsed ? '设置' : undefined}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={toggleDarkMode}
              className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-colors ${
                collapsed ? 'px-0' : 'px-2'
              } text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800`}
              title={collapsed ? (darkMode ? '浅色模式' : '深色模式') : undefined}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setCollapsed(c => !c)}
              className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-colors ${
                collapsed ? 'px-0' : 'px-2'
              } text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800`}
              title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Settings panel */}
      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />

      {/* Tag create dialog */}
      <TagEditDialog
        open={showTagDialog}
        tag={null}
        onClose={() => setShowTagDialog(false)}
        onSave={handleTagSave}
      />

      {/* Toast container */}
      <ToastContainer />
    </div>
  );
}
