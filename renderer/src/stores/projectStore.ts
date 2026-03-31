import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Project, ProjectStats } from '../types';
import { useErrorStore } from './errorStore';

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (projectId: string | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  fetchProjects: () => Promise<void>;
  createProject: (projectData: { name: string; type: 'personal' | 'company'; description?: string; color?: string }) => Promise<Project | null>;
  getProjectStats: (projectId: string) => Promise<ProjectStats | null>;
}

export const useProjectStore = create<ProjectState>()(
  immer((set, get) => ({
    projects: [],
    currentProjectId: null,
    loading: false,
    error: null,

    setProjects: (projects) => set({ projects }),

    setCurrentProject: (projectId) => set({ currentProjectId: projectId }),

    addProject: (project) => set((state) => {
      state.projects.push(project);
    }),

    updateProject: (id, updates) => set((state) => {
      const project = state.projects.find(p => p.id === id);
      if (project) {
        Object.assign(project, updates, { 
          updatedAt: new Date().toISOString() 
        });
      }
    }),

    deleteProject: async (id) => {
      if (!window.electronAPI) {
        useErrorStore.getState().addError('Electron API not available', 'error');
        return;
      }
      
      // 先检查是否是临时乐观 ID，临时 ID 直接从本地删除即可
      if (id.startsWith('temp_')) {
        set((state) => {
          const index = state.projects.findIndex(p => p.id === id);
          if (index !== -1) {
            state.projects.splice(index, 1);
          }
        });
        return;
      }
      
      try {
        const result = await window.electronAPI.deleteProject(id);
        
        if (result.success) {
          // 从本地 store 删除
          set((state) => {
            const index = state.projects.findIndex(p => p.id === id);
            if (index !== -1) {
              state.projects.splice(index, 1);
            }
            if (state.currentProjectId === id) {
              state.currentProjectId = null;
            }
          });
          useErrorStore.getState().addError('项目已删除', 'success');
        } else {
          useErrorStore.getState().addError(result.error || '删除失败', 'error');
        }
      } catch (error: unknown) {
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
      }
    },

  fetchProjects: async () => {
    try {
      set({ loading: true, error: null });
      
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      
      const result = await window.electronAPI.getProjects();
      
      if (result.success) {
        set({ projects: result.data, loading: false });
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

  createProject: async (projectData) => {
    if (!window.electronAPI) {
      useErrorStore.getState().addError('Electron API not available', 'error');
      return null;
    }

    // 乐观更新
    const optimisticId = `temp_${Date.now()}`;
    const optimisticProject: Project = {
      ...projectData,
      id: optimisticId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Project;

    // 回滚辅助函数：直接从本地 store 删除，不走 IPC
    const rollback = () => {
      set((state) => {
        const index = state.projects.findIndex(p => p.id === optimisticId);
        if (index !== -1) {
          state.projects.splice(index, 1);
        }
      });
    };

    get().addProject(optimisticProject);

    try {
      const result = await window.electronAPI.createProject(projectData);
        
      if (result.success) {
        // 替换临时 ID 为真实数据
        set((state) => {
          const project = state.projects.find(p => p.id === optimisticId);
          if (project) {
            Object.assign(project, {
              ...result.data,
              createdAt: result.data.createdAt || new Date().toISOString(),
              updatedAt: result.data.updatedAt || new Date().toISOString(),
            });
          }
        });
        
        useErrorStore.getState().addError('项目创建成功', 'success');
        return result.data;
      } else {
        rollback();
        useErrorStore.getState().addError(result.error || '创建失败', 'error');
        return null;
      }
    } catch (error: unknown) {
      rollback();
      useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
      return null;
    }
  },

    getProjectStats: async (projectId) => {
      try {
        const result = await window.electronAPI.getProjectStats(projectId);
        
        if (result.success) {
          return result.data;
        } else {
          return null;
        }
      } catch (error: unknown) {
        console.error('Error getting project stats:', error);
        return null;
      }
    },
  }))
);
