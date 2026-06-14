import * as fs from 'fs';
import * as path from 'path';
import { taskService } from './taskService';
import { projectService } from './projectService';
import * as scheduleService from './scheduleService';

export interface ExportOptions {
  includeTasks?: boolean;
  includeProjects?: boolean;
  includeSchedules?: boolean;
  outputPath?: string;
  filename?: string;
}

const statusMap: Record<string, string> = {
  'todo': '待办',
  'in-progress': '进行中',
  'review': '审查中',
  'done': '已完成',
  'blocked': '已阻塞',
};

const priorityMap: Record<string, string> = {
  'low': '低',
  'medium': '中',
  'high': '高',
};

export async function exportToMarkdown(options?: ExportOptions): Promise<{ success: boolean; message: string; filePath?: string }> {
  try {
    const {
      includeTasks = true,
      includeProjects = true,
      includeSchedules = true,
      outputPath = process.cwd(),
      filename = `taskharbor-backup-${Date.now()}.md`
    } = options || {};

    let content = `# TaskHarbor 数据备份\n\n`;
    content += `导出时间：${new Date().toLocaleString('zh-CN')}\n\n`;
    content += `---\n\n`;

    if (includeProjects) {
      const projects = await projectService.findAll();
      content += `## 📁 项目列表 (${projects.length} 个)\n\n`;

      if (projects.length === 0) {
        content += `暂无项目\n\n`;
      } else {
        for (const project of projects) {
          const stats = await projectService.getProjectStats(project.id);
          content += `### ${project.name}\n\n`;
          content += `- **类型**: ${project.type === 'personal' ? '个人项目' : '公司项目'}\n`;
          content += `- **颜色**: ${project.color || '#3B82F6'}\n`;
          content += `- **描述**: ${project.description || '无'}\n`;
          content += `- **任务总数**: ${stats.totalTasks}\n`;
          content += `- **平均进度**: ${stats.averageProgress}%\n`;
          
          if (stats.byStatus.length > 0) {
            content += `- **状态分布**: `;
            content += stats.byStatus.map(s => `${statusMap[s.status] || s.status}(${s.count})`).join(', ');
            content += '\n';
          }
          
          content += `- **创建时间**: ${formatDate(project.createdAt)}\n`;
          content += `- **更新时间**: ${formatDate(project.updatedAt)}\n\n`;
        }
      }
    }

    if (includeTasks) {
      const tasks = await taskService.findAll();
      content += `## ✅ 任务列表 (${tasks.length} 个)\n\n`;

      if (tasks.length === 0) {
        content += `暂无任务\n\n`;
      } else {
        const projects = await projectService.findAll();
        
        for (const task of tasks) {
          const project = projects.find(p => p.id === task.projectId);
          content += `### ${task.description}\n\n`;
          content += `- **ID**: ${task.id}\n`;
          content += `- **所属项目**: ${project?.name || '无'}\n`;
          content += `- **模块**: ${task.module || '无'}\n`;
          content += `- **功能模块**: ${task.functionModule || '无'}\n`;
          content += `- **状态**: ${statusMap[task.status] || task.status}\n`;
          content += `- **进度**: ${task.progress}%\n`;
          content += `- **优先级**: ${priorityMap[task.priority] || task.priority}\n`;
          content += `- **责任人**: ${task.assignee || '无'}\n`;
          content += `- **开始时间**: ${task.startDate ? formatDate(task.startDate) : '未设置'}\n`;
          content += `- **预计完成**: ${task.estimatedEndDate ? formatDate(task.estimatedEndDate) : '未设置'}\n`;
          if (task.actualEndDate) {
            content += `- **实际完成**: ${formatDate(task.actualEndDate)}\n`;
          }
          if (task.issues) {
            content += `- **存在问题**: ${task.issues}\n`;
          }
          if (task.notes) {
            content += `- **备注**: ${task.notes}\n`;
          }
          content += `- **创建时间**: ${formatDate(task.createdAt)}\n`;
          content += `- **更新时间**: ${formatDate(task.updatedAt)}\n\n`;
        }
      }
    }

    if (includeSchedules) {
      const schedules = await scheduleService.getSchedules();
      content += `## 📅 日程列表 (${schedules.length} 个)\n\n`;

      if (schedules.length === 0) {
        content += `暂无日程\n\n`;
      } else {
        for (const schedule of schedules) {
          content += `### ${schedule.title}\n\n`;
          content += `- **ID**: ${schedule.id}\n`;
          content += `- **描述**: ${schedule.description || '无'}\n`;
          content += `- **地点**: ${schedule.location || '无'}\n`;
          content += `- **开始时间**: ${formatDateTime(schedule.startTime)}\n`;
          content += `- **结束时间**: ${formatDateTime(schedule.endTime)}\n`;
          content += `- **全天事件**: ${schedule.allDay ? '是' : '否'}\n`;
          content += `- **颜色**: ${schedule.color}\n`;
          content += `- **优先级**: ${priorityMap[schedule.priority] || schedule.priority}\n`;
          if (schedule.reminder !== undefined) {
            content += `- **提前提醒**: ${schedule.reminder} 分钟\n`;
          }
          if (schedule.repeat) {
            content += `- **重复规则**: ${getRepeatText(schedule.repeat)}\n`;
          }
          if (schedule.relatedTaskId) {
            content += `- **关联任务**: ${schedule.relatedTaskId}\n`;
          }
          content += `- **创建时间**: ${formatDate(schedule.createdAt)}\n`;
          content += `- **更新时间**: ${formatDate(schedule.updatedAt)}\n\n`;
        }
      }
    }

    content += `---\n\n`;
    content += `*此文件由 TaskHarbor 自动生成*\n`;
    content += `*版本: ${process.env.npm_package_version || '1.0.0'}*\n`;

    const filePath = path.join(outputPath, filename);
    
    fs.writeFileSync(filePath, content, 'utf8');
    
    return {
      success: true,
      message: `数据已成功导出到 ${filePath}`,
      filePath
    };
  } catch (error: unknown) {
    console.error('导出 Markdown 失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '未知错误'
    };
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return dateString;
  }
}

function getRepeatText(repeat: { type: string; interval?: number; endDate?: string }): string {
  const typeMap: Record<string, string> = {
    'daily': '每天',
    'weekly': '每周',
    'monthly': '每月',
    'yearly': '每年'
  };
  
  let text = typeMap[repeat.type] || repeat.type;
  
  if (repeat.interval && repeat.interval > 1) {
    text = `每 ${repeat.interval} ${text.replace('每', '')}`;
  }
  
  if (repeat.endDate) {
    text += `，至 ${formatDate(repeat.endDate)}`;
  }
  
  return text;
}