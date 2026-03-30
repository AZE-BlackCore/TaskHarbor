import { create } from 'zustand';
import type { Project, ProjectStats } from '../types';

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

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  loading: false,
  error: null,

  setProjects: (projects) => set({ projects }),

  setCurrentProject: (projectId) => set({ currentProjectId: projectId }),

  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),

  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map(project => 
      project.id === id ? { ...project, ...updates, updatedAt: new Date().toISOString() } : project
    ),
  })),

  deleteProject: (id) => set((state) => ({
    projects: state.projects.filter(project => project.id !== id),
    currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
  })),

  fetchProjects: async () => {
    try {
      set({ loading: true, error: null });
      const result = await window.electronAPI.getProjects();
      
      if (result.success) {
        set({ projects: result.data, loading: false });
      } else {
        set({ error: result.error, loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createProject: async (projectData) => {
    try {
      const result = await window.electronAPI.createProject(projectData);
      
      if (result.success) {
        const newProject: Project = {
          ...result.data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Project;
        
        set((state) => ({ projects: [...state.projects, newProject] }));
        return newProject;
      } else {
        set({ error: result.error });
        return null;
      }
    } catch (error: any) {
      set({ error: error.message });
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
}));
