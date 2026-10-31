/**
 * core/repository/sql-repository —— Repository 的通用 SQL 实现（OS 无关）
 *
 * 方言约束（设计文档 4.8）：
 *   - 不使用 CTE / RETURNING / 带冲突目标的 UPSERT
 *   - upsert = 先 UPDATE，影响 0 行再 INSERT，调用方需包事务
 *   - 所有删除均为软删除（写 deletedAt），禁止物理 DELETE
 */

import type {
  ChangeRecord,
  ConflictRecord,
  Cursor,
  OutboxItem,
} from '../domain/types';
import type {
  EntityRepository,
  SqlDriver,
  SyncRepository,
} from './types';

const MAX_BACKOFF_MS = 15 * 60 * 1000; // 指数退避上限 15min（非功能需求）

export function nowIso(d: Date = new Date()): string {
  return d.toISOString();
}

export function backoffMs(retryCount: number): number {
  const base = 1000 * Math.pow(2, Math.min(retryCount, 10));
  return Math.min(base, MAX_BACKOFF_MS);
}

function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));
}

export class SqlRepository implements SyncRepository, EntityRepository {
  private columnCache = new Map<string, string[]>();

  constructor(
    private driver: SqlDriver,
    private opts: { deviceId: string; newId: () => string }
  ) {}

  // ---------------------------------------------------------------- 基础设施

  async applySchema(schemaSql: string): Promise<void> {
    await this.driver.exec(splitStatements(schemaSql));
  }

  /** 暴露底层驱动（供平台层做健康检查 / 关闭连接） */
  getDriver(): SqlDriver {
    return this.driver;
  }

  /** 便捷访问：同步仓储（本类自身即实现） */
  get sync(): SyncRepository {
    return this;
  }

  /** 便捷访问：实体仓储（本类自身即实现） */
  get entities(): EntityRepository {
    return this;
  }

  /** 待同步条目数（FR-10：UI 常驻展示） */
  async syncCount(): Promise<number> {
    return this.countPending();
  }

  /** 未处理冲突数 */
  async conflictCount(): Promise<number> {
    const list = await this.listConflicts(true);
    return list.length;
  }

  async applyMigration(migrationSql: string): Promise<void> {
    // 迁移脚本单条失败属预期（列已存在），执行器内部需 catch
    await this.driver.exec(splitStatements(migrationSql));
  }

  private async columns(table: string): Promise<string[]> {
    const cached = this.columnCache.get(table);
    if (cached) return cached;
    const rows = await this.driver.query<{ name: string }>(`PRAGMA table_info(${table})`);
    const cols = rows.map((r) => r.name);
    this.columnCache.set(table, cols);
    return cols;
  }

  // ------------------------------------------------------------------- 元数据

  async getMeta(key: string): Promise<string | null> {
    const rows = await this.driver.query<{ value: string }>(
      'SELECT value FROM _sync_meta WHERE key = ?',
      [key]
    );
    return rows.length ? rows[0].value : null;
  }

  async setMeta(key: string, value: string): Promise<void> {
    const ts = nowIso();
    const { changes } = await this.driver.run(
      'UPDATE _sync_meta SET value = ?, updatedAt = ? WHERE key = ?',
      [value, ts, key]
    );
    if (changes === 0) {
      await this.driver.run(
        'INSERT INTO _sync_meta (key, value, updatedAt) VALUES (?, ?, ?)',
        [key, value, ts]
      );
    }
  }

  // --------------------------------------------------------------------- 游标

  async getCursor(table: string): Promise<Cursor> {
    const rows = await this.driver.query<{ cursorTs: string | null; cursorId: string | null }>(
      'SELECT cursorTs, cursorId FROM _sync_state WHERE tableName = ?',
      [table]
    );
    return rows.length ? { ts: rows[0].cursorTs, id: rows[0].cursorId } : { ts: null, id: null };
  }

  async setCursor(table: string, cursor: Cursor): Promise<void> {
    const ts = nowIso();
    const { changes } = await this.driver.run(
      'UPDATE _sync_state SET cursorTs = ?, cursorId = ?, updatedAt = ? WHERE tableName = ?',
      [cursor.ts, cursor.id, ts, table]
    );
    if (changes === 0) {
      await this.driver.run(
        'INSERT INTO _sync_state (tableName, cursorTs, cursorId, updatedAt) VALUES (?, ?, ?, ?)',
        [table, cursor.ts, cursor.id, ts]
      );
    }
  }

  async getAllCursors(tables: string[]): Promise<Record<string, Cursor>> {
    const out: Record<string, Cursor> = {};
    for (const t of tables) out[t] = await this.getCursor(t);
    return out;
  }

  // ----------------------------------------------------------------- 变更扫描

  async readChanges(table: string, since: Cursor, limit: number): Promise<ChangeRecord[]> {
    const cols = await this.columns(table);
    const selectCols = cols.length ? cols.map((c) => c).join(', ') : '*';
    let sql: string;
    let params: unknown[];
    if (since.ts == null) {
      sql = `SELECT ${selectCols} FROM ${table} ORDER BY updatedAt ASC, id ASC LIMIT ?`;
      params = [limit];
    } else {
      // 复合游标：同毫秒内靠 id 推进，避免边界丢数据
      sql =
        `SELECT ${selectCols} FROM ${table} ` +
        `WHERE (updatedAt > ? OR (updatedAt = ? AND id > ?)) ` +
        `ORDER BY updatedAt ASC, id ASC LIMIT ?`;
      params = [since.ts, since.ts, since.id ?? '', limit];
    }
    const rows = await this.driver.query<Record<string, unknown>>(sql, params);
    return rows.map((row) => this.rowToChange(table, row));
  }

  private rowToChange(table: string, row: Record<string, unknown>): ChangeRecord {
    const id = String(row.id);
    const updatedAt = String(row.updatedAt ?? '');
    const deletedAt = row.deletedAt == null ? null : String(row.deletedAt);
    const originDeviceId = row.originDeviceId == null ? null : String(row.originDeviceId);
    const payload: Record<string, unknown> = { ...row };
    return {
      table,
      op: deletedAt ? 'delete' : 'upsert',
      id,
      updatedAt,
      deletedAt,
      originDeviceId,
      payload,
    };
  }

  // --------------------------------------------------------------- 幂等写入

  async upsertRecord(table: string, record: ChangeRecord): Promise<void> {
    const cols = await this.columns(table);
    if (!cols.length) throw new Error(`unknown table: ${table}`);
    const data = (record.payload ?? {}) as Record<string, unknown>;
    const payload: Record<string, unknown> = {
      ...data,
      id: record.id,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt ?? null,
      originDeviceId: record.originDeviceId ?? this.opts.deviceId,
    };
    const keys = Object.keys(payload).filter((k) => cols.includes(k));
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const values = keys.map((k) => payload[k]);

    const { changes } = await this.driver.run(
      `UPDATE ${table} SET ${setClause} WHERE id = ?`,
      [...values, record.id]
    );
    if (changes === 0) {
      const insertCols = keys.join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      await this.driver.run(
        `INSERT INTO ${table} (${insertCols}) VALUES (${placeholders})`,
        values
      );
    }
  }

  async softDeleteRecord(table: string, id: string, at: string): Promise<void> {
    const { changes } = await this.driver.run(
      `UPDATE ${table} SET deletedAt = ?, updatedAt = ? WHERE id = ?`,
      [at, at, id]
    );
    if (changes === 0) {
      // 本地不存在该记录（可能尚未同步下来）：仍登记墓碑，保证删除意图不丢
      await this.driver.run(
        `INSERT INTO ${table} (id, updatedAt, deletedAt, originDeviceId) VALUES (?, ?, ?, ?)`,
        [id, at, at, this.opts.deviceId]
      );
    }
  }

  // ------------------------------------------------------------------ Outbox

  async enqueue(
    item: Omit<OutboxItem, 'id' | 'createdAt' | 'updatedAt' | 'state' | 'retryCount'>
  ): Promise<void> {
    const ts = nowIso();
    await this.driver.run(
      `INSERT INTO _outbox (id, tableName, op, recordId, payload, state, retryCount, lastError, nextRetryAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'pending', 0, NULL, NULL, ?, ?)`,
      [this.opts.newId(), item.tableName, item.op, item.recordId, item.payload, ts, ts]
    );
  }

  async takePending(limit: number): Promise<OutboxItem[]> {
    const ts = nowIso();
    const rows = await this.driver.query<Record<string, unknown>>(
      `SELECT * FROM _outbox
       WHERE state IN ('pending', 'failed') AND (nextRetryAt IS NULL OR nextRetryAt <= ?)
       ORDER BY createdAt ASC LIMIT ?`,
      [ts, limit]
    );
    return rows.map(this.mapOutbox);
  }

  async markSending(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const ts = nowIso();
    await this.driver.run(
      `UPDATE _outbox SET state = 'sending', updatedAt = ? WHERE id IN (${placeholders(ids.length)})`,
      [ts, ...ids]
    );
  }

  async markDone(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const ts = nowIso();
    await this.driver.run(
      `UPDATE _outbox SET state = 'done', updatedAt = ?, lastError = NULL WHERE id IN (${placeholders(ids.length)})`,
      [ts, ...ids]
    );
  }

  async markFailed(ids: string[], error: string): Promise<void> {
    if (!ids.length) return;
    const ts = nowIso();
    for (const id of ids) {
      const rows = await this.driver.query<{ retryCount: number }>(
        'SELECT retryCount FROM _outbox WHERE id = ?',
        [id]
      );
      const retryCount = (rows[0]?.retryCount ?? 0) + 1;
      const next = new Date(Date.now() + backoffMs(retryCount)).toISOString();
      await this.driver.run(
        `UPDATE _outbox SET state = 'failed', retryCount = ?, lastError = ?, nextRetryAt = ?, updatedAt = ? WHERE id = ?`,
        [retryCount, error, next, ts, id]
      );
    }
  }

  async countPending(): Promise<number> {
    const rows = await this.driver.query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM _outbox WHERE state IN ('pending', 'failed')`
    );
    return rows[0]?.n ?? 0;
  }

  async purgeDone(olderThanIso: string): Promise<void> {
    await this.driver.run(
      `DELETE FROM _outbox WHERE state = 'done' AND updatedAt < ?`,
      [olderThanIso]
    );
  }

  private mapOutbox(row: Record<string, unknown>): OutboxItem {
    return {
      id: String(row.id),
      tableName: String(row.tableName),
      op: row.op as OutboxItem['op'],
      recordId: String(row.recordId),
      payload: row.payload == null ? null : String(row.payload),
      state: row.state as OutboxItem['state'],
      retryCount: Number(row.retryCount ?? 0),
      lastError: row.lastError == null ? null : String(row.lastError),
      nextRetryAt: row.nextRetryAt == null ? null : String(row.nextRetryAt),
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
    };
  }

  // ----------------------------------------------------------------- 冲突表

  async addConflict(
    c: Omit<ConflictRecord, 'id' | 'createdAt' | 'resolved'>
  ): Promise<void> {
    await this.driver.run(
      `INSERT INTO _sync_conflicts (id, tableName, recordId, localPayload, remotePayload, localUpdatedAt, remoteUpdatedAt, kind, resolved, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        this.opts.newId(),
        c.tableName,
        c.recordId,
        c.localPayload,
        c.remotePayload,
        c.localUpdatedAt,
        c.remoteUpdatedAt,
        c.kind,
        nowIso(),
      ]
    );
  }

  async listConflicts(onlyUnresolved: boolean): Promise<ConflictRecord[]> {
    const sql = onlyUnresolved
      ? 'SELECT * FROM _sync_conflicts WHERE resolved = 0 ORDER BY createdAt DESC'
      : 'SELECT * FROM _sync_conflicts ORDER BY createdAt DESC';
    const rows = await this.driver.query<Record<string, unknown>>(sql);
    return rows.map((r) => ({
      id: String(r.id),
      tableName: String(r.tableName),
      recordId: String(r.recordId),
      localPayload: r.localPayload == null ? null : String(r.localPayload),
      remotePayload: r.remotePayload == null ? null : String(r.remotePayload),
      localUpdatedAt: r.localUpdatedAt == null ? null : String(r.localUpdatedAt),
      remoteUpdatedAt: r.remoteUpdatedAt == null ? null : String(r.remoteUpdatedAt),
      kind: (r.kind as ConflictRecord['kind']) ?? 'lww',
      resolved: Number(r.resolved ?? 0) === 1,
      createdAt: String(r.createdAt),
    }));
  }

  async resolveConflict(id: string): Promise<void> {
    await this.driver.run('UPDATE _sync_conflicts SET resolved = 1 WHERE id = ?', [id]);
  }

  // ------------------------------------------------------------ 实体 CRUD

  async list<T>(
    table: string,
    opts: { where?: string; params?: unknown[]; orderBy?: string; limit?: number } = {}
  ): Promise<T[]> {
    const where = opts.where ? ` WHERE ${opts.where}` : '';
    const order = opts.orderBy ? ` ORDER BY ${opts.orderBy}` : '';
    const limit = opts.limit ? ` LIMIT ${Number(opts.limit)}` : '';
    return this.driver.query<T>(
      `SELECT * FROM ${table}${where}${order}${limit}`,
      opts.params ?? []
    );
  }

  async getById<T>(table: string, id: string): Promise<T | null> {
    const rows = await this.driver.query<T>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return rows.length ? rows[0] : null;
  }

  async create(table: string, record: Record<string, unknown>): Promise<void> {
    const cols = await this.columns(table);
    const ts = nowIso();
    const payload: Record<string, unknown> = {
      ...record,
      id: record.id ?? this.opts.newId(),
      createdAt: record.createdAt ?? ts,
      updatedAt: ts,
      deletedAt: null,
      originDeviceId: this.opts.deviceId,
    };
    const keys = Object.keys(payload).filter((k) => cols.includes(k));
    await this.driver.run(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      keys.map((k) => payload[k])
    );
    // 入 Outbox（FR-09：本地写立即入队）
    await this.enqueue({
      tableName: table,
      op: 'upsert',
      recordId: String(payload.id),
      payload: JSON.stringify(payload),
    });
  }

  async update(table: string, id: string, patch: Record<string, unknown>): Promise<void> {
    const cols = await this.columns(table);
    const ts = nowIso();
    const data: Record<string, unknown> = {
      ...patch,
      updatedAt: ts,
      originDeviceId: this.opts.deviceId,
    };
    const keys = Object.keys(data).filter((k) => cols.includes(k) && k !== 'id');
    await this.driver.run(
      `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
      [...keys.map((k) => data[k]), id]
    );
    const row = await this.getById<Record<string, unknown>>(table, id);
    await this.enqueue({
      tableName: table,
      op: 'upsert',
      recordId: id,
      payload: JSON.stringify(row ?? { id, ...data }),
    });
  }

  async softDelete(table: string, id: string): Promise<void> {
    const ts = nowIso();
    await this.softDeleteRecord(table, id, ts);
    await this.enqueue({ tableName: table, op: 'delete', recordId: id, payload: null });
  }

  async count(table: string, where?: string, params: unknown[] = []): Promise<number> {
    const w = where ? ` WHERE ${where}` : '';
    const rows = await this.driver.query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${table}${w}`,
      params
    );
    return rows[0]?.n ?? 0;
  }
}

function placeholders(n: number): string {
  return Array.from({ length: n }, () => '?').join(', ');
}
