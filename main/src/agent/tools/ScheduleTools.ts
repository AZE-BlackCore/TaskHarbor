/**
 * 日程相关工具
 * 直接调用 scheduleService
 */

import type { AgentTool } from '../types';
import {
  getSchedules,
  createSchedule,
  getSchedulesByDate,
  deleteSchedule,
} from '../../services/scheduleService';

/**
 * 查询日程列表
 */
const listSchedulesTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'list_schedules',
      description: '查询日程列表，支持按日期范围、优先级过滤',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: '开始日期（ISO 格式，可选）',
          },
          endDate: {
            type: 'string',
            description: '结束日期（ISO 格式，可选）',
          },
          priority: {
            type: 'string',
            description: '优先级过滤（可选）',
            enum: ['low', 'medium', 'high'],
          },
          search: {
            type: 'string',
            description: '关键词搜索（可选）',
          },
        },
      },
    },
  },
  execute: async (params) => {
    const filters: any = {};
    if (params.startDate || params.endDate) {
      filters.dateRange = {
        start: params.startDate || new Date(0).toISOString(),
        end: params.endDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      };
    }
    if (params.priority) filters.priority = params.priority;
    if (params.search) filters.search = params.search;
    return await getSchedules(Object.keys(filters).length > 0 ? filters : undefined);
  },
};

/**
 * 获取今日日程
 */
const getTodaySchedulesTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_today_schedules',
      description: '获取今天的所有日程安排',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  execute: async () => {
    const today = new Date().toISOString().split('T')[0];
    return await getSchedulesByDate(today);
  },
};

/**
 * 创建日程（需用户确认）
 */
const createScheduleTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'create_schedule',
      description: '创建一个新的日程安排',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '日程标题',
          },
          startTime: {
            type: 'string',
            description: '开始时间（ISO 格式）',
          },
          endTime: {
            type: 'string',
            description: '结束时间（ISO 格式）',
          },
          description: {
            type: 'string',
            description: '日程描述（可选）',
          },
          location: {
            type: 'string',
            description: '地点（可选）',
          },
          priority: {
            type: 'string',
            description: '优先级（可选）',
            enum: ['low', 'medium', 'high'],
          },
          allDay: {
            type: 'boolean',
            description: '是否全天事件（可选）',
          },
        },
        required: ['title', 'startTime', 'endTime'],
      },
    },
  },
  requireConfirmation: true,
  formatConfirmation: (params) => {
    return [
      `📅 **创建日程**`,
      `- 标题: ${params.title}`,
      `- 开始: ${params.startTime}`,
      `- 结束: ${params.endTime}`,
      params.location ? `- 地点: ${params.location}` : '',
    ].filter(Boolean).join('\n');
  },
  execute: async (params) => {
    return await createSchedule({
      title: params.title,
      startTime: params.startTime,
      endTime: params.endTime,
      description: params.description,
      location: params.location,
      priority: params.priority || 'medium',
      allDay: params.allDay || false,
    });
  },
};

/**
 * 删除日程（需用户确认）
 */
const deleteScheduleTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'delete_schedule',
      description: '删除指定日程',
      parameters: {
        type: 'object',
        properties: {
          scheduleId: {
            type: 'string',
            description: '要删除的日程 ID',
          },
        },
        required: ['scheduleId'],
      },
    },
  },
  requireConfirmation: true,
  formatConfirmation: (params) => `🗑️ **删除日程** (ID: ${params.scheduleId})`,
  execute: async (params) => {
    await deleteSchedule(params.scheduleId);
    return { deleted: true, scheduleId: params.scheduleId };
  },
};

export const scheduleTools: AgentTool[] = [
  listSchedulesTool,
  getTodaySchedulesTool,
  createScheduleTool,
  deleteScheduleTool,
];
