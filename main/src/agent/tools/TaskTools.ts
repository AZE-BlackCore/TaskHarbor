/**
 * 任务相关工具
 * 直接调用 taskService 单例，无需走 IPC
 */

import type { AgentTool } from '../types';
import { taskService } from '../../services/taskService';

/**
 * 查询任务列表工具
 */
const listTasksTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: '查询任务列表，支持按项目、状态、负责人过滤。返回匹配的任务列表。',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: '项目 ID（可选），不传则查询所有项目的任务',
          },
          status: {
            type: 'string',
            description: '任务状态过滤（可选）',
            enum: ['todo', 'in-progress', 'blocked', 'done'],
          },
          assignee: {
            type: 'string',
            description: '负责人过滤（可选）',
          },
        },
      },
    },
  },
  execute: async (params) => {
    const tasks = await taskService.findAll({
      projectId: params.projectId,
      status: params.status,
      assignee: params.assignee,
    });
    return tasks;
  },
};

/**
 * 获取单个任务详情
 */
const getTaskTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_task',
      description: '根据任务 ID 获取任务详细信息',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: '任务 ID',
          },
        },
        required: ['taskId'],
      },
    },
  },
  execute: async (params) => {
    const task = await taskService.findById(params.taskId);
    if (!task) throw new Error(`任务不存在: ${params.taskId}`);
    return task;
  },
};

/**
 * 创建任务工具（需用户确认）
 */
const createTaskTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'create_task',
      description: '在指定项目中创建一个新任务',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: '所属项目 ID',
          },
          description: {
            type: 'string',
            description: '任务描述/名称',
          },
          status: {
            type: 'string',
            description: '初始状态，默认为 todo',
            enum: ['todo', 'in-progress', 'blocked'],
          },
          assignee: {
            type: 'string',
            description: '负责人（可选）',
          },
          startDate: {
            type: 'string',
            description: '开始日期，ISO 格式（可选）',
          },
          estimatedEndDate: {
            type: 'string',
            description: '预计完成日期，ISO 格式（可选）',
          },
          module: {
            type: 'string',
            description: '所属模块（可选）',
          },
          notes: {
            type: 'string',
            description: '备注（可选）',
          },
        },
        required: ['projectId', 'description'],
      },
    },
  },
  requireConfirmation: true,
  formatConfirmation: (params) => {
    const lines = [
      `📝 **创建任务**`,
      `- 项目ID: ${params.projectId}`,
      `- 描述: ${params.description}`,
    ];
    if (params.assignee) lines.push(`- 负责人: ${params.assignee}`);
    if (params.estimatedEndDate) lines.push(`- 截止日期: ${params.estimatedEndDate}`);
    if (params.status) lines.push(`- 状态: ${params.status}`);
    return lines.join('\n');
  },
  execute: async (params) => {
    const task = await taskService.createTask({
      projectId: params.projectId,
      description: params.description,
      status: params.status || 'todo',
      assignee: params.assignee,
      startDate: params.startDate,
      estimatedEndDate: params.estimatedEndDate,
      module: params.module,
      notes: params.notes,
    });
    return task;
  },
};

/**
 * 更新任务工具（需用户确认）
 */
const updateTaskTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'update_task',
      description: '更新指定任务的字段，只传入需要修改的字段',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: '要更新的任务 ID',
          },
          description: { type: 'string', description: '新的任务描述' },
          status: {
            type: 'string',
            description: '新的任务状态',
            enum: ['todo', 'in-progress', 'blocked', 'done'],
          },
          progress: {
            type: 'number',
            description: '进度 0-100',
          },
          assignee: { type: 'string', description: '新的负责人' },
          estimatedEndDate: { type: 'string', description: '新的预计完成日期（ISO 格式）' },
          actualEndDate: { type: 'string', description: '实际完成日期（ISO 格式）' },
          notes: { type: 'string', description: '备注' },
        },
        required: ['taskId'],
      },
    },
  },
  requireConfirmation: true,
  formatConfirmation: (params) => {
    const { taskId, ...updates } = params;
    const lines = [`✏️ **更新任务** (ID: ${taskId})`];
    for (const [key, value] of Object.entries(updates)) {
      lines.push(`- ${key}: ${value}`);
    }
    return lines.join('\n');
  },
  execute: async (params) => {
    const { taskId, ...updates } = params;
    const success = await taskService.updateTask(taskId, updates);
    if (!success) throw new Error(`任务更新失败: ${taskId}`);
    return await taskService.findById(taskId);
  },
};

/**
 * 删除任务工具（需用户确认）
 */
const deleteTaskTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'delete_task',
      description: '删除指定任务（不可撤销）',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: '要删除的任务 ID',
          },
        },
        required: ['taskId'],
      },
    },
  },
  requireConfirmation: true,
  formatConfirmation: (params) => `🗑️ **删除任务** (ID: ${params.taskId})\n\n⚠️ 此操作不可撤销！`,
  execute: async (params) => {
    const success = await taskService.deleteTask(params.taskId);
    if (!success) throw new Error(`任务删除失败，可能不存在: ${params.taskId}`);
    return { deleted: true, taskId: params.taskId };
  },
};

/**
 * 批量删除任务工具（需用户确认）
 */
const deleteTasksBatchTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'delete_tasks_batch',
      description: '批量删除多个任务（不可撤销），删除前请先通过 list_tasks 确认要删除的任务列表',
      parameters: {
        type: 'object',
        properties: {
          taskIds: {
            type: 'array',
            description: '要删除的任务 ID 数组',
            items: { type: 'string' },
          },
        },
        required: ['taskIds'],
      },
    },
  },
  requireConfirmation: true,
  formatConfirmation: (params) => {
    const count = params.taskIds?.length || 0;
    return `🗑️ **批量删除 ${count} 个任务**\n\n⚠️ 此操作不可撤销！\n受影响任务 ID：${params.taskIds?.join(', ')}`;
  },
  execute: async (params) => {
    const deleted = await taskService.deleteTasks(params.taskIds);
    return { deleted, total: params.taskIds.length };
  },
};

/**
 * 统计任务工具
 */
const countTasksTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'count_tasks',
      description: '统计任务数量，可按项目、状态分组统计',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: '项目 ID（可选）',
          },
          groupBy: {
            type: 'string',
            description: '分组方式',
            enum: ['status', 'assignee', 'total'],
          },
        },
      },
    },
  },
  execute: async (params) => {
    if (params.groupBy === 'status') {
      return await taskService.countByStatus(params.projectId);
    } else if (params.groupBy === 'assignee') {
      return await taskService.countByAssignee(params.projectId);
    }
    return { total: await taskService.count({ projectId: params.projectId }) };
  },
};

export const taskTools: AgentTool[] = [
  listTasksTool,
  getTaskTool,
  createTaskTool,
  updateTaskTool,
  deleteTaskTool,
  deleteTasksBatchTool,
  countTasksTool,
];
