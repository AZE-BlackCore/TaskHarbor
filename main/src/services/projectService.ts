import { Database } from 'sql.js';
import { getDatabase } from './database';
import { generateId } from '../utils/idGenerator';
import { getUTCNow } from '../utils/timestamp';

/**
 * 项目创建输入参数
 */
export interface CreateProjectInput {
  name: string;
  type: 'personal' | 'company';
  description?: string;
  color?: string;
}

/**
 * 项目更新参数
 */
export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  [key: string]: any;
}

/**
 * 项目统计信息
 */
export interface ProjectStats {
  totalTasks: number;
  byStatus: Array<{ status: string; count: number }>;
  byAssignee: Array<{ assignee: string; count: number }>;
  averageProgress: number;
}

/**
 * 项目服务类 - 封装所有项目相关的数据库操作
 */
export class ProjectService {
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
   * 创建项目
   * @param input 项目创建参数
   * @returns 创建的项目
   */
  async createProject(input: CreateProjectInput) {
    const id = generateId('project');
    const now = getUTCNow();

    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, type, description, color, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      id,
      input.name,
      input.type,
      input.description || null,
      input.color || '#3B82F6',
      now,
      now,
    ]);

    return {
      id,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 更新项目
   * @param id 项目 ID
   * @param updates 更新参数
   * @returns 是否更新成功
   */
  async updateProject(id: string, updates: UpdateProjectInput) {
    const allowedFields = ['name', 'type', 'description', 'color'];
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
      UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?
    `);

    stmt.run(values);
    return true;
  }

  /**
   * 删除项目
   * @param id 项目 ID
   * @returns 是否删除成功
   */
  async deleteProject(id: string) {
    // 先检查项目是否存在
    const project = await this.findById(id);
    if (!project) {
      return false;
    }
    
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run([id]);
    return true;
  }

  /**
   * 根据 ID 查询项目
   * @param id 项目 ID
   * @returns 项目对象，不存在返回 null
   */
  async findById(id: string) {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      return stmt.getAsObject();
    }
    return null;
  }

  /**
   * 查询项目列表
   * @returns 项目数组
   */
  async findAll() {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY createdAt DESC');

    const projects: any[] = [];
    while (stmt.step()) {
      projects.push(stmt.getAsObject());
    }

    return projects;
  }

  /**
   * 按类型查询项目
   * @param type 项目类型
   * @returns 项目数组
   */
  async findByType(type: 'personal' | 'company') {
    const stmt = this.db.prepare(
      'SELECT * FROM projects WHERE type = ? ORDER BY createdAt DESC'
    );
    stmt.bind([type]);

    const projects: any[] = [];
    while (stmt.step()) {
      projects.push(stmt.getAsObject());
    }

    return projects;
  }

  /**
   * 获取项目统计信息
   * @param projectId 项目 ID
   * @returns 项目统计信息
   */
  async getProjectStats(projectId: string): Promise<ProjectStats> {
    // 总任务数
    const totalStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM tasks WHERE projectId = ?'
    );
    totalStmt.bind([projectId]);
    const total = totalStmt.step() ? (totalStmt.getAsObject() as any).count : 0;

    // 按状态统计
    const statusStmt = this.db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM tasks 
      WHERE projectId = ? 
      GROUP BY status
    `);
    statusStmt.bind([projectId]);

    const byStatus: Array<{ status: string; count: number }> = [];
    while (statusStmt.step()) {
      byStatus.push(statusStmt.getAsObject() as any);
    }

    // 按责任人统计
    const assigneeStmt = this.db.prepare(`
      SELECT assignee, COUNT(*) as count 
      FROM tasks 
      WHERE projectId = ? AND assignee IS NOT NULL
      GROUP BY assignee
    `);
    assigneeStmt.bind([projectId]);

    const byAssignee: Array<{ assignee: string; count: number }> = [];
    while (assigneeStmt.step()) {
      byAssignee.push(assigneeStmt.getAsObject() as any);
    }

    // 平均进度
    const progressStmt = this.db.prepare(`
      SELECT AVG(progress) as avgProgress 
      FROM tasks 
      WHERE projectId = ?
    `);
    progressStmt.bind([projectId]);
    const avgProgress = progressStmt.step() 
      ? Math.round((progressStmt.getAsObject() as any).avgProgress || 0)
      : 0;

    return {
      totalTasks: total,
      byStatus,
      byAssignee,
      averageProgress: avgProgress,
    };
  }

  /**
   * 统计项目数量
   * @param type 可选的项目类型
   * @returns 项目数量
   */
  async count(type?: 'personal' | 'company') {
    let query = 'SELECT COUNT(*) as count FROM projects';
    const params: any[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    const stmt = this.db.prepare(query);
    stmt.bind(params);

    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      return row.count;
    }
    return 0;
  }

  /**
   * 获取所有项目的汇总统计
   * @returns 所有项目的汇总统计信息
   */
  async getAllProjectsSummary() {
    const projects = await this.findAll();
    const summaries = await Promise.all(
      projects.map(async (project) => {
        const stats = await this.getProjectStats(project.id);
        return {
          ...project,
          ...stats,
        };
      })
    );

    return summaries;
  }
}

// 单例导出
export const projectService = new ProjectService();
