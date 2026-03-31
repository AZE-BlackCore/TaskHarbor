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
  getTasks: (filters?: Record<string, unknown>) => Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }>;
  getTaskById: (id: string) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  createTask: (taskData: Record<string, unknown>) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  updateTask: (id: string, updates: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  deleteTask: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteTasksBatch: (ids: string[]) => Promise<{ success: boolean; error?: string }>;
  
  // 子任务
  getSubtasks: (taskId: string) => Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }>;
  createSubtask: (subtaskData: Record<string, unknown>) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  updateSubtask: (id: string, updates: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  deleteSubtask: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // 时间追踪
  getTimelogs: (taskId: string) => Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }>;
  startTimelog: (taskId: string, description?: string) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  stopTimelog: (id: string) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  
  // 依赖关系
  getDependencies: (taskId: string) => Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }>;
  createDependency: (taskId: string, dependencyTaskId: string, type?: string) => Promise<{ success: boolean; error?: string }>;
  deleteDependency: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // 标签
  getTags: (taskId: string) => Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }>;
  addTag: (taskId: string, tagName: string, tagColor?: string) => Promise<{ success: boolean; error?: string }>;
  deleteTag: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // 项目
  getProjects: () => Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }>;
  getProjectById: (id: string) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  createProject: (projectData: Record<string, unknown>) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  updateProject: (id: string, updates: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  deleteProject: (id: string) => Promise<{ success: boolean; error?: string }>;
  getProjectStats: (projectId: string) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;

  // 通知
  sendNotification?: (title: string, body: string) => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
