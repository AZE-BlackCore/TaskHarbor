import { ipcMain } from 'electron';
import * as reminderService from '../services/reminderService';
import type { CreateReminderInput } from '../services/reminderService';

export function setupReminderHandlers() {
  // 获取某任务的所有提醒
  ipcMain.handle('reminders:getByTask', async (_event, taskId: string) => {
    try {
      const reminders = await reminderService.getRemindersByTask(taskId);
      return { success: true, data: reminders };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 创建提醒
  ipcMain.handle('reminders:create', async (_event, input: CreateReminderInput) => {
    try {
      const reminder = await reminderService.createReminder(input);
      return { success: true, data: reminder };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 更新提醒
  ipcMain.handle('reminders:update', async (_event, id: string, updates: Partial<CreateReminderInput>) => {
    try {
      const reminder = await reminderService.updateReminder(id, updates);
      return { success: true, data: reminder };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 删除单条提醒
  ipcMain.handle('reminders:delete', async (_event, id: string) => {
    try {
      await reminderService.deleteReminder(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 删除某任务的所有提醒
  ipcMain.handle('reminders:deleteByTask', async (_event, taskId: string) => {
    try {
      await reminderService.deleteRemindersByTask(taskId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 计算下次触发时间（预览用）
  ipcMain.handle('reminders:calcNext', async (
    _event,
    reminderTime: string,
    cycle: string,
    intervalDays: number,
    intervalHours: number,
    customTimes: string
  ) => {
    try {
      const next = reminderService.calcNextFireAt(
        reminderTime, cycle, intervalDays, intervalHours, customTimes
      );
      return { success: true, data: next };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
