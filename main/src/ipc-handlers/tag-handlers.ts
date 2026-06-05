import { ipcMain } from 'electron';
import { tagService } from '../services/tagService';
import { saveDatabase } from '../services/database';

export async function setupTagHandlers() {
  await tagService.init();

  // 获取所有标签
  ipcMain.handle('tags:getAll', async () => {
    try {
      const tags = await tagService.findAll();
      return { success: true, data: tags };
    } catch (error: any) {
      console.error('Error getting tags:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取单个标签
  ipcMain.handle('tags:getById', async (_, id) => {
    try {
      const tag = await tagService.findById(id);
      if (!tag) {
        return { success: false, error: 'Tag not found' };
      }
      return { success: true, data: tag };
    } catch (error: any) {
      console.error('Error getting tag:', error);
      return { success: false, error: error.message };
    }
  });

  // 创建标签
  ipcMain.handle('tags:create', async (_, tagData) => {
    try {
      const tag = await tagService.createTag(tagData);
      saveDatabase();
      return { success: true, data: tag };
    } catch (error: any) {
      console.error('Error creating tag:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新标签
  ipcMain.handle('tags:update', async (_, id, updates) => {
    try {
      const success = await tagService.updateTag(id, updates);
      if (!success) {
        return { success: false, error: 'Tag not found or no changes made' };
      }
      saveDatabase();
      return { success: true, message: 'Tag updated successfully' };
    } catch (error: any) {
      console.error('Error updating tag:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除标签
  ipcMain.handle('tags:delete', async (_, id) => {
    try {
      const success = await tagService.deleteTag(id);
      if (!success) {
        return { success: false, error: 'Tag not found' };
      }
      saveDatabase();
      return { success: true, message: 'Tag deleted successfully' };
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取标签统计信息
  ipcMain.handle('tags:getStats', async (_, tagId) => {
    try {
      const stats = await tagService.getTagStats(tagId);
      return { success: true, data: stats };
    } catch (error: any) {
      console.error('Error getting tag stats:', error);
      return { success: false, error: error.message };
    }
  });

  // 为任务添加标签
  ipcMain.handle('tags:addToTask', async (_, taskId, tagId) => {
    try {
      await tagService.addTagToTask(taskId, tagId);
      saveDatabase();
      return { success: true, message: 'Tag added to task' };
    } catch (error: any) {
      console.error('Error adding tag to task:', error);
      return { success: false, error: error.message };
    }
  });

  // 从任务移除标签
  ipcMain.handle('tags:removeFromTask', async (_, taskId, tagId) => {
    try {
      await tagService.removeTagFromTask(taskId, tagId);
      saveDatabase();
      return { success: true, message: 'Tag removed from task' };
    } catch (error: any) {
      console.error('Error removing tag from task:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取任务的所有标签
  ipcMain.handle('tags:getForTask', async (_, taskId) => {
    try {
      const tags = await tagService.getTagsForTask(taskId);
      return { success: true, data: tags };
    } catch (error: any) {
      console.error('Error getting tags for task:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取标签的所有任务
  ipcMain.handle('tags:getTasks', async (_, tagId) => {
    try {
      const tasks = await tagService.getTasksForTag(tagId);
      return { success: true, data: tasks };
    } catch (error: any) {
      console.error('Error getting tasks for tag:', error);
      return { success: false, error: error.message };
    }
  });
}
