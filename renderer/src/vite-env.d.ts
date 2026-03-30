/// <reference types="vite/client" />

interface ElectronAPI {
  // 窗口控制
  setWindowOpacity: (opacity: number) => Promise<{ success: boolean }>;
  toggleClickThrough: () => Promise<{ success: boolean; clickThrough: boolean }>;
  minimizeToTray: () => Promise<{ success: boolean }>;
  createFloatingWindow: (options?: { opacity?: number; clickThrough?: boolean; x?: number; y?: number }) => Promise<{ success: boolean; windowId: number }>;
  closeFloatingWindow: (windowId: number) => Promise<{ success: boolean }>;
  toggleAlwaysOnTop: () => Promise<{ success: boolean }>;
  
  // 任务 CRUD
  getTasks: (filters?: any) => Promise<{ success: boolean; data: any[]; error?: string }>;
  getTaskById: (id: string) => Promise<{ success: boolean; data: any; error?: string }>;
  createTask: (taskData: any) => Promise<{ success: boolean; data: any; error?: string }>;
  updateTask: (id: string, updates: any) => Promise<{ success: boolean; error?: string }>;
  deleteTask: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteTasksBatch: (ids: string[]) => Promise<{ success: boolean; error?: string }>;
  
  // 子任务
  getSubtasks: (taskId: string) => Promise<{ success: boolean; data: any[]; error?: string }>;
  createSubtask: (subtaskData: any) => Promise<{ success: boolean; data: any; error?: string }>;
  updateSubtask: (id: string, updates: any) => Promise<{ success: boolean; error?: string }>;
  deleteSubtask: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // 时间追踪
  getTimelogs: (taskId: string) => Promise<{ success: boolean; data: any[]; error?: string }>;
  startTimelog: (taskId: string, description?: string) => Promise<{ success: boolean; data: any; error?: string }>;
  stopTimelog: (id: string) => Promise<{ success: boolean; data: any; error?: string }>;
  
  // 依赖关系
  getDependencies: (taskId: string) => Promise<{ success: boolean; data: any[]; error?: string }>;
  createDependency: (taskId: string, dependencyTaskId: string, type?: string) => Promise<{ success: boolean; error?: string }>;
  deleteDependency: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // 标签
  getTags: (taskId: string) => Promise<{ success: boolean; data: any[]; error?: string }>;
  addTag: (taskId: string, tagName: string, tagColor?: string) => Promise<{ success: boolean; error?: string }>;
  deleteTag: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // 项目
  getProjects: () => Promise<{ success: boolean; data: any[]; error?: string }>;
  getProjectById: (id: string) => Promise<{ success: boolean; data: any; error?: string }>;
  createProject: (projectData: any) => Promise<{ success: boolean; data: any; error?: string }>;
  updateProject: (id: string, updates: any) => Promise<{ success: boolean; error?: string }>;
  deleteProject: (id: string) => Promise<{ success: boolean; error?: string }>;
  getProjectStats: (projectId: string) => Promise<{ success: boolean; data: any; error?: string }>;
}

interface Window {
  electronAPI: ElectronAPI;
}
