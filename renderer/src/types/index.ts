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
