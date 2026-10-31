/**
 * mobile/notifications —— 本地通知提醒（FR-08，离线可用）
 * 扫描未来 24 小时内的日程，按 reminder 分钟提前排程；单次上限 30 条留余量。
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import type { Schedule } from '../../../core/src/domain/types';
import type { SqlRepository } from '../../../core/src/repository/sql-repository';

const MAX_NOTIFICATIONS = 30;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      return req.display === 'granted';
    }
    return true;
  } catch {
    return false;
  }
}

export async function scheduleReminders(repo: SqlRepository): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0;
  const granted = await ensureNotificationPermission();
  if (!granted) return 0;

  const now = Date.now();
  const horizon = now + 24 * 60 * 60 * 1000;
  const schedules = await repo.entities.list<Schedule>('schedules', {
    where: 'deletedAt IS NULL',
    orderBy: 'startTime ASC',
    limit: 200,
  });

  const pending = await LocalNotifications.getPending();
  if (pending.notifications?.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }

  const items = schedules
    .filter((s) => {
      const t = new Date(s.startTime).getTime();
      return !s.completed && t >= now && t <= horizon;
    })
    .slice(0, MAX_NOTIFICATIONS)
    .map((s, idx) => {
      const start = new Date(s.startTime).getTime();
      const lead = (s.reminder ?? 15) * 60 * 1000;
      return {
        id: Math.abs(hashCode(s.id)) % 1_000_000 + idx,
        title: s.title,
        body: `${new Date(s.startTime).toTimeString().slice(0, 5)}${s.location ? ` · ${s.location}` : ''}`,
        schedule: { at: new Date(Math.max(now + 1000, start - lead)) },
        extra: { scheduleId: s.id },
      };
    });

  if (!items.length) return 0;
  try {
    await LocalNotifications.schedule({ notifications: items });
  } catch {
    return 0;
  }
  return items.length;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
