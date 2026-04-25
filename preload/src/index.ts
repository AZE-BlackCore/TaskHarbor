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

  // ========== 应用信息 ==========
  getAppInfo: () =>
    ipcRenderer.invoke('get-app-info'),

  // ========== AI Agent ==========

  // 发起对话（流式，chunk 通过 onAgentStream 接收）
  agentChat: (request: { conversationId?: string; message: string; context?: Record<string, unknown> }) =>
    ipcRenderer.invoke('agent:chat', request),

  // 确认或取消工具调用
  agentConfirmToolCall: (toolCallId: string, approved: boolean) =>
    ipcRenderer.invoke('agent:confirmToolCall', toolCallId, approved),

  // 取消当前正在进行的对话
  agentCancel: () =>
    ipcRenderer.invoke('agent:cancel'),

  // 获取 Agent 配置（脱敏）
  agentGetConfig: () =>
    ipcRenderer.invoke('agent:getConfig'),

  // 更新 Agent 配置
  agentUpdateConfig: (config: Record<string, unknown>) =>
    ipcRenderer.invoke('agent:updateConfig', config),

  // 测试 LLM 连接可用性
  agentTestConnection: (providerType?: string) =>
    ipcRenderer.invoke('agent:testConnection', providerType),

  // 获取对话历史列表
  agentListConversations: () =>
    ipcRenderer.invoke('agent:listConversations'),

  // 获取指定对话的消息记录
  agentGetMessages: (conversationId: string) =>
    ipcRenderer.invoke('agent:getMessages', conversationId),

  // 删除指定对话
  agentDeleteConversation: (conversationId: string) =>
    ipcRenderer.invoke('agent:deleteConversation', conversationId),

  // 清空所有对话历史
  agentClearHistory: () =>
    ipcRenderer.invoke('agent:clearHistory'),

  // 导出对话为 Markdown
  agentExportConversation: (conversationId: string) =>
    ipcRenderer.invoke('agent:exportConversation', conversationId),

  // 监听流式输出事件
  onAgentStream: (callback: (chunk: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, chunk: unknown) => callback(chunk);
    ipcRenderer.on('agent:stream', listener);
    // 返回清理函数
    return () => ipcRenderer.removeListener('agent:stream', listener);
  },

  // 移除所有 agent:stream 监听器
  removeAgentStreamListeners: () => {
    ipcRenderer.removeAllListeners('agent:stream');
  },
});

console.log('Preload script loaded successfully');
console.log('Preload script - contextBridge exposed:', typeof contextBridge);
console.log('Preload script - electronAPI object created');
