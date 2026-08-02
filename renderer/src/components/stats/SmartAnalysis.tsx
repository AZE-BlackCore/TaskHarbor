import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { Task } from '../../types';
import {
  TrendingUp, TrendingDown, AlertTriangle, Zap, Target,
  Lightbulb, CheckCircle2, Clock, Activity, ArrowUp, ArrowDown, Minus,
} from 'lucide-react';

interface SmartAnalysisProps {
  tasks: Task[];
}

const STATUS_LABEL: Record<string, string> = {
  todo: '待处理',
  'in-progress': '进行中',
  review: '审核中',
  done: '已完成',
  blocked: '已阻塞',
};

export function SmartAnalysis({ tasks }: SmartAnalysisProps) {
  const analysis = useMemo(() => computeAnalysis(tasks), [tasks]);

  return (
    <div className="space-y-6">
      {/* Productivity Score */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-500" />
          生产力评分
        </h3>
        <div className="flex items-center gap-6">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10"
                className="text-gray-200 dark:text-gray-700" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10"
                strokeLinecap="round"
                className={analysis.scoreColor}
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - analysis.score / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${analysis.scoreColor}`}>{analysis.score}</span>
              <span className="text-xs text-gray-400">分</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <ScoreRow label="完成率" value={analysis.metrics.completionRate} weight="30%" />
            <ScoreRow label="平均进度" value={analysis.metrics.avgProgress} weight="25%" />
            <ScoreRow label="活跃度" value={analysis.metrics.activity} weight="25%" />
            <ScoreRow label="健康度" value={analysis.metrics.health} weight="20%" />
          </div>
        </div>
        <div className={`mt-4 p-3 rounded-lg ${analysis.scoreBg} flex items-start gap-2`}>
          <Zap className={`w-4 h-4 mt-0.5 flex-shrink-0 ${analysis.scoreColor}`} />
          <p className={`text-sm ${analysis.scoreColor}`}>{analysis.scoreComment}</p>
        </div>
      </div>

      {/* Completion Trend */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-500" />
          完成趋势（近 14 天）
        </h3>
        <div className="flex items-end justify-between h-40 gap-1">
          {analysis.trend.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="w-full flex flex-col-reverse h-28 relative">
                <div
                  className="w-full bg-teal-400 dark:bg-teal-500 rounded-t-sm transition-all duration-300 hover:bg-teal-500"
                  style={{ height: `${analysis.maxTrendCount > 0 ? (day.count / analysis.maxTrendCount) * 100 : 0}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                />
                {day.count > 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-teal-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.count}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">{day.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">本周完成</span>
            <span className="font-bold text-teal-500">{analysis.thisWeekCompleted}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">上周完成</span>
            <span className="font-bold text-gray-600 dark:text-gray-300">{analysis.lastWeekCompleted}</span>
          </div>
          <div className="flex items-center gap-1">
            {analysis.weekTrend > 0 ? (
              <span className="flex items-center gap-1 text-green-500"><ArrowUp className="w-3.5 h-3.5" />{analysis.weekTrend}%</span>
            ) : analysis.weekTrend < 0 ? (
              <span className="flex items-center gap-1 text-red-500"><ArrowDown className="w-3.5 h-3.5" />{Math.abs(analysis.weekTrend)}%</span>
            ) : (
              <span className="flex items-center gap-1 text-gray-400"><Minus className="w-3.5 h-3.5" />0%</span>
            )}
          </div>
        </div>
      </div>

      {/* Bottleneck Analysis */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          瓶颈分析
        </h3>
        {analysis.bottlenecks.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm">当前无瓶颈，任务运转顺畅</span>
          </div>
        ) : (
          <div className="space-y-3">
            {analysis.bottlenecks.map((bn, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bn.bg}`}>
                  <bn.icon className={`w-4 h-4 ${bn.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{bn.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{bn.detail}</p>
                </div>
                <span className={`text-sm font-bold ${bn.color}`}>{bn.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workload Distribution */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-500" />
          负载分析
        </h3>
        {analysis.workloads.length === 0 ? (
          <p className="text-sm text-gray-400">暂无责任人数据</p>
        ) : (
          <div className="space-y-3">
            {analysis.workloads.map(wl => (
              <div key={wl.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                  {wl.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{wl.name}</span>
                    <span className="text-xs text-gray-400">{wl.total} 个任务 · {wl.done} 已完成</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${wl.total > 0 ? (wl.active / wl.total) * 100 : 0}%`,
                        background: wl.ratio > 0.7 ? '#ef4444' : wl.ratio > 0.4 ? '#f59e0b' : '#10b981',
                      }}
                    />
                  </div>
                </div>
                <span className={`text-xs font-medium w-12 text-right ${wl.ratio > 0.7 ? 'text-red-500' : wl.ratio > 0.4 ? 'text-amber-500' : 'text-green-500'}`}>
                  {wl.ratio > 0.7 ? '过载' : wl.ratio > 0.4 ? '适中' : '轻松'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Smart Insights */}
      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/10 dark:to-cyan-900/10 rounded-xl p-6 border border-teal-200 dark:border-teal-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-teal-500" />
          智能洞察
        </h3>
        <div className="space-y-3">
          {analysis.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${insight.bg}`}>
                <insight.icon className={`w-3.5 h-3.5 ${insight.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">{insight.text}</p>
                {insight.suggestion && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{insight.suggestion}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Helper component ----------

function ScoreRow({ label, value, weight }: { label: string; value: number; weight: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-16">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-400 rounded-full transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right">{value}%</span>
      <span className="text-xs text-gray-400 w-8">{weight}</span>
    </div>
  );
}

// ---------- Analysis logic ----------

interface Insight {
  icon: any;
  color: string;
  bg: string;
  text: string;
  suggestion?: string;
}

interface Bottleneck {
  icon: any;
  color: string;
  bg: string;
  title: string;
  detail: string;
  count: number;
}

interface Workload {
  name: string;
  total: number;
  active: number;
  done: number;
  ratio: number;
}

interface AnalysisResult {
  score: number;
  scoreColor: string;
  scoreBg: string;
  scoreComment: string;
  metrics: {
    completionRate: number;
    avgProgress: number;
    activity: number;
    health: number;
  };
  trend: { label: string; count: number }[];
  maxTrendCount: number;
  thisWeekCompleted: number;
  lastWeekCompleted: number;
  weekTrend: number;
  bottlenecks: Bottleneck[];
  workloads: Workload[];
  insights: Insight[];
}

function computeAnalysis(tasks: Task[]): AnalysisResult {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const todo = tasks.filter(t => t.status === 'todo').length;
  const avgProgress = total > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / total) : 0;

  // --- Productivity score ---
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const activity = total > 0 ? Math.round(((inProgress + completed) / total) * 100) : 0;
  const blockedRatio = total > 0 ? blocked / total : 0;
  const health = Math.round((1 - blockedRatio) * 100);
  const score = Math.round(completionRate * 0.3 + avgProgress * 0.25 + activity * 0.25 + health * 0.2);

  let scoreColor = 'text-teal-500';
  let scoreBg = 'bg-teal-50 dark:bg-teal-900/10';
  let scoreComment = '';
  if (score >= 80) {
    scoreComment = '生产力出色！任务完成率高，团队运转高效，继续保持当前节奏。';
  } else if (score >= 60) {
    scoreComment = '生产力良好，仍有提升空间。关注未完成任务和阻塞项，加速推进。';
  } else if (score >= 40) {
    scoreComment = '生产力一般，建议优先处理阻塞任务，提高完成率。';
  } else {
    scoreColor = 'text-red-500';
    scoreBg = 'bg-red-50 dark:bg-red-900/10';
    scoreComment = '生产力偏低，大量任务积压。建议重新梳理优先级，集中精力突破。';
  }

  // --- Completion trend (last 14 days) ---
  const today = dayjs().startOf('day');
  const trend: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = today.subtract(i, 'day');
    const count = tasks.filter(t => {
      if (!t.actualEndDate) return false;
      return dayjs(t.actualEndDate).isSame(day, 'day');
    }).length;
    trend.push({ label: day.format('MM/DD'), count });
  }
  const maxTrendCount = Math.max(...trend.map(d => d.count), 1);

  // Week comparison
  const thisWeekStart = today.subtract(6, 'day');
  const lastWeekStart = today.subtract(13, 'day');
  const thisWeekCompleted = tasks.filter(t => t.actualEndDate && dayjs(t.actualEndDate) >= thisWeekStart).length;
  const lastWeekCompleted = tasks.filter(t => {
    if (!t.actualEndDate) return false;
    const d = dayjs(t.actualEndDate);
    return d >= lastWeekStart && d < thisWeekStart;
  }).length;
  const weekTrend = lastWeekCompleted > 0
    ? Math.round(((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100)
    : thisWeekCompleted > 0 ? 100 : 0;

  // --- Bottlenecks ---
  const bottlenecks: Bottleneck[] = [];
  if (blocked > 0) {
    bottlenecks.push({
      icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20',
      title: '阻塞任务积压',
      detail: `${blocked} 个任务处于阻塞状态，影响整体进度`,
      count: blocked,
    });
  }

  const overdueTasks = tasks.filter(t => {
    if (!t.estimatedEndDate || t.status === 'done') return false;
    return dayjs(t.estimatedEndDate) < today;
  });
  if (overdueTasks.length > 0) {
    bottlenecks.push({
      icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20',
      title: '任务逾期',
      detail: `${overdueTasks.length} 个任务已超过预计完成时间`,
      count: overdueTasks.length,
    });
  }

  const stalledTasks = tasks.filter(t => t.status === 'in-progress' && t.progress < 30);
  if (stalledTasks.length > 0) {
    bottlenecks.push({
      icon: TrendingDown, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20',
      title: '进展缓慢',
      detail: `${stalledTasks.length} 个进行中任务进度低于 30%，需要关注`,
      count: stalledTasks.length,
    });
  }

  // --- Workload ---
  const assigneeMap = new Map<string, { total: number; active: number; done: number }>();
  tasks.forEach(t => {
    const name = t.assignee || '未分配';
    const entry = assigneeMap.get(name) || { total: 0, active: 0, done: 0 };
    entry.total++;
    if (t.status === 'done') entry.done++;
    else entry.active++;
    assigneeMap.set(name, entry);
  });
  const workloads: Workload[] = Array.from(assigneeMap.entries())
    .map(([name, v]) => ({ name, ...v, ratio: v.total > 0 ? v.active / v.total : 0 }))
    .sort((a, b) => b.active - a.active)
    .slice(0, 8);

  // --- Insights ---
  const insights: Insight[] = [];

  if (completionRate >= 70) {
    insights.push({
      icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20',
      text: `任务完成率 ${completionRate}%，表现优秀`,
    });
  } else if (completionRate < 30 && total > 0) {
    insights.push({
      icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20',
      text: `任务完成率仅 ${completionRate}%，大量任务未完成`,
      suggestion: '建议优先处理高优先级任务，适当拆分大任务为小步骤',
    });
  }

  if (weekTrend > 0 && thisWeekCompleted > 0) {
    insights.push({
      icon: TrendingUp, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20',
      text: `本周完成 ${thisWeekCompleted} 个任务，较上周增长 ${weekTrend}%`,
    });
  } else if (weekTrend < 0) {
    insights.push({
      icon: TrendingDown, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: `本周完成量较上周下降 ${Math.abs(weekTrend)}%`,
      suggestion: '检查是否有阻塞任务影响进度，考虑重新分配资源',
    });
  }

  if (blocked > 0) {
    insights.push({
      icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20',
      text: `${blocked} 个任务被阻塞，占总任务的 ${total > 0 ? Math.round(blocked / total * 100) : 0}%`,
      suggestion: '及时排查阻塞原因，与相关责任人沟通解除障碍',
    });
  }

  if (todo > completed && total > 0) {
    insights.push({
      icon: Lightbulb, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      text: `待处理任务（${todo}）多于已完成任务（${completed}）`,
      suggestion: '建议按优先级排序，集中精力完成高优先级任务',
    });
  }

  // Workload imbalance
  if (workloads.length > 1) {
    const maxActive = Math.max(...workloads.map(w => w.active));
    const minActive = Math.min(...workloads.map(w => w.active));
    if (maxActive > minActive * 3 && minActive === 0) {
      const busiest = workloads.find(w => w.active === maxActive);
      insights.push({
        icon: Target, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20',
        text: `负载不均衡：${busiest?.name} 承担了 ${maxActive} 个活跃任务`,
        suggestion: '考虑将部分任务重新分配给其他成员，平衡工作负载',
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20',
      text: '各项指标正常，任务管理有序，继续保持！',
    });
  }

  return {
    score, scoreColor, scoreBg, scoreComment,
    metrics: { completionRate, avgProgress, activity, health },
    trend, maxTrendCount,
    thisWeekCompleted, lastWeekCompleted, weekTrend,
    bottlenecks, workloads, insights,
  };
}
