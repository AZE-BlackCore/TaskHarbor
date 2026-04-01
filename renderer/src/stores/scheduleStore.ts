import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Schedule, ScheduleFilters } from '../types';
import { useErrorStore } from './errorStore';

interface ScheduleState {
  schedules: Schedule[];
  loading: boolean;
  error: string | null;
  filters: ScheduleFilters;
  
  // Actions
  setSchedules: (schedules: Schedule[]) => void;
  addSchedule: (schedule: Schedule) => void;
  updateSchedule: (id: string, updates: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  setFilters: (filters: ScheduleFilters) => void;
  fetchSchedules: (filters?: ScheduleFilters) => Promise<void>;
  createSchedule: (scheduleData: any) => Promise<Schedule | null>;
  updateScheduleRemote: (id: string, updates: Partial<Schedule>) => Promise<void>;
  deleteScheduleRemote: (id: string) => Promise<void>;
  getSchedulesByDate: (date: string) => Promise<Schedule[]>;
}

export const useScheduleStore = create<ScheduleState>()(
  immer((set, get) => ({
    schedules: [],
    loading: false,
    error: null,
    filters: {},

    setSchedules: (schedules) => set({ schedules }),

    addSchedule: (schedule) => set((state) => {
      state.schedules.push(schedule);
    }),

    updateSchedule: async (id, updates) => {
      if (!window.electronAPI) {
        useErrorStore.getState().addError('Electron API not available', 'error');
        return;
      }
      
      // 乐观更新：先更新本地 UI
      set((state) => {
        const schedule = state.schedules.find(s => s.id === id);
        if (schedule) {
          Object.assign(schedule, updates, { 
            updatedAt: new Date().toISOString() 
          });
        }
      });
      
      try {
        const result = await window.electronAPI.updateSchedule(id, updates);
        
        if (!result.success) {
          // 失败则重新加载数据
          await get().fetchSchedules();
          useErrorStore.getState().addError(result.error || '更新失败', 'error');
        }
      } catch (error: unknown) {
        // 失败则重新加载数据
        await get().fetchSchedules();
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
      }
    },

    deleteSchedule: async (id) => {
      if (!window.electronAPI) {
        useErrorStore.getState().addError('Electron API not available', 'error');
        return;
      }
      
      // 临时 ID 直接从本地删除
      if (id.startsWith('temp_')) {
        set((state) => {
          const index = state.schedules.findIndex(s => s.id === id);
          if (index !== -1) {
            state.schedules.splice(index, 1);
          }
        });
        return;
      }
      
      // 先本地删除，再同步到数据库
      set((state) => {
        const index = state.schedules.findIndex(s => s.id === id);
        if (index !== -1) {
          state.schedules.splice(index, 1);
        }
      });
      
      try {
        const result = await window.electronAPI.deleteSchedule(id);
        
        if (!result.success) {
          await get().fetchSchedules();
          useErrorStore.getState().addError(result.error || '删除失败', 'error');
        }
      } catch (error: unknown) {
        await get().fetchSchedules();
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
      }
    },

    setFilters: (filters) => set({ filters }),

    fetchSchedules: async (filters?: ScheduleFilters) => {
      if (!window.electronAPI) {
        useErrorStore.getState().addError('Electron API not available', 'error');
        return;
      }
      
      set({ loading: true, error: null });
      
      try {
        const result = await window.electronAPI.getSchedules(filters);
        
        if (result.success) {
          set({ 
            schedules: result.data, 
            loading: false 
          });
        } else {
          set({ 
            error: result.error || '获取日程失败', 
            loading: false 
          });
          useErrorStore.getState().addError(result.error || '获取日程失败', 'error');
        }
      } catch (error: unknown) {
        set({ 
          error: error instanceof Error ? error.message : '未知错误', 
          loading: false 
        });
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
      }
    },

    createSchedule: async (scheduleData) => {
      if (!window.electronAPI) {
        useErrorStore.getState().addError('Electron API not available', 'error');
        return null;
      }
      
      // 创建临时 ID
      const tempId = `temp_${Date.now()}`;
      const tempSchedule: Schedule = {
        ...scheduleData,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // 乐观添加：先添加到 UI
      get().addSchedule(tempSchedule);
      
      try {
        const result = await window.electronAPI.createSchedule(scheduleData);
        
        if (result.success) {
          // 替换临时 ID 为真实 ID
          set((state) => {
            const index = state.schedules.findIndex(s => s.id === tempId);
            if (index !== -1) {
              state.schedules[index] = result.data;
            }
          });
          return result.data;
        } else {
          // 失败则删除临时数据
          set((state) => {
            const index = state.schedules.findIndex(s => s.id === tempId);
            if (index !== -1) {
              state.schedules.splice(index, 1);
            }
          });
          useErrorStore.getState().addError(result.error || '创建失败', 'error');
          return null;
        }
      } catch (error: unknown) {
        // 失败则删除临时数据
        set((state) => {
          const index = state.schedules.findIndex(s => s.id === tempId);
          if (index !== -1) {
            state.schedules.splice(index, 1);
          }
        });
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
        return null;
      }
    },

    updateScheduleRemote: async (id, updates) => {
      if (!window.electronAPI) {
        useErrorStore.getState().addError('Electron API not available', 'error');
        return;
      }
      
      try {
        const result = await window.electronAPI.updateSchedule(id, updates);
        
        if (!result.success) {
          useErrorStore.getState().addError(result.error || '更新失败', 'error');
        }
      } catch (error: unknown) {
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
      }
    },

    deleteScheduleRemote: async (id) => {
      if (!window.electronAPI) {
        useErrorStore.getState().addError('Electron API not available', 'error');
        return;
      }
      
      try {
        const result = await window.electronAPI.deleteSchedule(id);
        
        if (!result.success) {
          useErrorStore.getState().addError(result.error || '删除失败', 'error');
        }
      } catch (error: unknown) {
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
      }
    },

    getSchedulesByDate: async (date: string) => {
      if (!window.electronAPI) {
        useErrorStore.getState().addError('Electron API not available', 'error');
        return [];
      }
      
      try {
        const result = await window.electronAPI.getSchedulesByDate(date);
        
        if (result.success) {
          return result.data;
        } else {
          useErrorStore.getState().addError(result.error || '获取日程失败', 'error');
          return [];
        }
      } catch (error: unknown) {
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
        return [];
      }
    },
  }))
);
