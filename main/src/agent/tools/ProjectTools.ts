/**
 * 项目相关工具
 * 直接调用 projectService 单例
 */

import type { AgentTool } from '../types';
import { projectService } from '../../services/projectService';

/**
 * 查询项目列表
 */
const listProjectsTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'list_projects',
      description: '获取所有项目列表，包括项目基本信息',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: '项目类型过滤（可选）',
            enum: ['personal', 'company'],
          },
        },
      },
    },
  },
  execute: async (params) => {
    if (params.type) {
      return await projectService.findByType(params.type);
    }
    return await projectService.findAll();
  },
};

/**
 * 获取项目详情（含统计）
 */
const getProjectStatsTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_project_stats',
      description: '获取指定项目的详细统计信息（任务数量、各状态分布、平均进度）',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: '项目 ID',
          },
        },
        required: ['projectId'],
      },
    },
  },
  execute: async (params) => {
    const [project, stats] = await Promise.all([
      projectService.findById(params.projectId),
      projectService.getProjectStats(params.projectId),
    ]);
    if (!project) throw new Error(`项目不存在: ${params.projectId}`);
    return { ...project, stats };
  },
};

/**
 * 获取所有项目汇总统计
 */
const getAllProjectsSummaryTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_all_projects_summary',
      description: '获取所有项目的汇总统计信息，适合做整体进度概览',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  execute: async () => {
    return await projectService.getAllProjectsSummary();
  },
};

/**
 * 创建项目（需用户确认）
 */
const createProjectTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'create_project',
      description: '创建一个新项目',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: '项目名称',
          },
          type: {
            type: 'string',
            description: '项目类型',
            enum: ['personal', 'company'],
          },
          description: {
            type: 'string',
            description: '项目描述（可选）',
          },
          color: {
            type: 'string',
            description: '项目颜色，十六进制格式（可选）',
          },
        },
        required: ['name', 'type'],
      },
    },
  },
  requireConfirmation: true,
  formatConfirmation: (params) => {
    return `📁 **创建项目**\n- 名称: ${params.name}\n- 类型: ${params.type === 'personal' ? '个人项目' : '公司项目'}\n${params.description ? `- 描述: ${params.description}` : ''}`;
  },
  execute: async (params) => {
    return await projectService.createProject({
      name: params.name,
      type: params.type,
      description: params.description,
      color: params.color,
    });
  },
};

/**
 * 更新项目（需用户确认）
 */
const updateProjectTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'update_project',
      description: '更新项目信息',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: '项目 ID',
          },
          name: { type: 'string', description: '新名称' },
          description: { type: 'string', description: '新描述' },
          color: { type: 'string', description: '新颜色' },
        },
        required: ['projectId'],
      },
    },
  },
  requireConfirmation: true,
  formatConfirmation: (params) => {
    const { projectId, ...updates } = params;
    const lines = [`✏️ **更新项目** (ID: ${projectId})`];
    for (const [key, value] of Object.entries(updates)) {
      lines.push(`- ${key}: ${value}`);
    }
    return lines.join('\n');
  },
  execute: async (params) => {
    const { projectId, ...updates } = params;
    await projectService.updateProject(projectId, updates);
    return await projectService.findById(projectId);
  },
};

export const projectTools: AgentTool[] = [
  listProjectsTool,
  getProjectStatsTool,
  getAllProjectsSummaryTool,
  createProjectTool,
  updateProjectTool,
];
