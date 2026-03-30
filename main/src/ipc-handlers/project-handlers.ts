import { ipcMain } from 'electron';
import { projectService } from '../services/projectService';
import { saveDatabase } from '../services/database';

export async function setupProjectHandlers() {
  // 初始化 ProjectService
  await projectService.init();

  // 获取所有项目
  ipcMain.handle('projects:getAll', async () => {
    try {
      const projects = await projectService.findAll();
      return { success: true, data: projects };
    } catch (error: any) {
      console.error('Error getting projects:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取单个项目
  ipcMain.handle('projects:getById', async (_, id) => {
    try {
      const project = await projectService.findById(id);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }
      return { success: true, data: project };
    } catch (error: any) {
      console.error('Error getting project:', error);
      return { success: false, error: error.message };
    }
  });

  // 创建项目
  ipcMain.handle('projects:create', async (_, projectData) => {
    try {
      const project = await projectService.createProject(projectData);
      saveDatabase();
      return { success: true, data: project };
    } catch (error: any) {
      console.error('Error creating project:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新项目
  ipcMain.handle('projects:update', async (_, id, updates) => {
    try {
      const success = await projectService.updateProject(id, updates);
      if (!success) {
        return { success: false, error: 'Project not found or no changes made' };
      }
      saveDatabase();
      return { success: true, message: 'Project updated successfully' };
    } catch (error: any) {
      console.error('Error updating project:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除项目
  ipcMain.handle('projects:delete', async (_, id) => {
    try {
      const success = await projectService.deleteProject(id);
      if (!success) {
        return { success: false, error: 'Project not found' };
      }
      saveDatabase();
      return { success: true, message: 'Project deleted successfully' };
    } catch (error: any) {
      console.error('Error deleting project:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取项目统计信息
  ipcMain.handle('projects:getStats', async (_, projectId) => {
    try {
      const stats = await projectService.getProjectStats(projectId);
      return { success: true, data: stats };
    } catch (error: any) {
      console.error('Error getting project stats:', error);
      return { success: false, error: error.message };
    }
  });
}
