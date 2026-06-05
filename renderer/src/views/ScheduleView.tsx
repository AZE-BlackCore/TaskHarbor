import { useState } from 'react';
import { ScheduleCalendar } from './schedule/ScheduleCalendar';
import { ScheduleKanban } from './schedule/ScheduleKanban';
import { ScheduleStats } from './schedule/ScheduleStats';
import { Calendar, Columns, BarChart3 } from 'lucide-react';

type ScheduleTab = 'calendar' | 'kanban' | 'stats';

const TABS: { id: ScheduleTab; label: string; icon: typeof Calendar }[] = [
  { id: 'calendar', label: '日程日历', icon: Calendar },
  { id: 'kanban', label: '日程看板', icon: Columns },
  { id: 'stats', label: '日程统计', icon: BarChart3 },
];

export function ScheduleView() {
  const [activeTab, setActiveTab] = useState<ScheduleTab>('calendar');

  return (
    <div className="h-full flex flex-col">
      {/* Tab 导航 */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-0 bg-light-bg dark:bg-dark-bg">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-dark-card text-primary border-primary'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'calendar' && <ScheduleCalendar />}
        {activeTab === 'kanban' && <ScheduleKanban />}
        {activeTab === 'stats' && <ScheduleStats />}
      </div>
    </div>
  );
}
