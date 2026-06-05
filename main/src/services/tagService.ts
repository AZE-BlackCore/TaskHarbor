import { Database } from 'sql.js';
import { getDatabase } from './database';
import { generateId } from '../utils/idGenerator';
import { getUTCNow } from '../utils/timestamp';

/**
 * 标签创建输入参数
 */
export interface CreateTagInput {
  name: string;
  color?: string;
}

/**
 * 标签更新参数
 */
export interface UpdateTagInput extends Partial<CreateTagInput> {
  [key: string]: any;
}

/**
 * 标签统计信息
 */
export interface TagStats {
  totalTasks: number;
  byStatus: Array<{ status: string; count: number }>;
  byAssignee: Array<{ assignee: string; count: number }>;
  averageProgress: number;
}

/**
 * 标签服务类 - 封装所有标签相关的数据库操作
 */
export class TagService {
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
   * 创建标签
   */
  async createTag(input: CreateTagInput) {
    const id = generateId('tag');
    const now = getUTCNow();

    const stmt = this.db.prepare(`
      INSERT INTO tags (id, name, color, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run([
      id,
      input.name,
      input.color || '#3B82F6',
      now,
      now,
    ]);

    return {
      id,
      ...input,
      color: input.color || '#3B82F6',
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 更新标签
   */
  async updateTag(id: string, updates: UpdateTagInput) {
    const allowedFields = ['name', 'color'];
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
      UPDATE tags SET ${setClauses.join(', ')} WHERE id = ?
    `);

    stmt.run(values);
    return true;
  }

  /**
   * 删除标签
   */
  async deleteTag(id: string) {
    const tag = await this.findById(id);
    if (!tag) {
      return false;
    }
    
    const stmt = this.db.prepare('DELETE FROM tags WHERE id = ?');
    stmt.run([id]);
    return true;
  }

  /**
   * 根据 ID 查询标签
   */
  async findById(id: string) {
    const stmt = this.db.prepare('SELECT * FROM tags WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      return stmt.getAsObject();
    }
    return null;
  }

  /**
   * 查询所有标签
   */
  async findAll() {
    const stmt = this.db.prepare('SELECT * FROM tags ORDER BY createdAt DESC');

    const tags: any[] = [];
    while (stmt.step()) {
      tags.push(stmt.getAsObject());
    }

    return tags;
  }

  /**
   * 为任务添加标签
   */
  async addTagToTask(taskId: string, tagId: string) {
    const id = generateId('rel');
    const now = getUTCNow();

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO task_tag_relations (id, taskId, tagId, createdAt)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run([id, taskId, tagId, now]);
    return true;
  }

  /**
   * 从任务移除标签
   */
  async removeTagFromTask(taskId: string, tagId: string) {
    const stmt = this.db.prepare(`
      DELETE FROM task_tag_relations WHERE taskId = ? AND tagId = ?
    `);
    stmt.run([taskId, tagId]);
    return true;
  }

  /**
   * 获取任务的所有标签
   */
  async getTagsForTask(taskId: string) {
    const stmt = this.db.prepare(`
      SELECT t.* FROM tags t
      JOIN task_tag_relations r ON t.id = r.tagId
      WHERE r.taskId = ?
      ORDER BY t.createdAt DESC
    `);
    stmt.bind([taskId]);

    const tags: any[] = [];
    while (stmt.step()) {
      tags.push(stmt.getAsObject());
    }

    return tags;
  }

  /**
   * 获取标签的所有任务
   */
  async getTasksForTag(tagId: string) {
    const stmt = this.db.prepare(`
      SELECT DISTINCT t.* FROM tasks t
      JOIN task_tag_relations r ON t.id = r.taskId
      WHERE r.tagId = ?
      ORDER BY t.createdAt DESC
    `);
    stmt.bind([tagId]);

    const tasks: any[] = [];
    while (stmt.step()) {
      tasks.push(stmt.getAsObject());
    }

    return tasks;
  }

  /**
   * 获取标签统计信息
   */
  async getTagStats(tagId: string): Promise<TagStats> {
    // 总任务数
    const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM tasks t
      JOIN task_tag_relations r ON t.id = r.taskId
      WHERE r.tagId = ?
    `);
    totalStmt.bind([tagId]);
    const total = totalStmt.step() ? (totalStmt.getAsObject() as any).count : 0;

    // 按状态统计
    const statusStmt = this.db.prepare(`
      SELECT t.status, COUNT(*) as count 
      FROM tasks t
      JOIN task_tag_relations r ON t.id = r.taskId
      WHERE r.tagId = ?
      GROUP BY t.status
    `);
    statusStmt.bind([tagId]);

    const byStatus: Array<{ status: string; count: number }> = [];
    while (statusStmt.step()) {
      byStatus.push(statusStmt.getAsObject() as any);
    }

    // 按责任人统计
    const assigneeStmt = this.db.prepare(`
      SELECT t.assignee, COUNT(*) as count 
      FROM tasks t
      JOIN task_tag_relations r ON t.id = r.taskId
      WHERE r.tagId = ? AND t.assignee IS NOT NULL
      GROUP BY t.assignee
    `);
    assigneeStmt.bind([tagId]);

    const byAssignee: Array<{ assignee: string; count: number }> = [];
    while (assigneeStmt.step()) {
      byAssignee.push(assigneeStmt.getAsObject() as any);
    }

    // 平均进度
    const progressStmt = this.db.prepare(`
      SELECT AVG(t.progress) as avgProgress 
      FROM tasks t
      JOIN task_tag_relations r ON t.id = r.taskId
      WHERE r.tagId = ?
    `);
    progressStmt.bind([tagId]);
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
   * 统计标签数量
   */
  async count() {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM tags');

    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      return row.count;
    }
    return 0;
  }

  /**
   * 获取所有标签的汇总统计
   */
  async getAllTagsSummary() {
    const tags = await this.findAll();
    const summaries = await Promise.all(
      tags.map(async (tag) => {
        const stats = await this.getTagStats(tag.id);
        return {
          ...tag,
          ...stats,
        };
      })
    );

    return summaries;
  }
}

export const tagService = new TagService();
