import { Task, Project } from '../types';
import ExcelJS from 'exceljs';

export async function exportToExcel(tasks: Task[], projects: Project[], filename: string = '任务导出.xlsx') {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Todo List Desktop';
    workbook.created = new Date();

    // 创建任务工作表
    const taskSheet = workbook.addWorksheet('任务列表');
    
    // 设置列
    taskSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: '项目', key: 'projectName', width: 20 },
      { header: '模块', key: 'module', width: 15 },
      { header: '功能模块', key: 'functionModule', width: 15 },
      { header: '任务描述', key: 'description', width: 40 },
      { header: '状态', key: 'status', width: 10 },
      { header: '进度', key: 'progress', width: 10 },
      { header: '责任人', key: 'assignee', width: 15 },
      { header: '开始时间', key: 'startDate', width: 15 },
      { header: '预计完成时间', key: 'estimatedEndDate', width: 15 },
      { header: '实际完成时间', key: 'actualEndDate', width: 15 },
      { header: '存在的问题', key: 'issues', width: 30 },
      { header: '备注', key: 'notes', width: 30 },
    ];

    // 添加数据
    tasks.forEach(task => {
      const project = projects.find(p => p.id === task.projectId);
      const statusMap: Record<string, string> = {
        'todo': '待办',
        'in-progress': '进行中',
        'review': '审查中',
        'done': '已完成',
        'blocked': '已阻塞',
      };

      taskSheet.addRow({
        id: task.id,
        projectName: project?.name || '未知项目',
        module: task.module || '',
        functionModule: task.functionModule || '',
        description: task.description,
        status: statusMap[task.status] || task.status,
        progress: `${task.progress}%`,
        assignee: task.assignee || '',
        startDate: task.startDate ? new Date(task.startDate).toLocaleDateString('zh-CN') : '',
        estimatedEndDate: task.estimatedEndDate ? new Date(task.estimatedEndDate).toLocaleDateString('zh-CN') : '',
        actualEndDate: task.actualEndDate ? new Date(task.actualEndDate).toLocaleDateString('zh-CN') : '',
        issues: task.issues || '',
        notes: task.notes || '',
      });
    });

    // 设置表头样式
    const headerRow = taskSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' },
    };
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // 创建项目统计工作表
    const statsSheet = workbook.addWorksheet('项目统计');
    statsSheet.columns = [
      { header: '项目名称', key: 'name', width: 30 },
      { header: '类型', key: 'type', width: 10 },
      { header: '任务数', key: 'taskCount', width: 15 },
      { header: '平均进度', key: 'avgProgress', width: 15 },
      { header: '已完成', key: 'completed', width: 15 },
    ];

    projects.forEach(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const completed = projectTasks.filter(t => t.status === 'done').length;
      const avgProgress = projectTasks.length > 0
        ? Math.round(projectTasks.reduce((sum, t) => sum + t.progress, 0) / projectTasks.length)
        : 0;

      statsSheet.addRow({
        name: project.name,
        type: project.type === 'personal' ? '个人' : '公司',
        taskCount: projectTasks.length,
        avgProgress: `${avgProgress}%`,
        completed,
      });
    });

    // 设置统计表表头
    const statsHeader = statsSheet.getRow(1);
    statsHeader.font = { bold: true };
    statsHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' },
    };
    statsHeader.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // 导出文件
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);

    return { success: true, message: '导出成功' };
  } catch (error: unknown) {
    console.error('导出 Excel 失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

export function exportToCSV(tasks: Task[], projects: Project[], filename: string = '任务导出.csv') {
  try {
    const headers = ['ID', '项目', '模块', '功能模块', '任务描述', '状态', '进度', '责任人', '开始时间', '预计完成时间', '实际完成时间', '存在的问题', '备注'];
    
    const rows = tasks.map(task => {
      const project = projects.find(p => p.id === task.projectId);
      const statusMap: Record<string, string> = {
        'todo': '待办',
        'in-progress': '进行中',
        'review': '审查中',
        'done': '已完成',
        'blocked': '已阻塞',
      };

      return [
        task.id,
        project?.name || '未知项目',
        task.module || '',
        task.functionModule || '',
        task.description,
        statusMap[task.status] || task.status,
        `${task.progress}%`,
        task.assignee || '',
        task.startDate ? new Date(task.startDate).toLocaleDateString('zh-CN') : '',
        task.estimatedEndDate ? new Date(task.estimatedEndDate).toLocaleDateString('zh-CN') : '',
        task.actualEndDate ? new Date(task.actualEndDate).toLocaleDateString('zh-CN') : '',
        task.issues || '',
        task.notes || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);

    return { success: true, message: '导出成功' };
  } catch (error: unknown) {
    console.error('导出 CSV 失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

export function exportToMarkdown(tasks: Task[], projects: Project[], filename: string = '任务导出.md') {
  try {
    const statusMap: Record<string, string> = {
      'todo': '待办',
      'in-progress': '进行中',
      'review': '审查中',
      'done': '已完成',
      'blocked': '已阻塞',
    };

    let content = '# 任务导出报告\n\n';
    content += `导出时间：${new Date().toLocaleString('zh-CN')}\n\n`;
    content += `总任务数：**${tasks.length}**\n\n`;

    // 按项目分组
    const tasksByProject = new Map<string, Task[]>();
    tasks.forEach(task => {
      const projectTasks = tasksByProject.get(task.projectId) || [];
      projectTasks.push(task);
      tasksByProject.set(task.projectId, projectTasks);
    });

    tasksByProject.forEach((projectTasks, projectId) => {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      content += `## ${project.name} (${project.type === 'personal' ? '个人' : '公司'})\n\n`;

      projectTasks.forEach((task, index) => {
        content += `### ${index + 1}. ${task.description}\n\n`;
        content += `- **模块**: ${task.module || '无'}\n`;
        content += `- **功能模块**: ${task.functionModule || '无'}\n`;
        content += `- **状态**: ${statusMap[task.status] || task.status}\n`;
        content += `- **进度**: ${task.progress}%\n`;
        content += `- **责任人**: ${task.assignee || '无'}\n`;
        content += `- **开始时间**: ${task.startDate ? new Date(task.startDate).toLocaleDateString('zh-CN') : '未设置'}\n`;
        content += `- **预计完成**: ${task.estimatedEndDate ? new Date(task.estimatedEndDate).toLocaleDateString('zh-CN') : '未设置'}\n`;
        if (task.actualEndDate) {
          content += `- **实际完成**: ${new Date(task.actualEndDate).toLocaleDateString('zh-CN')}\n`;
        }
        if (task.issues) {
          content += `- **存在的问题**: ${task.issues}\n`;
        }
        if (task.notes) {
          content += `- **备注**: ${task.notes}\n`;
        }
        content += '\n';
      });
    });

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);

    return { success: true, message: '导出成功' };
  } catch (error: unknown) {
    console.error('导出 Markdown 失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}
