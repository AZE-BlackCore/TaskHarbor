/**
 * ReminderService - 任务提醒调度服务
 *
 * 支持的提醒周期:
 *  - once    : 仅一次，到时触发后自动 enabled=0
 *  - daily   : 每天同一时刻
 *  - weekly  : 每周同一天同一时刻
 *  - monthly : 每月同一天同一时刻
 *  - custom  : 自定义间隔 (intervalDays + intervalHours) 或每日多时间点 (customTimes)
 */

import { getDatabase, saveDatabase } from './database';
import { notificationService } from './notification';

export interface TaskReminder {
  id: string;
  taskId: string;
  reminderTime: string;        // ISO - 基准/首次提醒时间
  cycle: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  intervalDays: number;        // custom 模式：间隔天数
  intervalHours: number;       // custom 模式：间隔小时
  customTimes?: string;        // 每日固定时间点，逗号分隔 "09:00,14:00"
  lastFiredAt?: string;        // 上次触发 ISO
  nextFireAt?: string;         // 下次触发 ISO（预计算）
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderInput {
  taskId: string;
  reminderTime: string;
  cycle: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  intervalDays?: number;
  intervalHours?: number;
  customTimes?: string;
}

// ─────────────────────────────────────────────
// 工具函数：计算下次触发时间
// ─────────────────────────────────────────────
export function calcNextFireAt(
  baseTime: string,
  cycle: string,
  intervalDays: number,
  intervalHours: number,
  customTimes: string | null | undefined
): string {
  const now = new Date();
  const base = new Date(baseTime);

  if (cycle === 'once') {
    // 仅一次：直接返回基准时间（如果已过则不再触发，返回空标记）
    return base > now ? base.toISOString() : '';
  }

  if (cycle === 'custom' && customTimes) {
    // 每日多时间点：找最近的下一个时间点
    const times = customTimes.split(',').map(t => t.trim()).filter(Boolean);
    const candidates: Date[] = [];
    for (const t of times) {
      const [h, m] = t.split(':').map(Number);
      const candidate = new Date();
      candidate.setHours(h, m, 0, 0);
      if (candidate <= now) {
        candidate.setDate(candidate.getDate() + 1); // 推到明天同一时刻
      }
      candidates.push(candidate);
    }
    if (candidates.length === 0) return '';
    return candidates.sort((a, b) => a.getTime() - b.getTime())[0].toISOString();
  }

  if (cycle === 'custom' && (intervalDays > 0 || intervalHours > 0)) {
    // 自定义间隔：从 base 起每隔 N 天 M 小时
    const intervalMs = (intervalDays * 24 * 60 + intervalHours * 60) * 60 * 1000;
    if (intervalMs <= 0) return '';
    let next = new Date(base.getTime());
    while (next <= now) {
      next = new Date(next.getTime() + intervalMs);
    }
    return next.toISOString();
  }

  if (cycle === 'daily') {
    const next = new Date(base);
    next.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  if (cycle === 'weekly') {
    const targetDay = base.getDay(); // 0=Sun … 6=Sat
    const next = new Date(base);
    next.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = (targetDay - now.getDay() + 7) % 7 || 7;
    next.setDate(now.getDate() + diff);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    if (next <= now) next.setDate(next.getDate() + 7);
    return next.toISOString();
  }

  if (cycle === 'monthly') {
    const targetDay = base.getDate();
    const next = new Date(now.getFullYear(), now.getMonth(), targetDay,
      base.getHours(), base.getMinutes(), 0, 0);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
    return next.toISOString();
  }

  return base.toISOString();
}

// ─────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────

export async function createReminder(input: CreateReminderInput): Promise<TaskReminder> {
  const db = await getDatabase();
  const id = `rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const intervalDays = input.intervalDays ?? 0;
  const intervalHours = input.intervalHours ?? 0;
  const nextFireAt = calcNextFireAt(
    input.reminderTime, input.cycle, intervalDays, intervalHours, input.customTimes
  );

  db.run(`
    INSERT INTO task_reminders (
      id, taskId, reminderTime, cycle, intervalDays, intervalHours,
      customTimes, nextFireAt, enabled, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [
    id, input.taskId, input.reminderTime, input.cycle,
    intervalDays, intervalHours,
    input.customTimes ?? null,
    nextFireAt || null,
    now, now
  ]);

  saveDatabase();
  return getReminderById(id);
}

export async function getReminderById(id: string): Promise<TaskReminder> {
  const db = await getDatabase();
  const stmt = db.prepare('SELECT * FROM task_reminders WHERE id = ?');
  stmt.bind([id]);
  if (!stmt.step()) throw new Error('Reminder not found');
  return rowToReminder(stmt.getAsObject());
}

export async function getRemindersByTask(taskId: string): Promise<TaskReminder[]> {
  const db = await getDatabase();
  const stmt = db.prepare('SELECT * FROM task_reminders WHERE taskId = ? ORDER BY reminderTime ASC');
  stmt.bind([taskId]);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  return rows.map(rowToReminder);
}

export async function updateReminder(
  id: string,
  updates: Partial<Omit<CreateReminderInput, 'taskId'>>
): Promise<TaskReminder> {
  const existing = await getReminderById(id);
  const merged = { ...existing, ...updates };
  const nextFireAt = calcNextFireAt(
    merged.reminderTime, merged.cycle,
    merged.intervalDays ?? 0, merged.intervalHours ?? 0, merged.customTimes
  );

  const db = await getDatabase();
  db.run(`
    UPDATE task_reminders SET
      reminderTime = ?, cycle = ?, intervalDays = ?, intervalHours = ?,
      customTimes = ?, nextFireAt = ?, updatedAt = ?
    WHERE id = ?
  `, [
    merged.reminderTime, merged.cycle,
    merged.intervalDays ?? 0, merged.intervalHours ?? 0,
    merged.customTimes ?? null,
    nextFireAt || null,
    new Date().toISOString(), id
  ]);

  saveDatabase();
  return getReminderById(id);
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM task_reminders WHERE id = ?', [id]);
  saveDatabase();
}

export async function deleteRemindersByTask(taskId: string): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM task_reminders WHERE taskId = ?', [taskId]);
  saveDatabase();
}

// ─────────────────────────────────────────────
// 调度器
// ─────────────────────────────────────────────

let schedulerTimer: NodeJS.Timeout | null = null;

/**
 * 启动提醒调度器，每 60 秒扫描一次 nextFireAt <= now 的提醒并触发通知
 */
export function startReminderScheduler(
  getTaskName: (taskId: string) => Promise<string | null>
) {
  if (schedulerTimer) clearInterval(schedulerTimer);

  const tick = async () => {
    try {
      const db = await getDatabase();
      const now = new Date().toISOString();

      // 查找所有 enabled=1 且 nextFireAt <= now 的提醒
      const stmt = db.prepare(`
        SELECT tr.*, t.description AS taskName
        FROM task_reminders tr
        LEFT JOIN tasks t ON tr.taskId = t.id
        WHERE tr.enabled = 1
          AND tr.nextFireAt IS NOT NULL
          AND tr.nextFireAt != ''
          AND tr.nextFireAt <= ?
      `);
      stmt.bind([now]);

      const due: any[] = [];
      while (stmt.step()) due.push(stmt.getAsObject());
      stmt.free();

      for (const row of due) {
        const taskName = row.taskName || await getTaskName(row.taskId) || '未知任务';

        // 发送系统通知
        await notificationService.send({
          title: '⏰ 任务提醒',
          body: `任务「${taskName}」提醒到期`,
        });

        // 更新 lastFiredAt 和 nextFireAt
        const next = calcNextFireAt(
          row.reminderTime, row.cycle,
          Number(row.intervalDays), Number(row.intervalHours), row.customTimes
        );
        const nowStr = new Date().toISOString();

        if (row.cycle === 'once' || !next) {
          // 一次性提醒或无下次 → 禁用
          db.run(`
            UPDATE task_reminders SET enabled = 0, lastFiredAt = ?, nextFireAt = NULL, updatedAt = ?
            WHERE id = ?
          `, [nowStr, nowStr, row.id]);
        } else {
          db.run(`
            UPDATE task_reminders SET lastFiredAt = ?, nextFireAt = ?, updatedAt = ?
            WHERE id = ?
          `, [nowStr, next, nowStr, row.id]);
        }
      }

      if (due.length > 0) saveDatabase();
    } catch (err) {
      console.error('[ReminderScheduler] tick error:', err);
    }
  };

  // 立即执行一次，然后每 60 秒
  tick();
  schedulerTimer = setInterval(tick, 60_000);
  console.log('[ReminderScheduler] started');
}

export function stopReminderScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('[ReminderScheduler] stopped');
  }
}

// ─────────────────────────────────────────────
// 辅助
// ─────────────────────────────────────────────
function rowToReminder(row: any): TaskReminder {
  return {
    id: row.id,
    taskId: row.taskId,
    reminderTime: row.reminderTime,
    cycle: row.cycle as TaskReminder['cycle'],
    intervalDays: Number(row.intervalDays ?? 0),
    intervalHours: Number(row.intervalHours ?? 0),
    customTimes: row.customTimes ?? undefined,
    lastFiredAt: row.lastFiredAt ?? undefined,
    nextFireAt: row.nextFireAt ?? undefined,
    enabled: row.enabled === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
