/**
 * platform/driver-capacitor —— Repository 的移动端实现（原生 SQLite）
 *
 * 方言硬约束（设计文档 4.8）：
 *   1. 禁止 CTE（WITH）与 RETURNING
 *   2. 禁止带冲突目标的 UPSERT —— 一律「先 UPDATE，0 行再 INSERT」（由 SqlRepository 实现）
 *   3. 写操作必须包事务
 * 插件主版本必须与 Capacitor 主版本一致：Capacitor 8 → @capacitor-community/sqlite@^8
 */

import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { SqlDriver } from '../../../core/src/repository/types';

export interface CapacitorDriverOptions {
  databaseName?: string;
  encrypted?: boolean;
  log?: (msg: string) => void;
}

export async function createCapacitorDriver(
  opts: CapacitorDriverOptions = {}
): Promise<SqlDriver> {
  const name = opts.databaseName ?? 'taskharbor';
  const log = opts.log ?? (() => {});
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const conn: SQLiteDBConnection = await sqlite.createConnection(
    name,
    opts.encrypted ?? false,
    'no-encryption',
    1,
    false
  );
  await conn.open();

  return {
    async exec(statements: string[]) {
      for (const stmt of statements) {
        try {
          await conn.execute(stmt);
        } catch (e) {
          // 建表/迁移单条失败属预期（列已存在、索引已存在），记录但不中断
          log(`[capacitor-driver] exec skipped: ${String(e)}`);
        }
      }
    },
    async run(sql: string, params: unknown[] = []) {
      const res = await conn.run(sql, params as any[]);
      const changes = (res as any)?.changes?.changes ?? 0;
      return { changes: Number(changes) };
    },
    async query<T>(sql: string, params: unknown[] = []) {
      const res = await conn.query(sql, params as any[]);
      return ((res as any)?.values ?? []) as T[];
    },
    async transaction<T>(fn: () => Promise<T>): Promise<T> {
      await conn.beginTransaction();
      try {
        const out = await fn();
        await conn.commitTransaction();
        return out;
      } catch (e) {
        try {
          await conn.rollbackTransaction();
        } catch {
          /* 忽略回滚失败 */
        }
        throw e;
      }
    },
    async close() {
      try {
        await sqlite.closeConnection(name, false);
      } catch {
        /* 忽略关闭异常 */
      }
    },
  };
}
