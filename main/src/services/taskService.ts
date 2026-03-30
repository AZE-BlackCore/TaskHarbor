import { Database } from 'sql.js';
import { getDatabase, saveDatabase } from './database';
import { generateId } from '../utils/idGenerator';
import { getUTCNow } from '../utils/timestamp';
import { cacheService, getTasksCacheKey, getQueryCacheKey } from './cacheService';

/**
 * 任务创建输入参数
 */
export interface CreateTaskInput {
  projectId: string;
  moduleId?: string;
  module?: string;
  functionModule?: string;
  description: string;
  progress?: number;
  status?: string;
  assignee?: string;
  startDate?: string;
  estimatedEndDate?: string;
  issues?: string;
  notes?: string;
}

/**
 * 任务更新参数
 */
export interface UpdateTaskInput extends Partial<CreateTaskInput> {}

/**
 * 任务查询过滤器
 */
export interface TaskFilters {
  projectId?: string;
  status?: string;
  assignee?: string;
}

/**
 * 任务服务类 - 封装所有任务相关的数据库操作
 */
export class TaskService {
  private db: Database;

  constructor() {
    this.db = null as any;
  }

  /**
   * 初始化数据库连接
   */
  async init() {
    this.db = await getDatabase();
  }

  /**
   * 创建任务
   * @param input 任务创建参数
   * @returns 创建的任务
   */
  async createTask(input: CreateTaskInput) {
    const id = generateId('task');
    const now = getUTCNow();

    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, projectId, moduleId, module, functionModule,
        description, progress, status, assignee,
        startDate, estimatedEndDate, issues, notes,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      id,
      input.projectId,
      input.moduleId || null,
      input.module || null,
      input.functionModule || null,
      input.description,
      input.progress || 0,
      input.status || 'todo',
      input.assignee || null,
      input.startDate || null,
      input.estimatedEndDate || null,
      input.issues || null,
      input.notes || null,
      now,
      now,
    ]);

    // 清除相关缓存
    cacheService.invalidateByPrefix('tasks:');
    cacheService.invalidateByPrefix('query:tasks:');

    return {
      id,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 更新任务
   * @param id 任务 ID
   * @param updates 更新参数
   * @returns 是否更新成功
   */
  async updateTask(id: string, updates: UpdateTaskInput) {
    const allowedFields = [
      'moduleId', 'module', 'functionModule', 'description',
      'progress', 'status', 'assignee', 'startDate',
      'estimatedEndDate', 'actualEndDate', 'issues', 'notes'
    ];

    const setClauses: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (field in updates) {
        setClauses.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClauses.push('updatedAt = ?');
    values.push(getUTCNow());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?
    `);

    const result = stmt.run(values);
    
    // 清除相关缓存
    if (result.changes > 0) {
      cacheService.invalidateByPrefix('tasks:');
      cacheService.invalidateByPrefix('query:tasks:');
    }
    
    return result.changes > 0;
  }

  /**
   * 删除任务
   * @param id 任务 ID
   * @returns 是否删除成功
   */
  async deleteTask(id: string) {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run([id]);
    
    // 清除相关缓存
    if (result.changes > 0) {
      cacheService.invalidateByPrefix('tasks:');
      cacheService.invalidateByPrefix('query:tasks:');
    }
    
    return result.changes > 0;
  }

  /**
   * 批量删除任务
   * @param ids 任务 ID 数组
   * @returns 删除的数量
   */
  async deleteTasks(ids: string[]) {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => '?').join(',');
    const stmt = this.db.prepare(`DELETE FROM tasks WHERE id IN (${placeholders})`);
    const result = stmt.run(ids);
    
    // 清除相关缓存
    if (result.changes > 0) {
      cacheService.invalidateByPrefix('tasks:');
      cacheService.invalidateByPrefix('query:tasks:');
    }
    
    return result.changes;
  }

  /**
   * 根据 ID 查询任务
   * @param id 任务 ID
   * @returns 任务对象，不存在返回 null
   */
  async findById(id: string) {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      return stmt.getAsObject();
    }
    return null;
  }

  /**
   * 查询任务列表
   * @param filters 查询过滤器
   * @returns 任务数组
   */
  async findAll(filters?: TaskFilters) {
    // 尝试从缓存获取
    const cacheKey = getTasksCacheKey(filters);
    const cached = cacheService.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (filters?.projectId) {
      query += ' AND projectId = ?';
      params.push(filters.projectId);
    }

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.assignee) {
      query += ' AND assignee = ?';
      params.push(filters.assignee);
    }

    query += ' ORDER BY createdAt DESC';

    const stmt = this.db.prepare(query);
    stmt.bind(params);

    const tasks: any[] = [];
    while (stmt.step()) {
      tasks.push(stmt.getAsObject());
    }

    // 缓存 2 秒
    cacheService.set(cacheKey, tasks, 2000);
    return tasks;
  }

  /**
   * 统计任务数量
   * @param filters 查询过滤器
   * @returns 任务数量
   */
  async count(filters?: TaskFilters) {
    const cacheKey = getQueryCacheKey('tasks:count', [filters]);
    const cached = cacheService.get<number>(cacheKey);
    if (cached) {
      return cached;
    }

    let query = 'SELECT COUNT(*) as count FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (filters?.projectId) {
      query += ' AND projectId = ?';
      params.push(filters.projectId);
    }

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.assignee) {
      query += ' AND assignee = ?';
      params.push(filters.assignee);
    }

    const stmt = this.db.prepare(query);
    stmt.bind(params);

    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      const count = row.count;
      cacheService.set(cacheKey, count, 2000);
      return count;
    }
    return 0;
  }

  /**
   * 按状态统计任务
   * @param projectId 项目 ID
   * @returns 各状态的任务数量
   */
  async countByStatus(projectId?: string) {
    let query = `
      SELECT status, COUNT(*) as count 
      FROM tasks 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (projectId) {
      query += ' AND projectId = ?';
      params.push(projectId);
    }

    query += ' GROUP BY status';

    const stmt = this.db.prepare(query);
    stmt.bind(params);

    const result: Record<string, number> = {};
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      result[row.status] = row.count;
    }

    return result;
  }

  /**
   * 按责任人统计任务
   * @param projectId 项目 ID
   * @returns 各责任人的任务数量
   */
  async countByAssignee(projectId?: string) {
    let query = `
      SELECT assignee, COUNT(*) as count 
      FROM tasks 
      WHERE projectId = ? AND assignee IS NOT NULL
      GROUP BY assignee
    `;

    const params: any[] = [projectId || '%'];
    if (!projectId) {
      query = `
        SELECT assignee, COUNT(*) as count 
        FROM tasks 
        WHERE assignee IS NOT NULL
        GROUP BY assignee
      `;
    }

    const stmt = this.db.prepare(query);
    stmt.bind(params);

    const result: Record<string, number> = {};
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      result[row.assignee] = row.count;
    }

    return result;
  }

  /**
   * 计算平均进度
   * @param projectId 项目 ID
   * @returns 平均进度百分比
   */
  async averageProgress(projectId?: string) {
    let query = 'SELECT AVG(progress) as avgProgress FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (projectId) {
      query += ' AND projectId = ?';
      params.push(projectId);
    }

    const stmt = this.db.prepare(query);
    stmt.bind(params);

    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      return Math.round(row.avgProgress || 0);
    }
    return 0;
  }
}

// 单例导出
export const taskService = new TaskService();
