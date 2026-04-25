/**
 * 数据分析工具
 * 基于 taskService 和 projectService 提供深层次的数据分析
 */

import type { AgentTool } from '../types';
import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import { getSchedules } from '../../services/scheduleService';

/**
 * 分析项目进度
 */
const analyzeProjectProgressTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'analyze_project_progress',
      description: '深度分析指定项目的进度，包括完成率、各阶段分布、进展趋势',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: '要分析的项目 ID',
          },
        },
        required: ['projectId'],
      },
    },
  },
  execute: async (params) => {
    const [project, tasks] = await Promise.all([
      projectService.findById(params.projectId),
      taskService.findAll({ projectId: params.projectId }),
    ]);

    if (!project) throw new Error(`项目不存在: ${params.projectId}`);

    const total = tasks.length;
    if (total === 0) return { project, message: '该项目暂无任务', total: 0 };

    const statusCount: Record<string, number> = {};
    let totalProgress = 0;

    for (const task of tasks) {
      statusCount[task.status as string] = (statusCount[task.status as string] || 0) + 1;
      totalProgress += (task.progress as number) || 0;
    }

    const done = statusCount['done'] || 0;
    const inProgress = statusCount['in-progress'] || 0;
    const todo = statusCount['todo'] || 0;
    const blocked = statusCount['blocked'] || 0;
    const completionRate = Math.round((done / total) * 100);
    const avgProgress = Math.round(totalProgress / total);

    // 找出逾期任务
    const now = new Date();
    const overdueTasks = tasks.filter((task) => {
      if (task.status === 'done') return false;
      if (!task.estimatedEndDate) return false;
      return new Date(task.estimatedEndDate as string) < now;
    });

    // 找出即将到期任务（7 天内）
    const soonDueTasks = tasks.filter((task) => {
      if (task.status === 'done') return false;
      if (!task.estimatedEndDate) return false;
      const deadline = new Date(task.estimatedEndDate as string);
      const diff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    });

    return {
      project: { id: project.id, name: project.name },
      summary: {
        total,
        done,
        inProgress,
        todo,
        blocked,
        completionRate: `${completionRate}%`,
        avgProgress: `${avgProgress}%`,
      },
      risks: {
        overdueCount: overdueTasks.length,
        overdueTasks: overdueTasks.map((t) => ({
          id: t.id,
          description: t.description,
          deadline: t.estimatedEndDate,
        })),
        soonDueCount: soonDueTasks.length,
      },
    };
  },
};

/**
 * 分析逾期风险
 */
const analyzeOverdueRisksTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'analyze_overdue_risks',
      description: '分析所有项目中存在逾期风险的任务，提供预警信息',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: '指定项目 ID（可选，不传则分析所有项目）',
          },
          daysAhead: {
            type: 'number',
            description: '提前预警天数，默认 7 天内即将到期',
          },
        },
      },
    },
  },
  execute: async (params) => {
    const tasks = await taskService.findAll(
      params.projectId ? { projectId: params.projectId } : undefined
    );

    const now = new Date();
    const daysAhead = params.daysAhead || 7;
    const warnDeadline = new Date(now.getTime() + daysAhead * 24 * 3600 * 1000);

    const overdue = [];
    const soonDue = [];

    for (const task of tasks) {
      if (task.status === 'done') continue;
      if (!task.estimatedEndDate) continue;

      const deadline = new Date(task.estimatedEndDate as string);
      if (deadline < now) {
        const overdueDays = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
        overdue.push({
          id: task.id,
          description: task.description,
          status: task.status,
          assignee: task.assignee,
          deadline: task.estimatedEndDate,
          overdueDays,
        });
      } else if (deadline <= warnDeadline) {
        const daysLeft = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        soonDue.push({
          id: task.id,
          description: task.description,
          status: task.status,
          assignee: task.assignee,
          deadline: task.estimatedEndDate,
          daysLeft,
        });
      }
    }

    return {
      overdueCount: overdue.length,
      soonDueCount: soonDue.length,
      overdueTasks: overdue.sort((a, b) => b.overdueDays - a.overdueDays),
      soonDueTasks: soonDue.sort((a, b) => a.daysLeft - b.daysLeft),
    };
  },
};

/**
 * 分析工作量分布
 */
const analyzeWorkloadTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'analyze_workload',
      description: '分析团队成员的工作量分布，帮助识别负载不均衡问题',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: '项目 ID（可选，不传则分析所有项目）',
          },
        },
      },
    },
  },
  execute: async (params) => {
    const tasks = await taskService.findAll(
      params.projectId ? { projectId: params.projectId } : undefined
    );

    const assigneeMap: Record<string, { total: number; done: number; inProgress: number; todo: number; blocked: number }> = {};

    for (const task of tasks) {
      const assignee = (task.assignee as string) || '未分配';
      if (!assigneeMap[assignee]) {
        assigneeMap[assignee] = { total: 0, done: 0, inProgress: 0, todo: 0, blocked: 0 };
      }
      const entry = assigneeMap[assignee];
      entry.total++;
      const status = task.status as string;
      if (status === 'done') entry.done++;
      else if (status === 'in-progress') entry.inProgress++;
      else if (status === 'todo') entry.todo++;
      else if (status === 'blocked') entry.blocked++;
    }

    const workload = Object.entries(assigneeMap).map(([assignee, stats]) => ({
      assignee,
      ...stats,
      completionRate: stats.total > 0 ? `${Math.round((stats.done / stats.total) * 100)}%` : '0%',
    })).sort((a, b) => b.total - a.total);

    const totalAssignees = Object.keys(assigneeMap).filter(k => k !== '未分配').length;
    const avgLoad = totalAssignees > 0
      ? Math.round(tasks.filter(t => t.assignee).length / totalAssignees)
      : 0;

    return {
      summary: {
        totalTasks: tasks.length,
        assigneeCount: totalAssignees,
        avgTasksPerPerson: avgLoad,
        unassigned: assigneeMap['未分配']?.total || 0,
      },
      workload,
    };
  },
};

export const analysisTools: AgentTool[] = [
  analyzeProjectProgressTool,
  analyzeOverdueRisksTool,
  analyzeWorkloadTool,
];
