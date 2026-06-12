import { useEffect, useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { CheckCircle2, Clock, AlertCircle, Calendar, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
}

interface ScheduleStats {
  total: number;
  today: number;
  thisWeek: number;
  overdue: number;
}

export function StatsView() {
  const { tasks, fetchTasks } = useTaskStore();
  const { schedules, fetchSchedules } = useScheduleStore();
  const [taskStats, setTaskStats] = useState<TaskStats>({ total: 0, completed: 0, inProgress: 0, todo: 0 });
  const [scheduleStats, setScheduleStats] = useState<ScheduleStats>({ total: 0, today: 0, thisWeek: 0, overdue: 0 });

  useEffect(() => {
    fetchTasks();
    fetchSchedules();
  }, [fetchTasks, fetchSchedules]);

  useEffect(() => {
    // 计算任务统计
    const completed = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    setTaskStats({
      total: tasks.length,
      completed,
      inProgress,
      todo,
    });

    // 计算日程统计
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const todayCount = schedules.filter(s => {
      const date = new Date(s.startTime);
      return date >= today && date < tomorrow;
    }).length;

    const thisWeekCount = schedules.filter(s => {
      const date = new Date(s.startTime);
      return date >= today && date < weekEnd;
    }).length;

    const overdueCount = schedules.filter(s => {
      const date = new Date(s.endTime || s.startTime);
      return date < today;
    }).length;

    setScheduleStats({
      total: schedules.length,
      today: todayCount,
      thisWeek: thisWeekCount,
      overdue: overdueCount,
    });
  }, [tasks, schedules]);

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: { 
    title: string; 
    value: number; 
    icon: any; 
    color: string;
    subtitle?: string;
  }) => (
    <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-light-border dark:border-dark-border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const completionRate = taskStats.total > 0 
    ? Math.round((taskStats.completed / taskStats.total) * 100) 
    : 0;

  return (
    <div className="h-full bg-light-bg dark:bg-dark-bg p-6 overflow-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          数据统计
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">查看您的任务和日程数据概览</p>
      </div>

      {/* 任务统计区域 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">任务统计</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="总任务" 
            value={taskStats.total} 
            icon={CheckCircle2} 
            color="bg-blue-500"
          />
          <StatCard 
            title="已完成" 
            value={taskStats.completed} 
            icon={TrendingUp} 
            color="bg-green-500"
            subtitle={`完成率 ${completionRate}%`}
          />
          <StatCard 
            title="进行中" 
            value={taskStats.inProgress} 
            icon={Clock} 
            color="bg-yellow-500"
          />
          <StatCard 
            title="待完成" 
            value={taskStats.todo} 
            icon={TrendingDown} 
            color="bg-gray-500"
          />
        </div>
      </div>

      {/* 任务完成进度条 */}
      <div className="mb-8 bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-light-border dark:border-dark-border">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">任务完成进度</h3>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
          <span>0%</span>
          <span className="font-medium">{completionRate}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* 日程统计区域 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">日程统计</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="今日日程" 
            value={scheduleStats.today} 
            icon={Calendar} 
            color="bg-purple-500"
          />
          <StatCard 
            title="本周日程" 
            value={scheduleStats.thisWeek} 
            icon={Calendar} 
            color="bg-indigo-500"
          />
          <StatCard 
            title="总日程" 
            value={scheduleStats.total} 
            icon={Calendar} 
            color="bg-pink-500"
          />
          <StatCard 
            title="已过期" 
            value={scheduleStats.overdue} 
            icon={AlertCircle} 
            color="bg-red-500"
          />
        </div>
      </div>
    </div>
  );
}
