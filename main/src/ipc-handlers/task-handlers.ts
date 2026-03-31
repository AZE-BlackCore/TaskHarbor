import { ipcMain } from 'electron';
import { taskService } from '../services/taskService';
import { saveDatabase, getDatabase } from '../services/database';
import { generateId } from '../utils/idGenerator';
import { getUTCNow } from '../utils/timestamp';

export async function setupTaskHandlers() {
  // 初始化 TaskService
  await taskService.init();

  // 获取所有任务
  ipcMain.handle('tasks:getAll', async (_, filters) => {
    try {
      const tasks = await taskService.findAll(filters);
      return { success: true, data: tasks };
    } catch (error: any) {
      console.error('Error getting tasks:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取单个任务
  ipcMain.handle('tasks:getById', async (_, id) => {
    try {
      const task = await taskService.findById(id);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }
      return { success: true, data: task };
    } catch (error: any) {
      console.error('Error getting task:', error);
      return { success: false, error: error.message };
    }
  });

  // 创建任务
  ipcMain.handle('tasks:create', async (_, taskData) => {
    try {
      const task = await taskService.createTask(taskData);
      saveDatabase();
      return { success: true, data: task };
    } catch (error: any) {
      console.error('Error creating task:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新任务
  ipcMain.handle('tasks:update', async (_, id, updates) => {
    try {
      const success = await taskService.updateTask(id, updates);
      if (!success) {
        return { success: false, error: 'Task not found or no changes made' };
      }
      saveDatabase();
      return { success: true, message: 'Task updated successfully' };
    } catch (error: any) {
      console.error('Error updating task:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除任务
  ipcMain.handle('tasks:delete', async (_, id) => {
    try {
      const success = await taskService.deleteTask(id);
      if (!success) {
        return { success: false, error: 'Task not found' };
      }
      saveDatabase();
      return { success: true, message: 'Task deleted successfully' };
    } catch (error: any) {
      console.error('Error deleting task:', error);
      return { success: false, error: error.message };
    }
  });

  // 批量删除任务
  ipcMain.handle('tasks:deleteBatch', async (_, ids) => {
    try {
      const count = await taskService.deleteTasks(ids);
      saveDatabase();
      return { success: true, message: `${count} tasks deleted` };
    } catch (error: any) {
      console.error('Error deleting tasks:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取子任务
  ipcMain.handle('subtasks:getByTaskId', async (_, taskId) => {
    try {
      const db = await getDatabase();
      const stmt = db.prepare(
        'SELECT * FROM subtasks WHERE taskId = ? ORDER BY orderIndex'
      );
      stmt.bind([taskId]);
      
      const subtasks: any[] = [];
      while (stmt.step()) {
        subtasks.push(stmt.getAsObject());
      }
      
      return { success: true, data: subtasks };
    } catch (error: any) {
      console.error('Error getting subtasks:', error);
      return { success: false, error: error.message };
    }
  });

  // 创建子任务
  ipcMain.handle('subtasks:create', async (_, subtaskData) => {
    try {
      const db = await getDatabase();
      const id = generateId('subtask');
      const now = getUTCNow();
      
      const stmt = db.prepare(`
        INSERT INTO subtasks (id, taskId, description, completed, orderIndex, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        id,
        subtaskData.taskId,
        subtaskData.description,
        subtaskData.completed ? 1 : 0,
        subtaskData.orderIndex || 0,
        now,
      ]);
      
      saveDatabase();
      
      return { success: true, data: { id, ...subtaskData, createdAt: now } };
    } catch (error: any) {
      console.error('Error creating subtask:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新子任务状态
  ipcMain.handle('subtasks:update', async (_, id, updates) => {
    try {
      const db = await getDatabase();
      const stmt = db.prepare(`
        UPDATE subtasks 
        SET completed = ?, description = COALESCE(?, description)
        WHERE id = ?
      `);
      
      stmt.run([
        updates.completed ? 1 : 0,
        updates.description || null,
        id,
      ]);
      
      saveDatabase();
      
      return { success: true, message: 'Subtask updated' };
    } catch (error: any) {
      console.error('Error updating subtask:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除子任务
  ipcMain.handle('subtasks:delete', async (_, id) => {
    try {
      const db = await getDatabase();
      const stmt = db.prepare('DELETE FROM subtasks WHERE id = ?');
      stmt.run([id]);
      saveDatabase();
      
      return { success: true, message: 'Subtask deleted' };
    } catch (error: any) {
      console.error('Error deleting subtask:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取时间日志
  ipcMain.handle('timelogs:getByTaskId', async (_, taskId) => {
    try {
      const db = await getDatabase();
      const stmt = db.prepare(
        'SELECT * FROM timelogs WHERE taskId = ? ORDER BY startTime DESC'
      );
      stmt.bind([taskId]);
      
      const logs: any[] = [];
      while (stmt.step()) {
        logs.push(stmt.getAsObject());
      }
      
      return { success: true, data: logs };
    } catch (error: any) {
      console.error('Error getting timelogs:', error);
      return { success: false, error: error.message };
    }
  });

  // 创建时间日志（开始计时）
  ipcMain.handle('timelogs:start', async (_, taskId, description) => {
    try {
      const db = await getDatabase();
      const id = generateId('timelog');
      const startTime = getUTCNow();
      
      const stmt = db.prepare(`
        INSERT INTO timelogs (id, taskId, startTime, description, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run([id, taskId, startTime, description || null, startTime]);
      saveDatabase();
      
      return { success: true, data: { id, taskId, startTime } };
    } catch (error: any) {
      console.error('Error starting timelog:', error);
      return { success: false, error: error.message };
    }
  });

  // 停止时间日志
  ipcMain.handle('timelogs:stop', async (_, id) => {
    try {
      const db = await getDatabase();
      const endTime = new Date().toISOString();
      
      // 获取开始时间
      const getStmt = db.prepare('SELECT startTime FROM timelogs WHERE id = ?');
      getStmt.bind([id]);
      
      let log = null;
      if (getStmt.step()) {
        log = getStmt.getAsObject();
      }
      
      if (!log) {
        return { success: false, error: 'Timelog not found' };
      }
      
      const startTime = new Date((log as any).startTime);
      const durationSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      
      const stmt = db.prepare(`
        UPDATE timelogs 
        SET endTime = ?, durationSeconds = ?
        WHERE id = ?
      `);
      
      stmt.run([endTime, durationSeconds, id]);
      saveDatabase();
      
      return { success: true, data: { endTime, durationSeconds } };
    } catch (error: any) {
      console.error('Error stopping timelog:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取任务依赖
  ipcMain.handle('dependencies:getByTaskId', async (_, taskId) => {
    try {
      const db = await getDatabase();
      const stmt = db.prepare(`
        SELECT td.*, t.description as dependencyDescription
        FROM task_dependencies td
        JOIN tasks t ON td.dependencyTaskId = t.id
        WHERE td.taskId = ?
      `);
      stmt.bind([taskId]);
      
      const dependencies: any[] = [];
      while (stmt.step()) {
        dependencies.push(stmt.getAsObject());
      }
      
      return { success: true, data: dependencies };
    } catch (error: any) {
      console.error('Error getting dependencies:', error);
      return { success: false, error: error.message };
    }
  });

  // 创建任务依赖
  ipcMain.handle('dependencies:create', async (_, taskId, dependencyTaskId, type) => {
    try {
      const db = await getDatabase();
      const id = generateId('dep');
      const now = getUTCNow();
      
      const stmt = db.prepare(`
        INSERT INTO task_dependencies (id, taskId, dependencyTaskId, type, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run([id, taskId, dependencyTaskId, type || 'finish-to-start', now]);
      saveDatabase();
      
      return { success: true, message: 'Dependency created' };
    } catch (error: any) {
      console.error('Error creating dependency:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除任务依赖
  ipcMain.handle('dependencies:delete', async (_, id) => {
    try {
      const db = await getDatabase();
      const stmt = db.prepare('DELETE FROM task_dependencies WHERE id = ?');
      stmt.run([id]);
      saveDatabase();
      
      return { success: true, message: 'Dependency deleted' };
    } catch (error: any) {
      console.error('Error deleting dependency:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取任务标签
  ipcMain.handle('tags:getByTaskId', async (_, taskId) => {
    try {
      const db = await getDatabase();
      const stmt = db.prepare(
        'SELECT * FROM task_tags WHERE taskId = ?'
      );
      stmt.bind([taskId]);
      
      const tags: any[] = [];
      while (stmt.step()) {
        tags.push(stmt.getAsObject());
      }
      
      return { success: true, data: tags };
    } catch (error: any) {
      console.error('Error getting tags:', error);
      return { success: false, error: error.message };
    }
  });

  // 添加任务标签
  ipcMain.handle('tags:add', async (_, taskId, tagName, tagColor) => {
    try {
      const db = await getDatabase();
      const id = generateId('tag');
      const now = getUTCNow();
      
      const stmt = db.prepare(`
        INSERT INTO task_tags (id, taskId, tagName, tagColor, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run([id, taskId, tagName, tagColor || '#3B82F6', now]);
      saveDatabase();
      
      return { success: true, message: 'Tag added' };
    } catch (error: any) {
      console.error('Error adding tag:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除任务标签
  ipcMain.handle('tags:delete', async (_, id) => {
    try {
      const db = await getDatabase();
      const stmt = db.prepare('DELETE FROM task_tags WHERE id = ?');
      stmt.run([id]);
      saveDatabase();
      
      return { success: true, message: 'Tag deleted' };
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      return { success: false, error: error.message };
    }
  });
}
