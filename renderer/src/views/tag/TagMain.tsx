import { useEffect, useState } from 'react';
import { useTagStore } from '../../stores/tagStore';
import { TagList } from './TagList';
import { ProjectListView } from '../project/ProjectListView';
import { ProjectGanttView } from '../project/ProjectGanttView';
import { ProjectKanbanView } from '../project/ProjectKanbanView';
import { ProjectCalendarView } from '../project/ProjectCalendarView';
import { Grid3X3, List, GanttChart, Columns, Calendar } from 'lucide-react';

type TagTab = 'tags' | 'list' | 'gantt' | 'kanban' | 'calendar';

const TABS: { id: TagTab; label: string; icon: typeof Grid3X3 }[] = [
  { id: 'list',     label: '任务列表', icon: List },
  { id: 'tags', label: '标签列表', icon: Grid3X3 },
  { id: 'gantt',    label: '甘特图',   icon: GanttChart },
  { id: 'kanban',   label: '看板',     icon: Columns },
  { id: 'calendar', label: '日历',     icon: Calendar },
];

export function TagMain() {
  const { fetchTags } = useTagStore();
  const [activeTab, setActiveTab] = useState<TagTab>('list');

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return (
    <div className="h-full flex flex-col bg-light-bg dark:bg-dark-bg">
      {/* 顶部：标题 + Tab 导航 */}
      <div className="flex-shrink-0 border-b border-light-border dark:border-dark-border bg-white dark:bg-dark-card">
        <div className="flex items-center gap-1 px-4 pt-4 pb-0">
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
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'tags' && <TagList onSelectTag={() => {}} />}
        {activeTab === 'list'     && <ProjectListView />}
        {activeTab === 'gantt'   && <ProjectGanttView />}
        {activeTab === 'kanban'  && <ProjectKanbanView />}
        {activeTab === 'calendar' && <ProjectCalendarView />}
      </div>
    </div>
  );
}
