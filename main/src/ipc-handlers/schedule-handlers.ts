import { ipcMain } from 'electron';
import * as scheduleService from '../services/scheduleService';
import type { ScheduleFilters } from '../services/scheduleService';

export function setupScheduleHandlers() {
  // 获取所有日程（带过滤）
  ipcMain.handle('schedules:getAll', async (_event, filters?: ScheduleFilters) => {
    try {
      const schedules = await scheduleService.getSchedules(filters);
      return { success: true, data: schedules };
    } catch (error) {
      console.error('Error getting schedules:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 获取日程详情
  ipcMain.handle('schedules:getById', async (_event, id: string) => {
    try {
      const schedule = await scheduleService.getScheduleById(id);
      return { success: true, data: schedule };
    } catch (error) {
      console.error('Error getting schedule by id:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 创建日程
  ipcMain.handle('schedules:create', async (_event, scheduleData: any) => {
    try {
      const schedule = await scheduleService.createSchedule(scheduleData);
      return { success: true, data: schedule };
    } catch (error) {
      console.error('Error creating schedule:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 更新日程
  ipcMain.handle('schedules:update', async (_event, id: string, updates: any) => {
    try {
      const schedule = await scheduleService.updateSchedule({ id, ...updates });
      return { success: true, data: schedule };
    } catch (error) {
      console.error('Error updating schedule:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 删除日程
  ipcMain.handle('schedules:delete', async (_event, id: string) => {
    try {
      await scheduleService.deleteSchedule(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting schedule:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 获取指定日期的日程
  ipcMain.handle('schedules:getByDate', async (_event, date: string) => {
    try {
      const schedules = await scheduleService.getSchedulesByDate(date);
      return { success: true, data: schedules };
    } catch (error) {
      console.error('Error getting schedules by date:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
