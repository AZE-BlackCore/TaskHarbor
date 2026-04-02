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

    updateTask: async (id, updates) => {
      if (!window.electronAPI) {
        useErrorStore.getState().addError('Electron API not available', 'error');
        return;
      }
      
      // 乐观更新：先更新本地 UI
      set((state) => {
        const task = state.tasks.find(t => t.id === id);
        if (task) {
          Object.assign(task, updates, { 
            updatedAt: new Date().toISOString() 
          });
        }
      });
      
      try {
        const result = await window.electronAPI.updateTask(id, updates);
        
        if (!result.success) {
          // 失败则重新加载数据
          await get().fetchTasks();
          useErrorStore.getState().addError(result.error || '更新失败', 'error');
        }
      } catch (error: unknown) {
        // 失败则重新加载数据
        await get().fetchTasks();
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
      }
    },

    deleteTask: async (id) => {
      if (!window.electronAPI) {
        useErrorStore.getState().addError('Electron API not available', 'error');
        return;
      }
      
      // 临时 ID 直接从本地删除
      if (id.startsWith('temp_')) {
        set((state) => {
          const index = state.tasks.findIndex(t => t.id === id);
          if (index !== -1) {
            state.tasks.splice(index, 1);
          }
        });
        return;
      }
      
      try {
        const result = await window.electronAPI.deleteTask(id);
        
        if (result.success) {
          // 从本地 store 删除
          set((state) => {
            const index = state.tasks.findIndex(t => t.id === id);
            if (index !== -1) {
              state.tasks.splice(index, 1);
            }
          });
          useErrorStore.getState().addError('任务已删除', 'success');
        } else {
          useErrorStore.getState().addError(result.error || '删除失败', 'error');
        }
      } catch (error: unknown) {
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
      }
    },

    setFilters: (filters) => set({ filters }),

    fetchTasks: async (filters) => {
      try {
        set({ loading: true, error: null });

        if (!window.electronAPI) {
          throw new Error('Electron API not available');
        }

        const result = await window.electronAPI.getTasks(filters as unknown as Record<string, unknown> || {});

        if (result.success) {
          set({ tasks: result.data as unknown as Task[], filters: filters || {}, loading: false });
        } else {
          set({ error: result.error ?? null, loading: false });
          useErrorStore.getState().addError(result.error ?? '未知错误', 'error');
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : '未知错误';
        set({ error: msg, loading: false });
        useErrorStore.getState().addError(msg, 'error');
      }
    },

    createTask: async (taskData) => {
      if (!window.electronAPI) {
        useErrorStore.getState().addError('Electron API not available', 'error');
        return null;
      }
      // 乐观更新：先创建临时任务
      const optimisticId = `temp_${Date.now()}`;
      const optimisticTask: Task = {
        ...taskData,
        id: optimisticId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Task;

      // 回滚辅助函数：直接从本地 store 删除，不走 IPC
      const rollback = () => {
        set((state) => {
          const index = state.tasks.findIndex(t => t.id === optimisticId);
          if (index !== -1) {
            state.tasks.splice(index, 1);
          }
        });
      };

      // 立即更新 UI（乐观更新）
      get().addTask(optimisticTask);

      try {
        const result = await window.electronAPI.createTask(taskData);

        if (result.success) {
          // 替换临时 ID 为真实数据
          set((state) => {
            const task = state.tasks.find(t => t.id === optimisticId);
            if (task) {
              Object.assign(task, {
                ...result.data,
                createdAt: result.data.createdAt || new Date().toISOString(),
                updatedAt: result.data.updatedAt || new Date().toISOString(),
              });
            }
          });

          useErrorStore.getState().addError('任务创建成功', 'success');
          return result.data as unknown as Task;
        } else {
          // 失败回滚
          rollback();
          useErrorStore.getState().addError(result.error || '创建失败', 'error');
          return null;
        }
      } catch (error: unknown) {
        // 异常回滚
        rollback();
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
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
      } catch (error: unknown) {
        console.error('Error updating task status:', error);
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
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
      } catch (error: unknown) {
        console.error('Error updating task progress:', error);
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
      }
    },
  }))
);
