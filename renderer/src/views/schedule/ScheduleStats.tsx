import { useEffect, useMemo, useState } from 'react';
import { useScheduleStore } from '../../stores/scheduleStore';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: '#3B82F6',
  ongoing: '#F59E0B',
  completed: '#22C55E',
};

type ViewRange = 'week' | 'month' | 'year';

export function ScheduleStats() {
  const { schedules, fetchSchedules } = useScheduleStore();
  const [range, setRange] = useState<ViewRange>('month');

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const now = dayjs();

  const filteredSchedules = useMemo(() => {
    const boundaries: Record<ViewRange, { start: dayjs.Dayjs; end: dayjs.Dayjs }> = {
      week: { start: now.startOf('week'), end: now.endOf('week') },
      month: { start: now.startOf('month'), end: now.endOf('month') },
      year: { start: now.startOf('year'), end: now.endOf('year') },
    };
    const { start, end } = boundaries[range];
    return schedules.filter(s => {
      const t = dayjs(s.startTime);
      return t.isAfter(start.subtract(1, 'day')) && t.isBefore(end.add(1, 'day'));
    });
  }, [schedules, range]);

  // 1. 优先级分布饼图
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    filteredSchedules.forEach(s => { counts[s.priority]++; });
    return Object.entries(counts).map(([name, value]) => ({
      name: name === 'high' ? '高' : name === 'medium' ? '中' : '低',
      value,
      color: PRIORITY_COLORS[name],
    })).filter(d => d.value > 0);
  }, [filteredSchedules]);

  // 2. 日程状态分布饼图
  const statusData = useMemo(() => {
    const getStatus = (s: typeof schedules[0]) => {
      const now_ = dayjs();
      const start = dayjs(s.startTime);
      const end = dayjs(s.endTime);
      if (end.isBefore(now_)) return 'completed';
      if (start.isBefore(now_) || start.isSame(now_)) return 'ongoing';
      return 'upcoming';
    };
    const counts: Record<string, number> = { upcoming: 0, ongoing: 0, completed: 0 };
    filteredSchedules.forEach(s => { counts[getStatus(s)]++; });
    return Object.entries(counts).map(([name, value]) => ({
      name: name === 'upcoming' ? '待开始' : name === 'ongoing' ? '进行中' : '已完成',
      value,
      color: STATUS_COLORS[name],
    })).filter(d => d.value > 0);
  }, [filteredSchedules]);

  // 3. 时间段柱状图
  const timelineData = useMemo(() => {
    if (range === 'week') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = now.startOf('week').add(i, 'day');
        const count = filteredSchedules.filter(s =>
          dayjs(s.startTime).isSame(d, 'day')
        ).length;
        return { name: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][i], count };
      });
    } else if (range === 'month') {
      return Array.from({ length: 4 }, (_, i) => {
        const start = now.startOf('month').add(i * 7, 'day');
        const end = start.add(7, 'day');
        const count = filteredSchedules.filter(s => {
          const t = dayjs(s.startTime);
          return t.isSameOrAfter(start) && t.isBefore(end);
        }).length;
        return { name: `W${i + 1}`, count };
      });
    } else {
      return Array.from({ length: 12 }, (_, i) => {
        const m = now.month(i);
        const count = filteredSchedules.filter(s =>
          dayjs(s.startTime).isSame(m, 'month')
        ).length;
        return { name: `${i + 1}月`, count };
      });
    }
  }, [filteredSchedules, range]);

  // 汇总数据
  const total = filteredSchedules.length;
  const upcoming = filteredSchedules.filter(s => dayjs(s.endTime).isAfter(now) && dayjs(s.startTime).isAfter(now)).length;
  const ongoing = filteredSchedules.filter(s => {
    const start = dayjs(s.startTime);
    const end = dayjs(s.endTime);
    return (start.isBefore(now) || start.isSame(now)) && end.isAfter(now);
  }).length;
  const completed = filteredSchedules.filter(s => dayjs(s.endTime).isBefore(now)).length;
  const highPriority = filteredSchedules.filter(s => s.priority === 'high').length;

  const StatCard = ({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) => (
    <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-3xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-light-bg dark:bg-dark-bg overflow-auto">
      {/* 顶部 */}
      <div className="p-4 border-b border-light-border dark:border-dark-border bg-white dark:bg-dark-card flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">日程统计</h1>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded p-1">
          {(['week', 'month', 'year'] as ViewRange[]).map(r => (
            <button key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                range === r ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {r === 'week' ? '本周' : r === 'month' ? '本月' : '本年'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* 汇总卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="日程总数" value={total} color="#6366F1" />
          <StatCard label="待开始" value={upcoming} color="#3B82F6" sub="即将到来的日程" />
          <StatCard label="进行中" value={ongoing} color="#F59E0B" sub="正在进行的日程" />
          <StatCard label="已完成" value={completed} color="#22C55E" sub="已结束的日程" />
        </div>

        {/* 高优先级提示 */}
        {highPriority > 0 && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-red-600 dark:text-red-400 font-bold text-sm">{highPriority}</span>
            </div>
            <div>
              <div className="text-sm font-medium text-red-700 dark:text-red-400">高优先级日程</div>
              <div className="text-xs text-red-600 dark:text-red-500">当前范围内有 {highPriority} 个高优先级日程需要注意</div>
            </div>
          </div>
        )}

        {/* 图表区 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 优先级分布 */}
          <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">优先级分布</h3>
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={priorityData} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                    dataKey="value" nameKey="name" paddingAngle={3}>
                    {priorityData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} 个`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
            )}
            <div className="flex justify-center gap-4 mt-2">
              {priorityData.map(entry => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-600 dark:text-gray-400">{entry.name} {entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 状态分布 */}
          <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">日程状态</h3>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={90}
                    dataKey="value" nameKey="name" paddingAngle={3}>
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} 个`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
            )}
            <div className="flex justify-center gap-4 mt-2">
              {statusData.map(entry => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-600 dark:text-gray-400">{entry.name} {entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 时间趋势图 */}
        <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            {range === 'week' ? '本周每日' : range === 'month' ? '本月每周' : '本年每月'} 日程数量
          </h3>
          {timelineData.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timelineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value} 个日程`, '数量']} />
                <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
