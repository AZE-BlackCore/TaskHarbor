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
  getTaskStats: () => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  
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
  getAllTags: () => Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }>;
  getTagById: (id: string) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  createTag: (tagData: { name: string; color?: string }) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  updateTag: (id: string, updates: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  deleteTag: (id: string) => Promise<{ success: boolean; error?: string }>;
  getTagStats: (tagId: string) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  addTagToTask: (taskId: string, tagId: string) => Promise<{ success: boolean; error?: string }>;
  removeTagFromTask: (taskId: string, tagId: string) => Promise<{ success: boolean; error?: string }>;
  getTasksByTag: (tagId: string) => Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }>;
  addTag: (taskId: string, tagName: string, tagColor?: string) => Promise<{ success: boolean; error?: string }>;
  
  // 项目
  getProjects: () => Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }>;
  getProjectById: (id: string) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  createProject: (projectData: Record<string, unknown>) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  updateProject: (id: string, updates: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  deleteProject: (id: string) => Promise<{ success: boolean; error?: string }>;
  getProjectStats: (projectId: string) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;

  // 日程管理
  getSchedules: (filters?: { dateRange?: { start: string; end: string }; priority?: 'low' | 'medium' | 'high'; search?: string }) => Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }>;
  getScheduleById: (id: string) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  createSchedule: (scheduleData: Record<string, unknown>) => Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;
  updateSchedule: (id: string, updates: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  deleteSchedule: (id: string) => Promise<{ success: boolean; error?: string }>;
  getSchedulesByDate: (date: string) => Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }>;

  // 通知
  sendNotification: (title: string, body: string) => Promise<{ success: boolean }>;

  // 任务提醒
  getRemindersByTask: (taskId: string) => Promise<{ success: boolean; data: TaskReminderInfo[]; error?: string }>;
  createReminder: (input: {
    taskId: string;
    reminderTime: string;
    cycle: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
    intervalDays?: number;
    intervalHours?: number;
    customTimes?: string;
  }) => Promise<{ success: boolean; data: TaskReminderInfo; error?: string }>;
  updateReminder: (id: string, updates: Record<string, unknown>) => Promise<{ success: boolean; data: TaskReminderInfo; error?: string }>;
  deleteReminder: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteRemindersByTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
  calcNextReminderTime: (
    reminderTime: string,
    cycle: string,
    intervalDays: number,
    intervalHours: number,
    customTimes: string
  ) => Promise<{ success: boolean; data: string; error?: string }>;

  // 应用信息
  getAppInfo: () => Promise<{ success: boolean; version: string; buildDate: string; author: string; productName: string; description: string }>;
  setMenuBarVisibility: (visible: boolean) => Promise<{ success: boolean }>;
  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<{ success: boolean }>;
  isAlwaysOnTop: () => Promise<{ success: boolean; alwaysOnTop: boolean }>;
  setWindowPosition: (x: number, y: number) => Promise<{ success: boolean }>;
  onClosePreference: (callback: (action: 'minimize' | 'exit') => void) => void;
  removeClosePreferenceListener: () => void;

  // 数据导出
  exportToMarkdown: (options?: {
    includeTasks?: boolean;
    includeProjects?: boolean;
    includeSchedules?: boolean;
    outputPath?: string;
    filename?: string;
  }) => Promise<{ success: boolean; message: string; filePath?: string }>;
}

interface TaskReminderInfo {
  id: string;
  taskId: string;
  reminderTime: string;
  cycle: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  intervalDays: number;
  intervalHours: number;
  customTimes?: string;
  lastFiredAt?: string;
  nextFireAt?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Window {
  electronAPI: ElectronAPI;
}
