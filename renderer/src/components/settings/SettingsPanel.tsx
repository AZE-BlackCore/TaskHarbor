import { useState, useEffect } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { 
  Settings, 
  Moon, 
  Sun, 
  Bell, 
  BellOff, 
  Database, 
  Download, 
  Trash2,
  CheckCircle,
  AlertCircle,
  LayoutGrid,
  Maximize2,
  Pin,
  Info
} from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useProjectStore } from '../../stores/projectStore';
import { exportToExcel, exportToCSV, exportToMarkdown } from '../../utils/export';
import { ViewOrderSettings } from './ViewOrderSettings';
import { ReminderSettings } from './ReminderSettings';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export function SettingsPanel({ open, onClose, darkMode, toggleDarkMode }: SettingsPanelProps) {
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showMenuBar, setShowMenuBar] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [closeBehavior, setCloseBehavior] = useState<'minimize' | 'exit'>('minimize');
  const [appInfo, setAppInfo] = useState<{
    version: string;
    buildDate: string;
    author: string;
    productName: string;
    description: string;
  } | null>(null);

  // 加载应用信息
  useEffect(() => {
    const loadAppInfo = async () => {
      // @ts-ignore
      const result = await window.electronAPI?.getAppInfo?.();
      if (result?.success) {
        setAppInfo(result);
      }
    };
    loadAppInfo();
  }, []);

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateString;
    }
  };

  // 加载菜单栏设置
  useEffect(() => {
    // 默认开发版显示菜单栏，正式版隐藏
    const saved = localStorage.getItem('showMenuBar');
    if (saved !== null) {
      setShowMenuBar(JSON.parse(saved));
    }
  }, []);

  // 加载窗口置顶设置
  useEffect(() => {
    const saved = localStorage.getItem('alwaysOnTop');
    if (saved !== null) {
      const value = JSON.parse(saved);
      setAlwaysOnTop(value);
      // @ts-ignore - electronAPI 由 preload 注入
      window.electronAPI?.setAlwaysOnTop(value);
    }
  }, []);

  // 加载关闭行为设置
  useEffect(() => {
    const saved = localStorage.getItem('closeBehavior');
    if (saved !== null) {
      setCloseBehavior(JSON.parse(saved));
    }

    // 监听关闭偏好设置
    // @ts-ignore
    const handler = (action: 'minimize' | 'exit') => {
      setCloseBehavior(action);
      localStorage.setItem('closeBehavior', JSON.stringify(action));
    };
    // @ts-ignore
    window.electronAPI?.onClosePreference(handler);

    return () => {
      // @ts-ignore
      window.electronAPI?.removeClosePreferenceListener();
    };
  }, []);

  // 切换菜单栏可见性
  const handleToggleMenuBar = (visible: boolean) => {
    setShowMenuBar(visible);
    localStorage.setItem('showMenuBar', JSON.stringify(visible));
    // @ts-ignore - electronAPI 由 preload 注入
    window.electronAPI?.setMenuBarVisibility(visible);
  };

  // 切换窗口置顶
  const handleToggleAlwaysOnTop = () => {
    const newValue = !alwaysOnTop;
    setAlwaysOnTop(newValue);
    localStorage.setItem('alwaysOnTop', JSON.stringify(newValue));
    // @ts-ignore - electronAPI 由 preload 注入
    window.electronAPI?.setAlwaysOnTop(newValue);
  };

  const handleExport = async (format: 'excel' | 'csv' | 'markdown') => {
    try {
      setExporting(true);
      
      let result;
      const filename = `任务导出_${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'excel') {
        result = await exportToExcel(tasks, projects, `${filename}.xlsx`);
      } else if (format === 'csv') {
        result = await exportToCSV(tasks, projects, `${filename}.csv`);
      } else {
        result = await exportToMarkdown(tasks, projects, `${filename}.md`);
      }

      if (result.success) {
        alert('导出成功！');
      } else {
        alert('导出失败：' + result.error);
      }
    } catch (error: unknown) {
      console.error('导出失败:', error);
      alert('导出失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setExporting(false);
    }
  };

  const handleClearData = async () => {
    if (confirm('⚠️ 警告：此操作将删除所有数据且无法恢复！确定要继续吗？')) {
      if (confirm('再次确认：所有项目和任务都将被永久删除！')) {
        // TODO: 实现数据清除功能
        alert('数据清除功能开发中...');
      }
    }
  };

  const handleBackupData = async () => {
    try {
      // TODO: 实现数据备份功能
      alert('数据备份功能开发中...');
    } catch (error: unknown) {
      alert('备份失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="设置" className="max-w-2xl">
      <div className="space-y-6">
        {/* 界面设置 */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Maximize2 className="w-5 h-5" />
            界面设置
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Maximize2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">显示顶部菜单栏</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {showMenuBar ? '已显示菜单栏' : '已隐藏菜单栏'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggleMenuBar(!showMenuBar)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showMenuBar ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showMenuBar ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Pin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">窗口置顶</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {alwaysOnTop ? 'TaskHarbor 将显示在所有窗口最上层' : '窗口正常显示'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleAlwaysOnTop}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  alwaysOnTop ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    alwaysOnTop ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">关闭行为</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {closeBehavior === 'minimize' ? '点击关闭时最小化到托盘' : '点击关闭时直接退出'}
                  </p>
                </div>
              </div>
              <select
                value={closeBehavior}
                onChange={(e) => {
                  const value = e.target.value as 'minimize' | 'exit';
                  setCloseBehavior(value);
                  localStorage.setItem('closeBehavior', JSON.stringify(value));
                }}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="minimize">最小化到托盘</option>
                <option value="exit">退出程序</option>
              </select>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <LayoutGrid className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">桌面悬浮卡片</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    在桌面显示任务/日程卡片
                  </p>
                </div>
              </div>
              <Button
                onClick={async () => {
                  // @ts-ignore - electronAPI 注入的 API
                  const result = await (window as any).electronAPI?.createFloatingWindow?.({
                    opacity: 0.95,
                    x: 200,
                    y: 200,
                    page: 'desktop-card',
                  });
                  if (result?.success) {
                    alert('桌面卡片已启动！您可以拖动卡片查看任务和日程。');
                  }
                }}
                size="sm"
              >
                启动桌面卡片
              </Button>
            </div>
          </div>
        </section>

        {/* 视图设置 */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5" />
            视图设置
          </h3>
          <ViewOrderSettings />
        </section>

        {/* 外观设置 */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Sun className="w-5 h-5" />
            外观
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                {darkMode ? (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">深色模式</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {darkMode ? '当前为深色主题' : '当前为浅色主题'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  darkMode ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* 通知设置 */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            通知
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                {notificationsEnabled ? (
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">任务提醒</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {notificationsEnabled 
                      ? '已启用任务到期提醒' 
                      : '已关闭任务提醒'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* 自动到期提醒设置 */}
            <ReminderSettings />
          </div>
        </section>

        {/* 数据管理 */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            数据管理
          </h3>
          <div className="space-y-3">
            {/* 导出数据 */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">导出数据</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    导出任务和项目数据
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleExport('excel')}
                  disabled={exporting}
                  size="sm"
                >
                  Excel
                </Button>
                <Button
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  variant="secondary"
                  size="sm"
                >
                  CSV
                </Button>
                <Button
                  onClick={() => handleExport('markdown')}
                  disabled={exporting}
                  variant="secondary"
                  size="sm"
                >
                  Markdown
                </Button>
              </div>
            </div>

            {/* 备份数据 */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">备份数据</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    创建数据备份以防丢失
                  </p>
                </div>
              </div>
              <Button onClick={handleBackupData} size="sm">
                立即备份
              </Button>
            </div>

            {/* 清除数据 */}
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-300">危险操作</p>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    删除所有数据，此操作不可恢复
                  </p>
                </div>
              </div>
              <Button onClick={handleClearData} variant="danger" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                清除所有数据
              </Button>
            </div>
          </div>
        </section>

        {/* 统计信息 */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            统计信息
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">总任务数</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tasks.length}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">总项目数</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{projects.length}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">已完成</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {tasks.filter(t => t.status === 'done').length}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">平均进度</p>
              <p className="text-2xl font-bold text-primary">
                {tasks.length > 0 
                  ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)
                  : 0}%
              </p>
            </div>
          </div>
        </section>

        {/* 关于软件 */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5" />
            关于软件
          </h3>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">软件名称</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {appInfo?.productName || 'TaskHarbor'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">版本号</span>
              <span className="text-sm font-medium text-primary">
                v{appInfo?.version || '1.0.3'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">打包日期</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {appInfo?.buildDate ? formatDate(appInfo.buildDate) : '未知'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">作者</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {appInfo?.author || '沈成泽'}
              </span>
            </div>
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                {appInfo?.description || '桌面端任务管理软件 - 让任务安全停靠、高效启航'}
              </p>
              <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-1">
                © 2026 TaskHarbor. All rights reserved.
              </p>
            </div>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
