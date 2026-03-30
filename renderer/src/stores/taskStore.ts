import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Task, TaskFilters, TaskStatus } from '../types';
import { useErrorStore } from './errorStore';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  filters: TaskFilters;
  
  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setFilters: (filters: TaskFilters) => void;
  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  createTask: (taskData: Partial<Task>) => Promise<Task | null>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  updateTaskProgress: (id: string, progress: number) => Promise<void>;
}

export const useTaskStore = create<TaskState>()(
  immer((set, get) => ({
    tasks: [],
    loading: false,
    error: null,
    filters: {},

    setTasks: (tasks) => set({ tasks }),

    addTask: (task) => set((state) => {
      state.tasks.push(task);
    }),

    updateTask: (id, updates) => set((state) => {
      const task = state.tasks.find(t => t.id === id);
      if (task) {
        Object.assign(task, updates, { 
          updatedAt: new Date().toISOString() 
        });
      }
    }),

    deleteTask: (id) => set((state) => {
      const index = state.tasks.findIndex(t => t.id === id);
      if (index !== -1) {
        state.tasks.splice(index, 1);
      }
    }),

    setFilters: (filters) => set({ filters }),

    fetchTasks: async (filters) => {
      try {
        set({ loading: true, error: null });
        const result = await window.electronAPI.getTasks(filters);
        
        if (result.success) {
          set({ tasks: result.data, filters: filters || {}, loading: false });
        } else {
          set({ error: result.error, loading: false });
          useErrorStore.getState().addError(result.error, 'error');
        }
      } catch (error: any) {
        set({ error: error.message, loading: false });
        useErrorStore.getState().addError(error.message, 'error');
      }
    },

    createTask: async (taskData) => {
      // 乐观更新：先创建临时任务
      const optimisticId = `temp_${Date.now()}`;
      const optimisticTask: Task = {
        ...taskData,
        id: optimisticId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Task;

      // 立即更新 UI（乐观更新）
      get().addTask(optimisticTask);

      try {
        const result = await window.electronAPI.createTask(taskData);
        
        if (result.success) {
          // 替换临时 ID 为真实 ID
          get().updateTask(optimisticId, { 
            id: result.data.id,
            ...result.data,
            createdAt: result.data.createdAt || new Date().toISOString(),
            updatedAt: result.data.updatedAt || new Date().toISOString(),
          });
          
          useErrorStore.getState().addError('任务创建成功', 'success');
          return result.data;
        } else {
          // 失败回滚
          get().deleteTask(optimisticId);
          useErrorStore.getState().addError(result.error || '创建失败', 'error');
          return null;
        }
      } catch (error: any) {
        // 异常回滚
        get().deleteTask(optimisticId);
        useErrorStore.getState().addError(error.message, 'error');
        return null;
      }
    },

    updateTaskStatus: async (id, status) => {
      // 乐观更新
      get().updateTask(id, { status });

      try {
        const result = await window.electronAPI.updateTask(id, { status });
        
        if (!result.success) {
          // 失败回滚
          useErrorStore.getState().addError(result.error || '更新失败', 'error');
        }
      } catch (error: any) {
        console.error('Error updating task status:', error);
        useErrorStore.getState().addError(error.message, 'error');
      }
    },

    updateTaskProgress: async (id, progress) => {
      // 乐观更新
      get().updateTask(id, { progress });

      try {
        const result = await window.electronAPI.updateTask(id, { progress });
        
        if (!result.success) {
          useErrorStore.getState().addError(result.error || '更新进度失败', 'error');
        }
      } catch (error: any) {
        console.error('Error updating task progress:', error);
        useErrorStore.getState().addError(error.message, 'error');
      }
    },
  }))
);
