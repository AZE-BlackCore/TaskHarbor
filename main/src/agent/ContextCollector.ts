/**
 * 上下文收集器
 * 收集和管理页面上下文信息，让 Agent 感知当前用户正在做什么
 */

import type { PageContext } from './types';
import { taskService } from '../services/taskService';
import { projectService } from '../services/projectService';

/**
 * 上下文收集器
 * 渲染进程会通过 IPC 传递页面上下文，主进程在此基础上补充数据库信息
 */
class ContextCollectorInstance {
  /**
   * 收集完整上下文
   * @param partialContext 渲染进程传来的部分上下文（视图、选中项等）
   */
  async collect(partialContext?: Partial<PageContext>): Promise<PageContext> {
    const context: PageContext = {
      currentView: partialContext?.currentView || 'unknown',
      currentProjectId: partialContext?.currentProjectId || null,
      currentProjectName: partialContext?.currentProjectName || null,
      selectedTaskId: partialContext?.selectedTaskId || null,
      selectedTaskDescription: partialContext?.selectedTaskDescription || null,
      selectedTaskIds: partialContext?.selectedTaskIds || [],
      taskSummary: '',
      recentChanges: '',
    };

    // 如果有项目 ID，补充项目名称和任务摘要
    if (context.currentProjectId && !context.currentProjectName) {
      try {
        const project = await projectService.findById(context.currentProjectId);
        if (project) {
          context.currentProjectName = project.name as string;
        }
      } catch { /* 忽略错误 */ }
    }

    // 构建任务摘要
    if (context.currentProjectId) {
      try {
        const tasks = await taskService.findAll({ projectId: context.currentProjectId });
        const total = tasks.length;
        const done = tasks.filter(t => t.status === 'done').length;
        const inProgress = tasks.filter(t => t.status === 'in-progress').length;
        const blocked = tasks.filter(t => t.status === 'blocked').length;
        const now = new Date();
        const overdue = tasks.filter(t => {
          if (t.status === 'done') return false;
          if (!t.estimatedEndDate) return false;
          return new Date(t.estimatedEndDate as string) < now;
        }).length;

        context.taskSummary = `共 ${total} 个任务：已完成 ${done}，进行中 ${inProgress}，阻塞 ${blocked}，逾期 ${overdue}`;
      } catch { /* 忽略错误 */ }
    }

    // 如果有选中的任务，补充描述
    if (context.selectedTaskId && !context.selectedTaskDescription) {
      try {
        const task = await taskService.findById(context.selectedTaskId);
        if (task) {
          context.selectedTaskDescription = task.description as string;
        }
      } catch { /* 忽略错误 */ }
    }

    return context;
  }

  /**
   * 将上下文格式化为系统提示词可用的字符串
   */
  formatForPrompt(context: PageContext): string {
    const lines: string[] = [];

    if (context.currentProjectName) {
      lines.push(`当前项目：${context.currentProjectName} (ID: ${context.currentProjectId})`);
    }

    const viewNames: Record<string, string> = {
      list: '任务列表',
      gantt: '甘特图',
      kanban: '看板',
      calendar: '日历',
      schedule: '日程管理',
      projects: '项目管理',
    };
    const viewName = viewNames[context.currentView] || context.currentView;
    if (context.currentView !== 'unknown') {
      lines.push(`当前视图：${viewName}`);
    }

    if (context.taskSummary) {
      lines.push(`任务概况：${context.taskSummary}`);
    }

    if (context.selectedTaskId) {
      lines.push(
        `选中的任务：${context.selectedTaskDescription || '(无描述)'} (ID: ${context.selectedTaskId})`
      );
    }

    if (context.selectedTaskIds.length > 1) {
      lines.push(`批量选中：${context.selectedTaskIds.length} 个任务`);
    }

    return lines.join('\n');
  }
}

export const contextCollector = new ContextCollectorInstance();
