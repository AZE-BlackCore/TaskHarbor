import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Task, Tag } from '../../types';
import {
  FileText, Download, Calendar, ChevronDown, RefreshCw,
  CheckCircle2, Clock, AlertCircle, BarChart3, ListChecks,
} from 'lucide-react';

interface ReportGeneratorProps {
  tasks: Task[];
  tags: Tag[];
  schedules: { id: string; title: string; startTime: string; endTime: string; priority?: string }[];
}

type ReportType = 'daily' | 'weekly' | 'monthly';

const REPORT_META: Record<ReportType, { label: string; days: number }> = {
  daily: { label: '日报', days: 1 },
  weekly: { label: '周报', days: 7 },
  monthly: { label: '月报', days: 30 },
};

export function ReportGenerator({ tasks, tags, schedules }: ReportGeneratorProps) {
  const [reportType, setReportType] = useState<ReportType>('weekly');
  const [reportDate, setReportDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const reportContent = useMemo(() => {
    if (!generated) return '';
    return generateReport(tasks, tags, schedules, reportType, reportDate);
  }, [generated, tasks, tags, schedules, reportType, reportDate]);

  const handleGenerate = () => {
    setGenerated(true);
    setCopied(false);
  };

  const handleDownload = () => {
    const meta = REPORT_META[reportType];
    const dateStr = dayjs(reportDate).format('YYYY-MM-DD');
    const filename = `TaskHarbor_${meta.label}_${dateStr}.md`;
    // Use Blob to trigger download
    const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const startDate = dayjs(reportDate).subtract(REPORT_META[reportType].days - 1, 'day');
  const endDate = dayjs(reportDate);

  // Preview stats
  const periodTasks = useMemo(() => {
    if (!generated) return [];
    return tasks.filter(t => {
      const d = dayjs(t.updatedAt);
      return d >= startDate.startOf('day') && d <= endDate.endOf('day');
    });
  }, [tasks, generated, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Report configuration */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-500" />
          报告配置
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Report type */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">报告类型</label>
            <div className="relative">
              <select
                value={reportType}
                onChange={e => { setReportType(e.target.value as ReportType); setGenerated(false); }}
                className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="daily">日报</option>
                <option value="weekly">周报</option>
                <option value="monthly">月报</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {/* Date */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">报告日期</label>
            <input
              type="date"
              value={reportDate}
              onChange={e => { setReportDate(e.target.value); setGenerated(false); }}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          {/* Generate button */}
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              生成报告
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          报告范围：{startDate.format('YYYY-MM-DD')} ~ {endDate.format('YYYY-MM-DD')}
        </p>
      </div>

      {/* Quick stats preview */}
      {generated && periodTasks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PreviewCard icon={ListChecks} label="期间任务" value={periodTasks.length} color="text-teal-500 bg-teal-50 dark:bg-teal-900/20" />
          <PreviewCard icon={CheckCircle2} label="已完成" value={periodTasks.filter(t => t.status === 'done').length} color="text-green-500 bg-green-50 dark:bg-green-900/20" />
          <PreviewCard icon={Clock} label="进行中" value={periodTasks.filter(t => t.status === 'in-progress').length} color="text-blue-500 bg-blue-50 dark:bg-blue-900/20" />
          <PreviewCard icon={AlertCircle} label="已阻塞" value={periodTasks.filter(t => t.status === 'blocked').length} color="text-red-500 bg-red-50 dark:bg-red-900/20" />
        </div>
      )}

      {/* Report content */}
      {generated && (
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">报告预览</span>
              <span className="text-xs text-gray-400">Markdown</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 px-2.5 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <FileText className="w-3.5 h-3.5" />}
                {copied ? '已复制' : '复制'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-xs text-white bg-teal-500 hover:bg-teal-600 px-2.5 py-1.5 rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                下载
              </button>
            </div>
          </div>
          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-auto">
            <div className="prose-report">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!generated && (
        <div className="bg-white dark:bg-dark-card rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-sm text-gray-400">选择报告类型和日期，点击"生成报告"创建自动化报告</p>
        </div>
      )}
    </div>
  );
}

function PreviewCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

// ---------- Report generation logic ----------

function generateReport(
  tasks: Task[],
  tags: Tag[],
  schedules: { id: string; title: string; startTime: string; endTime: string; priority?: string }[],
  type: ReportType,
  dateStr: string,
): string {
  const meta = REPORT_META[type];
  const endDate = dayjs(dateStr);
  const startDate = endDate.subtract(meta.days - 1, 'day');
  const now = dayjs();
  const lines: string[] = [];

  // Header
  lines.push(`# TaskHarbor ${meta.label}`);
  lines.push('');
  lines.push(`> 生成时间：${now.format('YYYY-MM-DD HH:mm:ss')}`);
  lines.push(`> 报告范围：${startDate.format('YYYY-MM-DD')} ~ ${endDate.format('YYYY-MM-DD')}`);
  lines.push('');

  // --- Overview ---
  lines.push('## 一、任务概览');
  lines.push('');

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const todo = tasks.filter(t => t.status === 'todo').length;
  const review = tasks.filter(t => t.status === 'review').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const avgProgress = total > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / total) : 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  lines.push('| 指标 | 数值 |');
  lines.push('|------|------|');
  lines.push(`| 总任务数 | ${total} |`);
  lines.push(`| 已完成 | ${completed} (${completionRate}%) |`);
  lines.push(`| 进行中 | ${inProgress} |`);
  lines.push(`| 待处理 | ${todo} |`);
  lines.push(`| 审核中 | ${review} |`);
  lines.push(`| 已阻塞 | ${blocked} |`);
  lines.push(`| 平均进度 | ${avgProgress}% |`);
  lines.push('');

  // --- Period activity ---
  const periodTasks = tasks.filter(t => {
    const d = dayjs(t.updatedAt);
    return d >= startDate.startOf('day') && d <= endDate.endOf('day');
  });
  const periodCompleted = periodTasks.filter(t => t.status === 'done');
  const periodNew = tasks.filter(t => dayjs(t.createdAt) >= startDate.startOf('day') && dayjs(t.createdAt) <= endDate.endOf('day'));

  lines.push('## 二、本期活动');
  lines.push('');
  lines.push(`- 本期活跃任务：**${periodTasks.length}** 个`);
  lines.push(`- 本期新增任务：**${periodNew.length}** 个`);
  lines.push(`- 本期完成任务：**${periodCompleted.length}** 个`);
  lines.push('');

  // --- Priority analysis ---
  lines.push('## 三、优先级分布');
  lines.push('');
  const highTasks = tasks.filter(t => t.priority === 'high');
  const mediumTasks = tasks.filter(t => t.priority === 'medium');
  const lowTasks = tasks.filter(t => t.priority === 'low');
  lines.push('| 优先级 | 数量 | 占比 |');
  lines.push('|--------|------|------|');
  lines.push(`| 高 | ${highTasks.length} | ${total > 0 ? Math.round(highTasks.length / total * 100) : 0}% |`);
  lines.push(`| 中 | ${mediumTasks.length} | ${total > 0 ? Math.round(mediumTasks.length / total * 100) : 0}% |`);
  lines.push(`| 低 | ${lowTasks.length} | ${total > 0 ? Math.round(lowTasks.length / total * 100) : 0}% |`);
  lines.push('');

  // --- Assignee analysis ---
  const assigneeMap = new Map<string, { total: number; done: number; active: number }>();
  tasks.forEach(t => {
    const name = t.assignee || '未分配';
    const entry = assigneeMap.get(name) || { total: 0, done: 0, active: 0 };
    entry.total++;
    if (t.status === 'done') entry.done++;
    else entry.active++;
    assigneeMap.set(name, entry);
  });

  if (assigneeMap.size > 0) {
    lines.push('## 四、责任人分布');
    lines.push('');
    lines.push('| 责任人 | 总任务 | 已完成 | 活跃 | 完成率 |');
    lines.push('|--------|--------|--------|------|--------|');
    Array.from(assigneeMap.entries())
      .sort(([, a], [, b]) => b.total - a.total)
      .forEach(([name, v]) => {
        const rate = v.total > 0 ? Math.round(v.done / v.total * 100) : 0;
        lines.push(`| ${name} | ${v.total} | ${v.done} | ${v.active} | ${rate}% |`);
      });
    lines.push('');
  }

  // --- Bottleneck analysis ---
  const bottlenecks: string[] = [];
  if (blocked > 0) {
    bottlenecks.push(`- **阻塞任务**：${blocked} 个任务处于阻塞状态，需要及时排查原因`);
  }
  const overdue = tasks.filter(t => t.estimatedEndDate && t.status !== 'done' && dayjs(t.estimatedEndDate) < endDate);
  if (overdue.length > 0) {
    bottlenecks.push(`- **逾期任务**：${overdue.length} 个任务已超过预计完成时间`);
  }
  const stalled = tasks.filter(t => t.status === 'in-progress' && t.progress < 30);
  if (stalled.length > 0) {
    bottlenecks.push(`- **进展缓慢**：${stalled.length} 个进行中任务进度低于 30%`);
  }

  if (bottlenecks.length > 0) {
    lines.push('## 五、问题与风险');
    lines.push('');
    bottlenecks.forEach(b => lines.push(b));
    lines.push('');
  }

  // --- Schedule stats ---
  const periodSchedules = schedules.filter(s => {
    const d = dayjs(s.startTime);
    return d >= startDate.startOf('day') && d <= endDate.endOf('day');
  });
  lines.push('## 六、日程统计');
  lines.push('');
  lines.push(`- 本期日程：**${periodSchedules.length}** 个`);
  if (periodSchedules.length > 0) {
    lines.push('');
    lines.push('| 日程 | 时间 | 优先级 |');
    lines.push('|------|------|--------|');
    periodSchedules.slice(0, 20).forEach(s => {
      const time = `${dayjs(s.startTime).format('MM/DD HH:mm')} - ${dayjs(s.endTime).format('HH:mm')}`;
      const pri = s.priority === 'high' ? '高' : s.priority === 'low' ? '低' : '中';
      lines.push(`| ${s.title} | ${time} | ${pri} |`);
    });
    if (periodSchedules.length > 20) {
      lines.push(`| ...还有 ${periodSchedules.length - 20} 个日程 | | |`);
    }
  }
  lines.push('');

  // --- Recommendations ---
  lines.push('## 七、建议与行动项');
  lines.push('');
  const recommendations: string[] = [];
  if (blocked > 0) {
    recommendations.push(`1. 优先解决 ${blocked} 个阻塞任务，消除进度障碍`);
  }
  if (overdue.length > 0) {
    recommendations.push(`2. 处理 ${overdue.length} 个逾期任务，评估是否需要调整截止日期`);
  }
  if (todo > inProgress && todo > 0) {
    recommendations.push(`3. 待处理任务较多（${todo} 个），建议按优先级排序后逐步推进`);
  }
  if (completionRate < 50 && total > 0) {
    recommendations.push(`4. 整体完成率偏低（${completionRate}%），考虑重新评估任务优先级和资源分配`);
  }
  if (stalled.length > 0) {
    recommendations.push(`5. 关注 ${stalled.length} 个进展缓慢的任务，提供必要支持`);
  }
  if (recommendations.length === 0) {
    recommendations.push('1. 各项指标正常，保持当前工作节奏');
  }
  recommendations.forEach(r => lines.push(r));
  lines.push('');

  // --- Tags ---
  if (tags.length > 0) {
    lines.push('## 八、标签概览');
    lines.push('');
    tags.forEach(tag => {
      const tagTaskCount = tasks.filter(t => {
        // Since we don't have direct tag-task relation in task object, just list tags
        return false;
      }).length;
      lines.push(`- \`${tag.name}\``);
    });
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*本报告由 TaskHarbor 自动生成*');

  return lines.join('\n');
}
