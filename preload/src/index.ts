import { contextBridge, ipcRenderer } from 'electron';

// 定义类型
export interface Task {
  id: string;
  projectId: string;
  moduleId?: string;
  module?: string;
  functionModule?: string;
  description: string;
  progress: number;
  status: string;
  assignee?: string;
  startDate?: string;
  estimatedEndDate?: string;
  actualEndDate?: string;
  issues?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  type: 'personal' | 'company';
  description?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  description: string;
  completed: boolean;
  orderIndex: number;
}

export interface TimeLog {
  id: string;
  taskId: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  description?: string;
}

export interface TaskFilters {
  projectId?: string;
  status?: string;
  assignee?: string;
}

// 暴露 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // ========== 窗口控制 ==========
  setWindowOpacity: (opacity: number) => 
    ipcRenderer.invoke('window:setOpacity', opacity),
  
  toggleClickThrough: () => 
    ipcRenderer.invoke('window:toggleClickThrough'),
  
  minimizeToTray: () => 
    ipcRenderer.invoke('window:minimizeToTray'),
  
  createFloatingWindow: (options?: { opacity?: number; clickThrough?: boolean; x?: number; y?: number }) => 
    ipcRenderer.invoke('window:createFloating', options),
  
  closeFloatingWindow: (windowId: number) => 
    ipcRenderer.invoke('window:closeFloating', windowId),
  
  toggleAlwaysOnTop: () => 
    ipcRenderer.invoke('window:toggleAlwaysOnTop'),
  
  // ========== 任务 CRUD ==========
  getTasks: (filters?: TaskFilters) => 
    ipcRenderer.invoke('tasks:getAll', filters),
  
  getTaskById: (id: string) => 
    ipcRenderer.invoke('tasks:getById', id),
  
  createTask: (taskData: Partial<Task>) => 
    ipcRenderer.invoke('tasks:create', taskData),
  
  updateTask: (id: string, updates: Partial<Task>) => 
    ipcRenderer.invoke('tasks:update', id, updates),
  
  deleteTask: (id: string) => 
    ipcRenderer.invoke('tasks:delete', id),
  
  deleteTasksBatch: (ids: string[]) => 
    ipcRenderer.invoke('tasks:deleteBatch', ids),
  
  // ========== 子任务管理 ==========
  getSubtasks: (taskId: string) => 
    ipcRenderer.invoke('subtasks:getByTaskId', taskId),
  
  createSubtask: (subtaskData: { taskId: string; description: string; completed?: boolean; orderIndex?: number }) => 
    ipcRenderer.invoke('subtasks:create', subtaskData),
  
  updateSubtask: (id: string, updates: { completed?: boolean; description?: string }) => 
    ipcRenderer.invoke('subtasks:update', id, updates),
  
  deleteSubtask: (id: string) => 
    ipcRenderer.invoke('subtasks:delete', id),
  
  // ========== 时间追踪 ==========
  getTimelogs: (taskId: string) => 
    ipcRenderer.invoke('timelogs:getByTaskId', taskId),
  
  startTimelog: (taskId: string, description?: string) => 
    ipcRenderer.invoke('timelogs:start', taskId, description),
  
  stopTimelog: (id: string) => 
    ipcRenderer.invoke('timelogs:stop', id),
  
  // ========== 任务依赖 ==========
  getDependencies: (taskId: string) => 
    ipcRenderer.invoke('dependencies:getByTaskId', taskId),
  
  createDependency: (taskId: string, dependencyTaskId: string, type?: string) => 
    ipcRenderer.invoke('dependencies:create', taskId, dependencyTaskId, type),
  
  deleteDependency: (id: string) => 
    ipcRenderer.invoke('dependencies:delete', id),
  
  // ========== 标签管理 ==========
  getTags: (taskId: string) => 
    ipcRenderer.invoke('tags:getByTaskId', taskId),
  
  addTag: (taskId: string, tagName: string, tagColor?: string) => 
    ipcRenderer.invoke('tags:add', taskId, tagName, tagColor),
  
  deleteTag: (id: string) => 
    ipcRenderer.invoke('tags:delete', id),
  
  // ========== 项目管理 ==========
  getProjects: () => 
    ipcRenderer.invoke('projects:getAll'),
  
  getProjectById: (id: string) => 
    ipcRenderer.invoke('projects:getById', id),
  
  createProject: (projectData: { name: string; type: 'personal' | 'company'; description?: string; color?: string }) => 
    ipcRenderer.invoke('projects:create', projectData),
  
  updateProject: (id: string, updates: Partial<Project>) => 
    ipcRenderer.invoke('projects:update', id, updates),
  
  deleteProject: (id: string) => 
    ipcRenderer.invoke('projects:delete', id),
  
  getProjectStats: (projectId: string) => 
    ipcRenderer.invoke('projects:getStats', projectId),
  
  // ========== 日程管理 ==========
  getSchedules: (filters?: { dateRange?: { start: string; end: string }; priority?: 'low' | 'medium' | 'high'; search?: string }) => 
    ipcRenderer.invoke('schedules:getAll', filters),
  
  getScheduleById: (id: string) => 
    ipcRenderer.invoke('schedules:getById', id),
  
  createSchedule: (scheduleData: { 
    title: string; 
    description?: string; 
    location?: string; 
    startTime: string; 
    endTime: string; 
    allDay?: boolean; 
    color?: string; 
    priority?: 'low' | 'medium' | 'high'; 
    reminder?: number;
    repeat?: { type: 'daily' | 'weekly' | 'monthly' | 'yearly'; interval?: number; endDate?: string };
    relatedTaskId?: string;
  }) => 
    ipcRenderer.invoke('schedules:create', scheduleData),
  
  updateSchedule: (id: string, updates: any) => 
    ipcRenderer.invoke('schedules:update', id, updates),
  
  deleteSchedule: (id: string) => 
    ipcRenderer.invoke('schedules:delete', id),
  
  getSchedulesByDate: (date: string) => 
    ipcRenderer.invoke('schedules:getByDate', date),
});

console.log('Preload script loaded successfully');
console.log('Preload script - contextBridge exposed:', typeof contextBridge);
console.log('Preload script - electronAPI object created');
