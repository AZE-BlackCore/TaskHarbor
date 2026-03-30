import { ipcMain } from 'electron';
import { getDatabase, saveDatabase, runTransaction } from '../services/database';
import { generateId } from '../utils/idGenerator';
import { getUTCNow } from '../utils/timestamp';

export function setupProjectHandlers() {
  // 获取所有项目
  ipcMain.handle('projects:getAll', async () => {
    try {
      const db = await getDatabase();
      const stmt = db.prepare('SELECT * FROM projects ORDER BY createdAt DESC');
      
      const projects: any[] = [];
      while (stmt.step()) {
        projects.push(stmt.getAsObject());
      }
      
      return { success: true, data: projects };
    } catch (error: any) {
      console.error('Error getting projects:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取单个项目
  ipcMain.handle('projects:getById', async (_, id) => {
    try {
      const db = await getDatabase();
      const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
      stmt.bind([id]);
      
      let project = null;
      if (stmt.step()) {
        project = stmt.getAsObject();
      }
      
      if (!project) {
        return { success: false, error: 'Project not found' };
      }
      
      return { success: true, data: project };
    } catch (error: any) {
      console.error('Error getting project:', error);
      return { success: false, error: error.message };
    }
  });

  // 创建项目
  ipcMain.handle('projects:create', async (_, projectData) => {
    try {
      const db = await getDatabase();
      const id = generateId('project');
      const now = getUTCNow();
      
      const stmt = db.prepare(`
        INSERT INTO projects (id, name, type, description, color, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        id,
        projectData.name,
        projectData.type,
        projectData.description || null,
        projectData.color || '#3B82F6',
        now,
        now,
      ]);
      
      saveDatabase();
      
      return { success: true, data: { id, ...projectData, createdAt: now, updatedAt: now } };
    } catch (error: any) {
      console.error('Error creating project:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新项目
  ipcMain.handle('projects:update', async (_, id, updates) => {
    try {
      const db = await getDatabase();
      
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
        return { success: false, error: 'No valid fields to update' };
      }
      
      setClauses.push("updatedAt = datetime('now')");
      values.push(id);
      
      const stmt = db.prepare(`
        UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?
      `);
      
      stmt.run(values);
      saveDatabase();
      
      return { success: true, message: 'Project updated successfully' };
    } catch (error: any) {
      console.error('Error updating project:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除项目
  ipcMain.handle('projects:delete', async (_, id) => {
    try {
      const db = await getDatabase();
      const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
      stmt.run([id]);
      saveDatabase();
      
      return { success: true, message: 'Project deleted successfully' };
    } catch (error: any) {
      console.error('Error deleting project:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取项目统计信息
  ipcMain.handle('projects:getStats', async (_, projectId) => {
    try {
      const db = await getDatabase();
      
      // 总任务数
      const totalStmt = db.prepare(
        'SELECT COUNT(*) as count FROM tasks WHERE projectId = ?'
      );
      totalStmt.bind([projectId]);
      const total = totalStmt.step() ? totalStmt.getAsObject() : { count: 0 };
      
      // 按状态统计
      const statusStmt = db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM tasks 
        WHERE projectId = ? 
        GROUP BY status
      `);
      statusStmt.bind([projectId]);
      
      const byStatus: any[] = [];
      while (statusStmt.step()) {
        byStatus.push(statusStmt.getAsObject());
      }
      
      // 按责任人统计
      const assigneeStmt = db.prepare(`
        SELECT assignee, COUNT(*) as count 
        FROM tasks 
        WHERE projectId = ? AND assignee IS NOT NULL
        GROUP BY assignee
      `);
      assigneeStmt.bind([projectId]);
      
      const byAssignee: any[] = [];
      while (assigneeStmt.step()) {
        byAssignee.push(assigneeStmt.getAsObject());
      }
      
      // 平均进度
      const progressStmt = db.prepare(`
        SELECT AVG(progress) as avgProgress 
        FROM tasks 
        WHERE projectId = ?
      `);
      progressStmt.bind([projectId]);
      const avgProgress = progressStmt.step() ? progressStmt.getAsObject() : { avgProgress: 0 };
      
      return {
        success: true,
        data: {
          totalTasks: (total as any).count,
          byStatus,
          byAssignee,
          averageProgress: (avgProgress as any).avgProgress || 0,
        },
      };
    } catch (error: any) {
      console.error('Error getting project stats:', error);
      return { success: false, error: error.message };
    }
  });
}
