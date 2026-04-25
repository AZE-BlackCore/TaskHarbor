/**
 * 报告生成工具
 * 基于数据库数据自动生成日报、周报、月报
 */

import type { AgentTool } from '../types';
import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import { getSchedules } from '../../services/scheduleService';

function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getDateRange(type: 'day' | 'week' | 'month'): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (type === 'day') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (type === 'week') {
    const dayOfWeek = start.getDay() || 7;
    start.setDate(start.getDate() - dayOfWeek + 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (type === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

/**
 * 生成日报
 */
const generateDailyReportTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'generate_daily_report',
      description: '生成今日工作日报，包含今日完成任务、进行中任务、逾期任务和明日计划',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: '报告日期（可选，默认今天，格式 YYYY-MM-DD）',
          },
        },
      },
    },
  },
  execute: async (params) => {
    const reportDate = params.date ? new Date(params.date) : new Date();
    const { start, end } = params.date
      ? { start: new Date(params.date + 'T00:00:00'), end: new Date(params.date + 'T23:59:59') }
      : getDateRange('day');

    const allTasks = await taskService.findAll();
    const projects = await projectService.findAll();
    const projectMap = new Map(projects.map(p => [p.id as string, p.name as string]));

    const now = new Date();

    // 今日完成的任务（actualEndDate 在今天）
    const completedToday = allTasks.filter((t) => {
      if (t.status !== 'done') return false;
      const updatedAt = new Date(t.updatedAt as string);
      return updatedAt >= start && updatedAt <= end;
    });

    // 进行中任务
    const inProgressTasks = allTasks.filter((t) => t.status === 'in-progress');

    // 逾期任务
    const overdueTasks = allTasks.filter((t) => {
      if (t.status === 'done') return false;
      if (!t.estimatedEndDate) return false;
      return new Date(t.estimatedEndDate as string) < now;
    });

    // 明日到期任务
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const dueTomorrow = allTasks.filter((t) => {
      if (t.status === 'done') return false;
      if (!t.estimatedEndDate) return false;
      const deadline = new Date(t.estimatedEndDate as string);
      return deadline >= tomorrowStart && deadline <= tomorrowEnd;
    });

    const report = {
      type: 'daily',
      date: formatDate(reportDate),
      statistics: {
        completedToday: completedToday.length,
        inProgress: inProgressTasks.length,
        overdueCount: overdueTasks.length,
        dueTomorrow: dueTomorrow.length,
      },
      completedTasks: completedToday.map(t => ({
        id: t.id,
        description: t.description,
        project: projectMap.get(t.projectId as string) || '未知项目',
        assignee: t.assignee,
      })),
      inProgressTasks: inProgressTasks.slice(0, 10).map(t => ({
        id: t.id,
        description: t.description,
        progress: `${t.progress}%`,
        project: projectMap.get(t.projectId as string) || '未知项目',
        assignee: t.assignee,
      })),
      overdueAlerts: overdueTasks.slice(0, 5).map(t => ({
        id: t.id,
        description: t.description,
        deadline: t.estimatedEndDate,
        project: projectMap.get(t.projectId as string) || '未知项目',
        assignee: t.assignee,
      })),
      tomorrowPlan: dueTomorrow.map(t => ({
        id: t.id,
        description: t.description,
        project: projectMap.get(t.projectId as string) || '未知项目',
        assignee: t.assignee,
      })),
    };

    return report;
  },
};

/**
 * 生成周报
 */
const generateWeeklyReportTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'generate_weekly_report',
      description: '生成本周工作周报，包含本周完成任务统计、项目进度概览和下周计划',
      parameters: {
        type: 'object',
        properties: {
          weekOffset: {
            type: 'number',
            description: '周偏移量，0 表示本周，-1 表示上周（可选，默认本周）',
          },
        },
      },
    },
  },
  execute: async (params) => {
    const offset = params.weekOffset || 0;
    const { start, end } = getDateRange('week');

    if (offset !== 0) {
      start.setDate(start.getDate() + offset * 7);
      end.setDate(end.getDate() + offset * 7);
    }

    const allTasks = await taskService.findAll();
    const projectsSummary = await projectService.getAllProjectsSummary();

    // 本周完成的任务
    const completedThisWeek = allTasks.filter((t) => {
      if (t.status !== 'done') return false;
      const updatedAt = new Date(t.updatedAt as string);
      return updatedAt >= start && updatedAt <= end;
    });

    // 本周新建的任务
    const createdThisWeek = allTasks.filter((t) => {
      const createdAt = new Date(t.createdAt as string);
      return createdAt >= start && createdAt <= end;
    });

    // 下周到期任务
    const nextWeekStart = new Date(end);
    nextWeekStart.setDate(nextWeekStart.getDate() + 1);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);

    const dueNextWeek = allTasks.filter((t) => {
      if (t.status === 'done') return false;
      if (!t.estimatedEndDate) return false;
      const deadline = new Date(t.estimatedEndDate as string);
      return deadline >= nextWeekStart && deadline <= nextWeekEnd;
    });

    // 各状态统计
    const statusStats = await taskService.countByStatus();

    return {
      type: 'weekly',
      period: `${formatDate(start)} ~ ${formatDate(end)}`,
      statistics: {
        completedThisWeek: completedThisWeek.length,
        newTasksThisWeek: createdThisWeek.length,
        totalInProgress: statusStats['in-progress'] || 0,
        totalBlocked: statusStats['blocked'] || 0,
        dueNextWeek: dueNextWeek.length,
      },
      projectOverview: projectsSummary.map((p: any) => ({
        id: p.id,
        name: p.name,
        totalTasks: p.totalTasks,
        averageProgress: `${p.averageProgress}%`,
        completedRatio: p.totalTasks > 0
          ? `${Math.round(((p.byStatus?.find((s: any) => s.status === 'done')?.count || 0) / p.totalTasks) * 100)}%`
          : '0%',
      })),
      topCompleted: completedThisWeek.slice(0, 10).map(t => ({
        description: t.description,
        assignee: t.assignee,
      })),
      nextWeekFocus: dueNextWeek.slice(0, 10).map(t => ({
        description: t.description,
        deadline: t.estimatedEndDate,
        assignee: t.assignee,
      })),
    };
  },
};

/**
 * 生成月报
 */
const generateMonthlyReportTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'generate_monthly_report',
      description: '生成本月工作月报，包含完成率统计、效率指标、项目健康度分析',
      parameters: {
        type: 'object',
        properties: {
          monthOffset: {
            type: 'number',
            description: '月份偏移量，0 表示本月，-1 表示上月（可选，默认本月）',
          },
        },
      },
    },
  },
  execute: async (params) => {
    const offset = params.monthOffset || 0;
    const { start, end } = getDateRange('month');

    if (offset !== 0) {
      start.setMonth(start.getMonth() + offset);
      end.setMonth(end.getMonth() + offset);
    }

    const allTasks = await taskService.findAll();
    const projects = await projectService.findAll();

    // 本月完成任务
    const completedThisMonth = allTasks.filter((t) => {
      if (t.status !== 'done') return false;
      const updatedAt = new Date(t.updatedAt as string);
      return updatedAt >= start && updatedAt <= end;
    });

    // 本月新建任务
    const createdThisMonth = allTasks.filter((t) => {
      const createdAt = new Date(t.createdAt as string);
      return createdAt >= start && createdAt <= end;
    });

    // 各状态分布
    const statusStats = await taskService.countByStatus();
    const totalActive = Object.values(statusStats).reduce((a: number, b: any) => a + b, 0);

    // 按负责人统计
    const assigneeStats = await taskService.countByAssignee();

    return {
      type: 'monthly',
      period: `${formatDate(start)} ~ ${formatDate(end)}`,
      statistics: {
        completedThisMonth: completedThisMonth.length,
        createdThisMonth: createdThisMonth.length,
        completionRate: createdThisMonth.length > 0
          ? `${Math.round((completedThisMonth.length / createdThisMonth.length) * 100)}%`
          : 'N/A',
        totalActiveTasks: totalActive,
        statusDistribution: statusStats,
      },
      projectHealth: projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type,
      })),
      teamPerformance: Object.entries(assigneeStats).map(([assignee, count]) => ({
        assignee,
        totalTasks: count,
      })).sort((a: any, b: any) => b.totalTasks - a.totalTasks),
    };
  },
};

export const reportTools: AgentTool[] = [
  generateDailyReportTool,
  generateWeeklyReportTool,
  generateMonthlyReportTool,
];
