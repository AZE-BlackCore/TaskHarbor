import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useTaskStore } from '../stores/taskStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { useTagStore } from '../stores/tagStore';
import { SmartAnalysis } from '../components/stats/SmartAnalysis';
import { ReportGenerator } from '../components/stats/ReportGenerator';
import {
  CheckCircle2, Clock, AlertCircle, Calendar, TrendingUp, TrendingDown,
  BarChart3, Users, Flag, Tag as TagIcon, Loader, Brain, FileText,
} from 'lucide-react';

type StatsTab = 'overview' | 'analysis' | 'report';

interface BackendStats {
  total: number;
  byStatus: Record<string, number>;
  byAssignee: Record<string, number>;
  byPriority: Record<string, number>;
  averageProgress: number;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  todo: { label: '待处理', color: 'bg-gray-400' },
  'in-progress': { label: '进行中', color: 'bg-blue-500' },
  review: { label: '审核中', color: 'bg-yellow-500' },
  done: { label: '已完成', color: 'bg-green-500' },
  blocked: { label: '已阻塞', color: 'bg-red-500' },
};

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  high: { label: '高优先级', color: 'bg-red-500' },
  medium: { label: '中优先级', color: 'bg-yellow-500' },
  low: { label: '低优先级', color: 'bg-green-500' },
};

export function StatsView() {
  const { tasks, fetchTasks } = useTaskStore();
  const { schedules, fetchSchedules } = useScheduleStore();
  const { tags, fetchTags } = useTagStore();
  const [stats, setStats] = useState<BackendStats | null>(null);
  const [scheduleStats, setScheduleStats] = useState({ total: 0, today: 0, thisWeek: 0, overdue: 0 });
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');

  useEffect(() => {
    fetchTasks();
    fetchSchedules();
    fetchTags();
  }, [fetchTasks, fetchSchedules, fetchTags]);

  // Fetch backend aggregate stats
  useEffect(() => {
    (async () => {
      try {
        const result = await window.electronAPI.getTaskStats();
        if (result?.success && result.data) {
          setStats(result.data as unknown as BackendStats);
        }
      } catch (e) {
        console.error('Failed to fetch task stats:', e);
      }
    })();
  }, [tasks]);

  // Compute schedule stats on client
  useEffect(() => {
    const today = dayjs().startOf('day');
    const tomorrow = today.add(1, 'day');
    const weekEnd = today.add(7, 'day');

    const todayCount = schedules.filter(s => {
      const d = dayjs(s.startTime);
      return d >= today && d < tomorrow;
    }).length;

    const thisWeekCount = schedules.filter(s => {
      const d = dayjs(s.startTime);
      return d >= today && d < weekEnd;
    }).length;

    const overdueCount = schedules.filter(s => {
      const d = dayjs(s.endTime || s.startTime);
      return d < today;
    }).length;

    setScheduleStats({ total: schedules.length, today: todayCount, thisWeek: thisWeekCount, overdue: overdueCount });
  }, [schedules]);

  const total = stats?.total ?? tasks.length;
  const byStatus = stats?.byStatus ?? {};
  const byAssignee = stats?.byAssignee ?? {};
  const byPriority = stats?.byPriority ?? {};
  const avgProgress = stats?.averageProgress ?? 0;

  const completed = byStatus['done'] ?? 0;
  const inProgress = byStatus['in-progress'] ?? 0;
  const todo = byStatus['todo'] ?? 0;
  const review = byStatus['review'] ?? 0;
  const blocked = byStatus['blocked'] ?? 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Build status distribution bars
  const statusEntries = Object.entries(STATUS_META).map(([key, meta]) => ({
    key,
    label: meta.label,
    color: meta.color,
    count: byStatus[key] ?? 0,
    percent: total > 0 ? Math.round(((byStatus[key] ?? 0) / total) * 100) : 0,
  }));

  // Priority distribution
  const priorityEntries = Object.entries(PRIORITY_META).map(([key, meta]) => ({
    key,
    label: meta.label,
    color: meta.color,
    count: byPriority[key] ?? 0,
  }));

  // Assignee distribution (top 5)
  const assigneeEntries = Object.entries(byAssignee)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const maxAssigneeCount = assigneeEntries.length > 0 ? assigneeEntries[0][1] : 0;

  return (
    <div className="h-full bg-light-bg dark:bg-dark-bg p-6 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-teal-500" />
          数据复盘
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">任务与日程的全维度数据分析</p>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={BarChart3} label="统计概览" />
        <TabButton active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} icon={Brain} label="智能分析" />
        <TabButton active={activeTab === 'report'} onClick={() => setActiveTab('report')} icon={FileText} label="报告生成" />
      </div>

      {activeTab === 'analysis' && <SmartAnalysis tasks={tasks} />}

      {activeTab === 'report' && <ReportGenerator tasks={tasks} tags={tags} schedules={schedules} />}

      {activeTab === 'overview' && (
        <>
      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <OverviewCard title="总任务" value={total} color="text-gray-900 dark:text-white" />
        <OverviewCard title="已完成" value={completed} color="text-green-500" />
        <OverviewCard title="进行中" value={inProgress} color="text-blue-500" />
        <OverviewCard title="待处理" value={todo} color="text-gray-400" />
        <OverviewCard title="审核中" value={review} color="text-yellow-500" />
        <OverviewCard title="已阻塞" value={blocked} color="text-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Completion progress */}
        <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">任务完成进度</h3>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-bold text-teal-500">{completionRate}%</span>
            <span className="text-sm text-gray-400 mb-1.5">完成率</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>已完成 {completed}</span>
            <span>平均进度 {avgProgress}%</span>
            <span>总计 {total}</span>
          </div>
        </div>

        {/* Status distribution */}
        <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">状态分布</h3>
          <div className="space-y-3">
            {statusEntries.map(entry => (
              <div key={entry.key} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-20">
                  <span className={`w-2.5 h-2.5 rounded-full ${entry.color}`} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{entry.label}</span>
                </div>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                  <div
                    className={`h-full ${entry.color} transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${Math.max(entry.percent, entry.count > 0 ? 8 : 0)}%` }}
                  >
                    {entry.count > 0 && (
                      <span className="text-xs text-white font-medium">{entry.count}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">{entry.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Priority distribution */}
        <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Flag className="w-4 h-4 text-gray-400" />
            优先级分布
          </h3>
          <div className="flex items-end justify-around h-32">
            {priorityEntries.map(entry => (
              <div key={entry.key} className="flex flex-col items-center gap-2 flex-1">
                <span className="text-lg font-bold text-gray-900 dark:text-white">{entry.count}</span>
                <div className="w-12 bg-gray-100 dark:bg-gray-800 rounded-t-md overflow-hidden flex flex-col-reverse h-20">
                  <div
                    className={`w-full ${entry.color} transition-all duration-500`}
                    style={{ height: `${total > 0 ? (entry.count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{entry.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Assignee distribution */}
        <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            责任人任务分布
          </h3>
          {assigneeEntries.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              暂无责任人数据
            </div>
          ) : (
            <div className="space-y-3">
              {assigneeEntries.map(([name, count]) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-xs font-bold text-teal-600 dark:text-teal-400 flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 w-20 truncate">{name}</span>
                  <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                    <div
                      className="h-full bg-teal-500 transition-all duration-500"
                      style={{ width: `${maxAssigneeCount > 0 ? (count / maxAssigneeCount) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tag overview */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TagIcon className="w-4 h-4 text-gray-400" />
          标签概览 ({tags.length})
        </h3>
        {tags.length === 0 ? (
          <p className="text-sm text-gray-400">暂无标签</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span
                key={tag.id}
                className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5"
                style={{ backgroundColor: tag.color + '20', color: tag.color }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Schedule stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">日程统计</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ScheduleCard title="今日日程" value={scheduleStats.today} icon={Calendar} color="bg-purple-500" />
          <ScheduleCard title="本周日程" value={scheduleStats.thisWeek} icon={Calendar} color="bg-indigo-500" />
          <ScheduleCard title="总日程" value={scheduleStats.total} icon={Calendar} color="bg-pink-500" />
          <ScheduleCard title="已过期" value={scheduleStats.overdue} icon={AlertCircle} color="bg-red-500" />
        </div>
      </div>
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
        active
          ? 'border-teal-500 text-teal-500'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function OverviewCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
      <p className="text-3xl font-bold {color}" style={{ color: undefined }}>
        <span className={color}>{value}</span>
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{title}</p>
    </div>
  );
}

function ScheduleCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-xl p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
