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

    deleteProject: (id) => set((state) => {
      const index = state.projects.findIndex(p => p.id === id);
      if (index !== -1) {
        state.projects.splice(index, 1);
      }
      if (state.currentProjectId === id) {
        state.currentProjectId = null;
      }
    }),

    fetchProjects: async () => {
      try {
        set({ loading: true, error: null });
        const result = await window.electronAPI.getProjects();
        
        if (result.success) {
          set({ projects: result.data, loading: false });
        } else {
          set({ error: result.error, loading: false });
          useErrorStore.getState().addError(result.error, 'error');
        }
      } catch (error: any) {
        set({ error: error.message, loading: false });
        useErrorStore.getState().addError(error.message, 'error');
      }
    },

    createProject: async (projectData) => {
      // 乐观更新
      const optimisticId = `temp_${Date.now()}`;
      const optimisticProject: Project = {
        ...projectData,
        id: optimisticId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Project;

      get().addProject(optimisticProject);

      try {
        const result = await window.electronAPI.createProject(projectData);
        
        if (result.success) {
          get().updateProject(optimisticId, { 
            id: result.data.id,
            ...result.data,
            createdAt: result.data.createdAt || new Date().toISOString(),
            updatedAt: result.data.updatedAt || new Date().toISOString(),
          });
          
          useErrorStore.getState().addError('项目创建成功', 'success');
          return result.data;
        } else {
          get().deleteProject(optimisticId);
          useErrorStore.getState().addError(result.error || '创建失败', 'error');
          return null;
        }
      } catch (error: any) {
        get().deleteProject(optimisticId);
        useErrorStore.getState().addError(error.message, 'error');
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
      } catch (error: any) {
        console.error('Error getting project stats:', error);
        return null;
      }
    },
  }))
);
