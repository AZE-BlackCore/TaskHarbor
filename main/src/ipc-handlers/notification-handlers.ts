import { ipcMain } from 'electron';
import { notificationService } from '../services/notification';

export function setupNotificationHandlers() {
  // 发送普通通知
  ipcMain.handle('notification:send', async (_, title: string, body: string) => {
    try {
      await notificationService.send({ title, body });
      return { success: true };
    } catch (error: any) {
      console.error('发送通知失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 发送任务提醒
  ipcMain.handle('notification:taskReminder', async (_, taskName: string, dueDate: string) => {
    try {
      await notificationService.sendTaskReminder(taskName, dueDate);
      return { success: true };
    } catch (error: any) {
      console.error('发送任务提醒失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 发送任务逾期通知
  ipcMain.handle('notification:taskOverdue', async (_, taskName: string) => {
    try {
      await notificationService.sendTaskOverdue(taskName);
      return { success: true };
    } catch (error: any) {
      console.error('发送逾期通知失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 发送任务完成通知
  ipcMain.handle('notification:taskCompleted', async (_, taskName: string) => {
    try {
      await notificationService.sendTaskCompleted(taskName);
      return { success: true };
    } catch (error: any) {
      console.error('发送完成通知失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 发送项目创建通知
  ipcMain.handle('notification:projectCreated', async (_, projectName: string) => {
    try {
      await notificationService.sendProjectCreated(projectName);
      return { success: true };
    } catch (error: any) {
      console.error('发送项目创建通知失败:', error);
      return { success: false, error: error.message };
    }
  });
}
