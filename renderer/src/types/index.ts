export interface Task {
  id: string;
  projectId: string;
  moduleId?: string;
  module?: string;
  functionModule?: string;
  description: string;
  progress: number;
  status: TaskStatus;
  assignee?: string;
  startDate?: string;
  estimatedEndDate?: string;
  actualEndDate?: string;
  issues?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';

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

export interface TaskDependency {
  id: string;
  taskId: string;
  dependencyTaskId: string;
  type: string;
  dependencyDescription?: string;
}

export interface TaskTag {
  id: string;
  taskId: string;
  tagName: string;
  tagColor: string;
}

export interface TaskFilters {
  projectId?: string;
  status?: string;
  assignee?: string;
  search?: string;
}

export interface ProjectStats {
  totalTasks: number;
  byStatus: Array<{ status: string; count: number }>;
  byAssignee: Array<{ assignee: string; count: number }>;
  averageProgress: number;
}

// 日程相关类型
export interface Schedule {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string; // ISO 字符串
  endTime: string;   // ISO 字符串
  allDay: boolean;   // 是否全天事件
  color: string;     // 日程颜色
  priority: 'low' | 'medium' | 'high'; // 优先级
  reminder?: number; // 提前提醒时间（分钟）
  repeat?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number; // 间隔，如每 2 周
    endDate?: string;  // 重复结束日期
  };
  relatedTaskId?: string; // 关联的任务 ID
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  priority?: 'low' | 'medium' | 'high';
  search?: string;
}
