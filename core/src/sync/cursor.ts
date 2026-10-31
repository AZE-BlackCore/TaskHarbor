/**
 * core/sync/cursor —— 复合游标（updatedAt + id）
 * 仅用时间戳会在同一毫秒内多条记录时丢失边界数据（设计文档 4.3）
 */

import type { ChangeRecord, Cursor } from '../domain/types';

export const EMPTY_CURSOR: Cursor = { ts: null, id: null };

export function cursorFromChange(c: ChangeRecord): Cursor {
  return { ts: c.updatedAt, id: c.id };
}

/** a > b ? */
export function cursorGreater(a: Cursor, b: Cursor): boolean {
  if (a.ts == null) return false;
  if (b.ts == null) return true;
  if (a.ts !== b.ts) return a.ts > b.ts;
  return (a.id ?? '') > (b.id ?? '');
}

export function maxCursor(a: Cursor, b: Cursor): Cursor {
  return cursorGreater(a, b) ? a : b;
}

export function cursorEquals(a: Cursor, b: Cursor): boolean {
  return a.ts === b.ts && a.id === b.id;
}
