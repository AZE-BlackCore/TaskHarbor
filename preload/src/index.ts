import { contextBridge, ipcRenderer } from 'electron';

// 定义类型
export interface Task {
  id: string;
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

export interface Tag {
  id: string;
  name: string;
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
  tagId?: string;
  status?: string;
  assignee?: string;
  search?: string;
  priority?: string;
  dateRange?: { start: string; end: string };
  dateField?: 'createdAt' | 'startDate' | 'estimatedEndDate';
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
  
  createFloatingWindow: (options?: { opacity?: number; clickThrough?: boolean; x?: number; y?: number; page?: 'floating' | 'desktop-card' }) => 
    ipcRenderer.invoke('window:createFloating', options),
  
  closeFloatingWindow: (windowId: number) => 
    ipcRenderer.invoke('window:closeFloating', windowId),
  
  toggleAlwaysOnTop: () => 
    ipcRenderer.invoke('window:toggleAlwaysOnTop'),

  setAlwaysOnTop: (alwaysOnTop: boolean) => 
    ipcRenderer.invoke('window:setAlwaysOnTop', alwaysOnTop),

  isAlwaysOnTop: () => 
    ipcRenderer.invoke('window:isAlwaysOnTop'),

  setWindowPosition: (x: number, y: number) => 
    ipcRenderer.invoke('window:setPosition', x, y),

  // 监听关闭偏好设置
  onClosePreference: (callback: (action: 'minimize' | 'exit') => void) => {
    ipcRenderer.on('close-preference', (_event, action) => callback(action));
  },

  removeClosePreferenceListener: () => {
    ipcRenderer.removeAllListeners('close-preference');
  },
  
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

  getTaskStats: () =>
    ipcRenderer.invoke('tasks:getStats'),
  
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
    ipcRenderer.invoke('tags:getForTask', taskId),
  
  getAllTags: () => 
    ipcRenderer.invoke('tags:getAll'),
  
  getTagById: (id: string) => 
    ipcRenderer.invoke('tags:getById', id),
  
  createTag: (tagData: { name: string; color?: string }) => 
    ipcRenderer.invoke('tags:create', tagData),
  
  updateTag: (id: string, updates: Partial<Tag>) => 
    ipcRenderer.invoke('tags:update', id, updates),
  
  deleteTag: (id: string) => 
    ipcRenderer.invoke('tags:delete', id),
  
  getTagStats: (tagId: string) =>
    ipcRenderer.invoke('tags:getStats', tagId),
  
  addTagToTask: (taskId: string, tagId: string) => 
    ipcRenderer.invoke('tags:addToTask', taskId, tagId),
  
  removeTagFromTask: (taskId: string, tagId: string) => 
    ipcRenderer.invoke('tags:removeFromTask', taskId, tagId),
  
  getTasksByTag: (tagId: string) => 
    ipcRenderer.invoke('tags:getTasks', tagId),

  // ========== 项目管理 ==========
  getProjects: () => 
    ipcRenderer.invoke('projects:getAll'),
  
  getProjectById: (id: string) => 
    ipcRenderer.invoke('projects:getById', id),
  
  createProject: (projectData: any) => 
    ipcRenderer.invoke('projects:create', projectData),
  
  updateProject: (id: string, updates: any) => 
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

  // ========== 通知 ==========
  sendNotification: (title: string, body: string) =>
    ipcRenderer.invoke('notification:send', title, body),

  // ========== 菜单栏控制 ==========
  setMenuBarVisibility: (visible: boolean) =>
    ipcRenderer.invoke('set-menu-bar-visibility', visible),

  // ========== 任务提醒 ==========
  getRemindersByTask: (taskId: string) =>
    ipcRenderer.invoke('reminders:getByTask', taskId),

  createReminder: (input: {
    taskId: string;
    reminderTime: string;
    cycle: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
    intervalDays?: number;
    intervalHours?: number;
    customTimes?: string;
  }) =>
    ipcRenderer.invoke('reminders:create', input),

  updateReminder: (id: string, updates: {
    reminderTime?: string;
    cycle?: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
    intervalDays?: number;
    intervalHours?: number;
    customTimes?: string;
  }) =>
    ipcRenderer.invoke('reminders:update', id, updates),

  deleteReminder: (id: string) =>
    ipcRenderer.invoke('reminders:delete', id),

  deleteRemindersByTask: (taskId: string) =>
    ipcRenderer.invoke('reminders:deleteByTask', taskId),

  calcNextReminderTime: (
    reminderTime: string,
    cycle: string,
    intervalDays: number,
    intervalHours: number,
    customTimes: string
  ) =>
    ipcRenderer.invoke('reminders:calcNext', reminderTime, cycle, intervalDays, intervalHours, customTimes),

  // ========== 数据导出 ==========
  exportToMarkdown: (options?: {
    includeTasks?: boolean;
    includeProjects?: boolean;
    includeSchedules?: boolean;
    outputPath?: string;
    filename?: string;
  }) =>
    ipcRenderer.invoke('export:toMarkdown', options),

  // ========== 应用信息 ==========
  getAppInfo: () =>
    ipcRenderer.invoke('get-app-info'),

  // ========== 数据库信息 ==========
  getDatabasePath: () =>
    ipcRenderer.invoke('window:getDatabasePath'),
});

console.log('Preload script loaded successfully');
console.log('Preload script - contextBridge exposed:', typeof contextBridge);
console.log('Preload script - electronAPI object created');
