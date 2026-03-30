/**
 * 数据库迁移脚本 - 添加软删除支持
 * 
 * 使用方法：
 * 1. 备份现有数据库
 * 2. 运行此脚本添加 deletedAt 字段
 * 3. 创建 tasks_active 和 projects_active 视图
 */

import { getDatabase, saveDatabase } from './database';

export async function addSoftDeleteSupport() {
  try {
    const db = await getDatabase();
    
    console.log('[Migration] Adding soft delete support...');
    
    // 为 tasks 表添加 deletedAt 字段
    try {
      db.run(`
        ALTER TABLE tasks ADD COLUMN deletedAt TEXT DEFAULT NULL
      `);
      console.log('[Migration] Added deletedAt to tasks table');
    } catch (error: any) {
      if (error.message.includes('duplicate column')) {
        console.log('[Migration] tasks.deletedAt already exists');
      } else {
        throw error;
      }
    }
    
    // 为 projects 表添加 deletedAt 字段
    try {
      db.run(`
        ALTER TABLE projects ADD COLUMN deletedAt TEXT DEFAULT NULL
      `);
      console.log('[Migration] Added deletedAt to projects table');
    } catch (error: any) {
      if (error.message.includes('duplicate column')) {
        console.log('[Migration] projects.deletedAt already exists');
      } else {
        throw error;
      }
    }
    
    // 为 subtasks 表添加 deletedAt 字段
    try {
      db.run(`
        ALTER TABLE subtasks ADD COLUMN deletedAt TEXT DEFAULT NULL
      `);
      console.log('[Migration] Added deletedAt to subtasks table');
    } catch (error: any) {
      if (error.message.includes('duplicate column')) {
        console.log('[Migration] subtasks.deletedAt already exists');
      } else {
        throw error;
      }
    }
    
    // 删除旧的视图（如果存在）
    try {
      db.run(`DROP VIEW IF EXISTS tasks_active`);
      db.run(`DROP VIEW IF EXISTS projects_active`);
      db.run(`DROP VIEW IF EXISTS subtasks_active`);
    } catch (error) {
      // 忽略删除视图的错误
    }
    
    // 创建活动记录视图（自动过滤已删除的）
    db.run(`
      CREATE VIEW IF NOT EXISTS tasks_active AS
      SELECT * FROM tasks WHERE deletedAt IS NULL
    `);
    console.log('[Migration] Created view tasks_active');
    
    db.run(`
      CREATE VIEW IF NOT EXISTS projects_active AS
      SELECT * FROM projects WHERE deletedAt IS NULL
    `);
    console.log('[Migration] Created view projects_active');
    
    db.run(`
      CREATE VIEW IF NOT EXISTS subtasks_active AS
      SELECT * FROM subtasks WHERE deletedAt IS NULL
    `);
    console.log('[Migration] Created view subtasks_active');
    
    // 保存数据库
    saveDatabase();
    
    console.log('[Migration] Soft delete support added successfully!');
    
    return {
      success: true,
      message: 'Soft delete support added successfully',
    };
  } catch (error: any) {
    console.error('[Migration] Error adding soft delete support:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 恢复已删除的记录
 */
export async function restoreDeletedRecord(
  table: string,
  id: string
): Promise<boolean> {
  try {
    const db = await getDatabase();
    
    const stmt = db.prepare(`
      UPDATE ${table} SET deletedAt = NULL WHERE id = ?
    `);
    stmt.run([id]);
    saveDatabase();
    
    console.log(`[Migration] Restored ${table} record: ${id}`);
    return true;
  } catch (error: any) {
    console.error(`[Migration] Error restoring ${table} record:`, error);
    return false;
  }
}

/**
 * 永久删除已软删除的记录（谨慎使用！）
 */
export async function permanentlyDeleteRecord(
  table: string,
  id: string
): Promise<boolean> {
  try {
    const db = await getDatabase();
    
    // 先检查是否已删除
    const checkStmt = db.prepare(`
      SELECT deletedAt FROM ${table} WHERE id = ?
    `);
    checkStmt.bind([id]);
    
    if (!checkStmt.step()) {
      console.log(`[Migration] Record ${id} not found in ${table}`);
      return false;
    }
    
    const row = checkStmt.getAsObject() as any;
    if (!row.deletedAt) {
      console.log(`[Migration] Record ${id} is not deleted in ${table}`);
      return false;
    }
    
    // 执行物理删除
    const deleteStmt = db.prepare(`
      DELETE FROM ${table} WHERE id = ?
    `);
    deleteStmt.run([id]);
    saveDatabase();
    
    console.log(`[Migration] Permanently deleted ${table} record: ${id}`);
    return true;
  } catch (error: any) {
    console.error(`[Migration] Error permanently deleting ${table} record:`, error);
    return false;
  }
}

/**
 * 清理所有已软删除超过指定天数的记录
 * @param days 天数，默认 30 天
 */
export async function cleanupOldDeletedRecords(days: number = 30): Promise<{
  cleaned: number;
  tables: string[];
}> {
  try {
    const db = await getDatabase();
    const tables = ['tasks', 'projects', 'subtasks'];
    let totalCleaned = 0;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString();
    
    for (const table of tables) {
      // 查询符合条件的记录数
      const countStmt = db.prepare(`
        SELECT COUNT(*) as count FROM ${table} 
        WHERE deletedAt IS NOT NULL AND deletedAt < ?
      `);
      countStmt.bind([cutoffDateStr]);
      
      if (countStmt.step()) {
        const row = countStmt.getAsObject() as any;
        const count = row.count;
        
        if (count > 0) {
          // 删除旧记录
          const deleteStmt = db.prepare(`
            DELETE FROM ${table} 
            WHERE deletedAt IS NOT NULL AND deletedAt < ?
          `);
          deleteStmt.run([cutoffDateStr]);
          
          totalCleaned += count;
          console.log(`[Migration] Cleaned ${count} old deleted records from ${table}`);
        }
      }
    }
    
    saveDatabase();
    
    console.log(`[Migration] Total cleaned: ${totalCleaned} records`);
    
    return {
      cleaned: totalCleaned,
      tables,
    };
  } catch (error: any) {
    console.error('[Migration] Error cleaning up old deleted records:', error);
    return {
      cleaned: 0,
      tables: [],
    };
  }
}
