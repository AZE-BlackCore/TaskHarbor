import { useEffect, useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween'

dayjs.extend(isBetween)

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function DashboardView() {
  const { tasks, fetchTasks } = useTaskStore();
  const { projects, fetchProjects } = useProjectStore();
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    blockedTasks: 0,
    averageProgress: 0,
  });

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, []);

  useEffect(() => {
    // 计算统计数据
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const avgProgress = total > 0 
      ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / total)
      : 0;

    setStats({
      totalTasks: total,
      completedTasks: completed,
      inProgressTasks: inProgress,
      blockedTasks: blocked,
      averageProgress: avgProgress,
    });
  }, [tasks]);

  // 状态分布数据
  const statusData = [
    { name: '待办', value: tasks.filter(t => t.status === 'todo').length },
    { name: '进行中', value: tasks.filter(t => t.status === 'in-progress').length },
    { name: '审查中', value: tasks.filter(t => t.status === 'review').length },
    { name: '已完成', value: tasks.filter(t => t.status === 'done').length },
    { name: '已阻塞', value: tasks.filter(t => t.status === 'blocked').length },
  ];

  // 项目分布数据
  const projectData = projects.map(project => ({
    name: project.name,
    任务数: tasks.filter(t => t.projectId === project.id).length,
    完成率: project.type === 'personal' ? 60 : 40,
  }));

  // 燃尽图数据（模拟）
  const burnDownData = Array.from({ length: 7 }, (_, i) => {
    const date = dayjs().subtract(6 - i, 'day');
    const remaining = Math.max(0, tasks.length - Math.floor(i * (tasks.length / 7)));
    return {
      date: date.format('MM-DD'),
      剩余任务: remaining,
      理想进度: Math.max(0, tasks.length - (i + 1) * (tasks.length / 7)),
    };
  });

  // 时间分布数据
  const timeDistributionData = [
    { name: '本周', 已完成: tasks.filter(t => {
      const endDate = t.actualEndDate ? dayjs(t.actualEndDate) : null;
      return endDate && endDate.isAfter(dayjs().subtract(7, 'day'));
    }).length },
    { name: '上周', 已完成: tasks.filter(t => {
      const endDate = t.actualEndDate ? dayjs(t.actualEndDate) : null;
      return endDate && endDate.isBetween(dayjs().subtract(14, 'day'), dayjs().subtract(7, 'day'));
    }).length },
    { name: '本月', 已完成: tasks.filter(t => {
      const endDate = t.actualEndDate ? dayjs(t.actualEndDate) : null;
      return endDate && endDate.isSame(dayjs(), 'month');
    }).length },
  ];

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-sm border border-light-border dark:border-dark-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% 较上周
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-dark-bg overflow-auto">
      <div className="flex-1 p-6">
        {/* 标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            统计报表
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            项目进度和任务数据分析
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="总任务数"
            value={stats.totalTasks}
            icon={TrendingUp}
            color="bg-blue-500"
            trend={12}
          />
          <StatCard
            title="已完成"
            value={stats.completedTasks}
            icon={CheckCircle}
            color="bg-green-500"
            trend={8}
          />
          <StatCard
            title="进行中"
            value={stats.inProgressTasks}
            icon={Clock}
            color="bg-yellow-500"
          />
          <StatCard
            title="已阻塞"
            value={stats.blockedTasks}
            icon={AlertCircle}
            color="bg-red-500"
            trend={-5}
          />
        </div>

        {/* 图表行 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* 状态分布饼图 */}
          <div className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-sm border border-light-border dark:border-dark-border">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              任务状态分布
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) => {
                    const percentage = (percent ?? 0) * 100;
                    // 只显示占比>0 的标签，避免重叠
                    if (percentage <= 0) return '';
                    return `${name ?? ''}: ${percentage.toFixed(0)}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value ?? 0} 个任务`, '数量']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 平均进度 */}
          <div className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-sm border border-light-border dark:border-dark-border">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              整体进度
            </h3>
            <div className="flex items-center justify-center h-[300px]">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-gray-200 dark:text-gray-700"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className="text-primary"
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * stats.averageProgress) / 100}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.averageProgress}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 第二行图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* 项目分布柱状图 */}
          <div className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-sm border border-light-border dark:border-dark-border">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              项目任务分布
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="任务数" fill="#3B82F6" />
                <Bar dataKey="完成率" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 燃尽图 */}
          <div className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-sm border border-light-border dark:border-dark-border">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              燃尽图（近 7 天）
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={burnDownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="剩余任务" stroke="#EF4444" strokeWidth={2} />
                <Line type="monotone" dataKey="理想进度" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 时间分布 */}
        <div className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-sm border border-light-border dark:border-dark-border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            任务完成时间分布
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={timeDistributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="已完成" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
