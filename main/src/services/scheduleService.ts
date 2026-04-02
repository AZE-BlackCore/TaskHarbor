import { getDatabase } from './database';

interface Schedule {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  color: string;
  priority: 'low' | 'medium' | 'high';
  reminder?: number;
  repeat?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    endDate?: string;
  };
  relatedTaskId?: string;
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

/**
 * 日程创建输入参数
 */
export interface CreateScheduleInput {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  color?: string;
  priority?: 'low' | 'medium' | 'high';
  reminder?: number;
  repeat?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    endDate?: string;
  };
  relatedTaskId?: string;
}

/**
 * 日程更新参数
 */
export interface UpdateScheduleInput extends Partial<CreateScheduleInput> {
  id: string;
}

/**
 * 创建日程
 */
export async function createSchedule(input: CreateScheduleInput): Promise<Schedule> {
  const db = await getDatabase();
  const id = `sch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  db!.run(`
    INSERT INTO schedules (
      id, title, description, location, startTime, endTime,
      allDay, color, priority, reminder, repeatType, repeatInterval,
      repeatEndDate, relatedTaskId, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    input.title,
    input.description || null,
    input.location || null,
    input.startTime,
    input.endTime,
    input.allDay ? 1 : 0,
    input.color || '#3B82F6',
    input.priority || 'medium',
    input.reminder || null,
    input.repeat?.type || null,
    input.repeat?.interval || 1,
    input.repeat?.endDate || null,
    input.relatedTaskId || null,
    now,
    now
  ]);

  return getScheduleById(id);
}

/**
 * 获取日程详情
 */
export async function getScheduleById(id: string): Promise<Schedule> {
  const db = await getDatabase();
  const stmt = db.prepare('SELECT * FROM schedules WHERE id = ?');
  stmt.bind([id]);

  if (!stmt.step()) {
    throw new Error('Schedule not found');
  }

  const row: any = stmt.getAsObject();

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startTime: row.startTime,
    endTime: row.endTime,
    allDay: row.allDay === 1,
    color: row.color,
    priority: row.priority,
    reminder: row.reminder,
    repeat: row.repeatType ? {
      type: row.repeatType,
      interval: row.repeatInterval,
      endDate: row.repeatEndDate
    } : undefined,
    relatedTaskId: row.relatedTaskId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

/**
 * 获取日程列表（带过滤）
 */
export async function getSchedules(filters?: ScheduleFilters): Promise<Schedule[]> {
  const db = await getDatabase();
  let query = 'SELECT * FROM schedules WHERE 1=1';
  const params: any[] = [];

  if (filters?.dateRange) {
    query += ' AND startTime <= ? AND endTime >= ?';
    params.push(filters.dateRange.end, filters.dateRange.start);
  }

  if (filters?.priority) {
    query += ' AND priority = ?';
    params.push(filters.priority);
  }

  if (filters?.search) {
    query += ' AND (title LIKE ? OR description LIKE ? OR location LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY startTime ASC';

  const stmt = db.prepare(query);
  stmt.bind(params);

  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startTime: row.startTime,
    endTime: row.endTime,
    allDay: row.allDay === 1,
    color: row.color,
    priority: row.priority,
    reminder: row.reminder,
    repeat: row.repeatType ? {
      type: row.repeatType,
      interval: row.repeatInterval,
      endDate: row.repeatEndDate
    } : undefined,
    relatedTaskId: row.relatedTaskId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}

/**
 * 更新日程
 */
export async function updateSchedule(input: UpdateScheduleInput): Promise<Schedule> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const params: any[] = [];

  if (input.title !== undefined) {
    fields.push('title = ?');
    params.push(input.title);
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    params.push(input.description);
  }
  if (input.location !== undefined) {
    fields.push('location = ?');
    params.push(input.location);
  }
  if (input.startTime !== undefined) {
    fields.push('startTime = ?');
    params.push(input.startTime);
  }
  if (input.endTime !== undefined) {
    fields.push('endTime = ?');
    params.push(input.endTime);
  }
  if (input.allDay !== undefined) {
    fields.push('allDay = ?');
    params.push(input.allDay ? 1 : 0);
  }
  if (input.color !== undefined) {
    fields.push('color = ?');
    params.push(input.color);
  }
  if (input.priority !== undefined) {
    fields.push('priority = ?');
    params.push(input.priority);
  }
  if (input.reminder !== undefined) {
    fields.push('reminder = ?');
    params.push(input.reminder);
  }
  if (input.repeat !== undefined) {
    fields.push('repeatType = ?', 'repeatInterval = ?', 'repeatEndDate = ?');
    params.push(
      input.repeat?.type || null,
      input.repeat?.interval || 1,
      input.repeat?.endDate || null
    );
  }
  if (input.relatedTaskId !== undefined) {
    fields.push('relatedTaskId = ?');
    params.push(input.relatedTaskId);
  }

  if (fields.length === 0) {
    return getScheduleById(input.id);
  }

  fields.push('updatedAt = ?');
  params.push(now);
  params.push(input.id);

  db!.run(`UPDATE schedules SET ${fields.join(', ')} WHERE id = ?`, params);

  return getScheduleById(input.id);
}

/**
 * 删除日程
 */
export async function deleteSchedule(id: string): Promise<void> {
  const db = await getDatabase();
  db!.run('DELETE FROM schedules WHERE id = ?', [id]);
}

/**
 * 获取指定日期的日程
 */
export async function getSchedulesByDate(date: string): Promise<Schedule[]> {
  const db = await getDatabase();
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const stmt = db.prepare(`
    SELECT * FROM schedules
    WHERE startTime <= ? AND endTime >= ?
    ORDER BY startTime ASC
  `);
  stmt.bind([endOfDay.toISOString(), startOfDay.toISOString()]);

  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startTime: row.startTime,
    endTime: row.endTime,
    allDay: row.allDay === 1,
    color: row.color,
    priority: row.priority,
    reminder: row.reminder,
    repeat: row.repeatType ? {
      type: row.repeatType,
      interval: row.repeatInterval,
      endDate: row.repeatEndDate
    } : undefined,
    relatedTaskId: row.relatedTaskId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}
