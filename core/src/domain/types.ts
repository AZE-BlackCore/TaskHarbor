/**
 * core/domain —— 领域模型（与平台无关的单一真源）
 * 桌面端 renderer、移动端均从此处取类型，禁止各自重复定义。
 */

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
export type Priority = 'low' | 'medium' | 'high';
export type SyncOp = 'upsert' | 'delete';

/** 所有参与同步的记录都具备的同步元数据 */
export interface SyncStamped {
  id: string;
  updatedAt: string;
  /** 软删除时间戳（NULL = 未删除），ADR-08 */
  deletedAt?: string | null;
  /** 最后修改来自哪台设备 */
  originDeviceId?: string | null;
}

export interface Task extends SyncStamped {
  moduleId?: string;
  module?: string;
  functionModule?: string;
  description: string;
  progress: number;
  status: TaskStatus;
  priority: Priority;
  assignee?: string;
  startDate?: string;
  estimatedEndDate?: string;
  actualEndDate?: string;
  issues?: string;
  notes?: string;
  createdAt: string;
}

export interface Tag extends SyncStamped {
  name: string;
  color: string;
  createdAt: string;
}

export interface Subtask extends SyncStamped {
  taskId: string;
  description: string;
  completed: boolean;
  orderIndex: number;
  createdAt?: string;
}

export interface TimeLog extends SyncStamped {
  taskId: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  description?: string;
  createdAt?: string;
}

export interface TaskDependency extends SyncStamped {
  taskId: string;
  dependencyTaskId: string;
  type: string;
  createdAt?: string;
}

export interface TaskTagRelation extends SyncStamped {
  taskId: string;
  tagId: string;
  createdAt?: string;
}

export interface Schedule extends SyncStamped {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  color: string;
  priority: Priority;
  reminder?: number;
  repeatType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  repeatInterval?: number;
  repeatEndDate?: string;
  relatedTaskId?: string;
  completed?: boolean;
  createdAt: string;
}

export interface TaskReminder extends SyncStamped {
  taskId: string;
  reminderTime: string;
  cycle: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  intervalDays: number;
  intervalHours: number;
  customTimes?: string;
  lastFiredAt?: string;
  nextFireAt?: string;
  enabled: boolean;
  createdAt?: string;
}

/** 复合游标：updatedAt + id，避免同毫秒边界丢数据（设计文档 4.3） */
export interface Cursor {
  ts: string | null;
  id: string | null;
}

export interface OutboxItem {
  id: string;
  tableName: string;
  op: SyncOp;
  recordId: string;
  payload: string | null;
  state: 'pending' | 'sending' | 'failed' | 'done';
  retryCount: number;
  lastError?: string | null;
  nextRetryAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictRecord {
  id: string;
  tableName: string;
  recordId: string;
  localPayload: string | null;
  remotePayload: string | null;
  localUpdatedAt: string | null;
  remoteUpdatedAt: string | null;
  kind: 'lww' | 'delete-vs-update';
  resolved: boolean;
  createdAt: string;
}

/** push/pull 传输的变更条目 */
export interface ChangeRecord {
  table: string;
  op: SyncOp;
  id: string;
  updatedAt: string;
  deletedAt?: string | null;
  originDeviceId?: string | null;
  payload: Record<string, unknown> | null;
}

export interface PushResultItem {
  id: string;
  ok: boolean;
  /** Hub 侧生成并回填的时间戳（ADR-03） */
  hubUpdatedAt?: string;
  error?: string;
  conflict?: boolean;
}

export interface PullPage {
  table: string;
  changes: ChangeRecord[];
  nextCursor: Cursor;
  hasMore: boolean;
}
