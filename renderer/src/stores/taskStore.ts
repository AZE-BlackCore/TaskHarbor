import { create } from 'zustand';
import type { Task, TaskFilters, TaskStatus } from '../types';

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

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  filters: {},

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(task => 
      task.id === id ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task
    ),
  })),

  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter(task => task.id !== id),
  })),

  setFilters: (filters) => set({ filters }),

  fetchTasks: async (filters) => {
    try {
      set({ loading: true, error: null });
      const result = await window.electronAPI.getTasks(filters);
      
      if (result.success) {
        set({ tasks: result.data, filters: filters || {}, loading: false });
      } else {
        set({ error: result.error, loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createTask: async (taskData) => {
    try {
      const result = await window.electronAPI.createTask(taskData);
      
      if (result.success) {
        const newTask: Task = {
          ...result.data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Task;
        
        set((state) => ({ tasks: [...state.tasks, newTask] }));
        return newTask;
      } else {
        set({ error: result.error });
        return null;
      }
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },

  updateTaskStatus: async (id, status) => {
    try {
      const result = await window.electronAPI.updateTask(id, { status });
      
      if (result.success) {
        get().updateTask(id, { status, updatedAt: new Date().toISOString() });
      }
    } catch (error: any) {
      console.error('Error updating task status:', error);
    }
  },

  updateTaskProgress: async (id, progress) => {
    try {
      const result = await window.electronAPI.updateTask(id, { progress });
      
      if (result.success) {
        get().updateTask(id, { progress, updatedAt: new Date().toISOString() });
      }
    } catch (error: any) {
      console.error('Error updating task progress:', error);
    }
  },
}));
