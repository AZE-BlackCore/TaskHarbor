/**
 * ReminderSettings - 任务自动到期提醒全局设置组件
 *
 * 可配置项：
 * 1. 是否启用自动到期提醒
 * 2. 提前多少天开始提醒（0=仅当天）
 * 3. 提醒频率（检查间隔）
 * 4. 是否发送逾期提醒
 * 5. 是否发送今天到期提醒
 * 6. 是否发送明天到期提醒
 */
import { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, Calendar } from 'lucide-react';

interface ReminderSettingsData {
  autoReminderEnabled: boolean;   // 是否启用自动到期提醒
  autoReminderDays: number;        // 提前多少天提醒（0=仅当天）
  autoReminderInterval: number;     // 检查间隔（分钟）
  autoReminderOverdue: boolean;     // 是否发送逾期提醒
  autoReminderToday: boolean;       // 是否发送当天到期提醒
  autoReminderTomorrow: boolean;    // 是否发送明天到期提醒
}

const DEFAULT_SETTINGS: ReminderSettingsData = {
  autoReminderEnabled: true,
  autoReminderDays: 1,
  autoReminderInterval: 60,
  autoReminderOverdue: true,
  autoReminderToday: true,
  autoReminderTomorrow: false,
};

const STORAGE_KEY = 'taskReminderSettings';

const INTERVAL_OPTIONS = [
  { value: 5, label: '5 分钟' },
  { value: 15, label: '15 分钟' },
  { value: 30, label: '30 分钟' },
  { value: 60, label: '1 小时' },
];

export function ReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettingsData>(DEFAULT_SETTINGS);
  const [expanded, setExpanded] = useState(false);

  // 加载设置
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Failed to load reminder settings:', e);
      }
    }
  }, []);

  // 保存设置
  const saveSettings = (newSettings: ReminderSettingsData) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    // 通知 TaskReminder 组件重新加载设置
    localStorage.setItem('taskReminderSettingsVersion', Date.now().toString());
  };

  const handleToggle = (key: keyof ReminderSettingsData) => {
    saveSettings({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* 头部：开关 */}
      <div
        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">自动到期提醒设置</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {settings.autoReminderEnabled
                ? `提前 ${settings.autoReminderDays} 天提醒，${INTERVAL_OPTIONS.find(o => o.value === settings.autoReminderInterval)?.label} 检查一次`
                : '已禁用自动到期提醒'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggle('autoReminderEnabled');
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.autoReminderEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.autoReminderEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 展开内容 */}
      {expanded && (
        <div className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* 提前天数 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">提前提醒天数</span>
            </div>
            <select
              value={settings.autoReminderDays}
              onChange={(e) => saveSettings({ ...settings, autoReminderDays: parseInt(e.target.value) })}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={0}>仅当天</option>
              <option value={1}>提前 1 天</option>
              <option value={2}>提前 2 天</option>
              <option value={3}>提前 3 天</option>
              <option value={5}>提前 5 天</option>
              <option value={7}>提前 7 天</option>
            </select>
          </div>

          {/* 检查频率 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">检查频率</span>
            </div>
            <select
              value={settings.autoReminderInterval}
              onChange={(e) => saveSettings({ ...settings, autoReminderInterval: parseInt(e.target.value) })}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {INTERVAL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 提醒类型 */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">提醒类型</span>
            <div className="grid grid-cols-1 gap-2">
              {/* 逾期提醒 */}
              <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">逾期提醒</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">任务已逾期时提醒</p>
                </div>
                <button
                  onClick={() => handleToggle('autoReminderOverdue')}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings.autoReminderOverdue ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      settings.autoReminderOverdue ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* 今日到期 */}
              <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">今日到期</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">任务今天到期时提醒</p>
                </div>
                <button
                  onClick={() => handleToggle('autoReminderToday')}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings.autoReminderToday ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      settings.autoReminderToday ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* 明日到期 */}
              <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">明日到期</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">任务明天到期时提醒</p>
                </div>
                <button
                  onClick={() => handleToggle('autoReminderTomorrow')}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings.autoReminderTomorrow ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      settings.autoReminderTomorrow ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 设置说明：
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-0.5 list-disc list-inside">
              <li>提前天数：距离到期多少天时开始显示提醒</li>
              <li>检查频率：多久检查一次任务到期状态</li>
              <li>自定义任务提醒可在任务编辑对话框中单独设置</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
