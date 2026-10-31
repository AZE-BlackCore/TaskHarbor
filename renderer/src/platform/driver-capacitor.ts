/**
 * platform/driver-capacitor —— Repository 的移动端实现（原生 SQLite）
 *
 * 方言硬约束（设计文档 4.8）：
 *   1. 禁止 CTE（WITH）与 RETURNING
 *   2. 禁止带冲突目标的 UPSERT —— 一律「先 UPDATE，0 行再 INSERT」（由 SqlRepository 实现）
 *   3. 写操作必须包事务
 * 插件主版本必须与 Capacitor 主版本一致：Capacitor 8 → @capacitor-community/sqlite@^8
 *
 * ⚠️ 连接单例（v1.14.1）：
 * 原生插件以「库名」为键维护连接池，同名重复 createConnection 会抛
 * "CreateConnection: Connection <name> already exists"。JS 侧任何一次重复初始化
 * （init → createEngine、配对后重建引擎、热重载）都会踩到，因此：
 *   - 模块级缓存 driverPromise，整个 WebView 生命周期只开一条连接
 *   - 即便缓存被绕过（例如页面重建），也先 isConnection 探测、命中则 retrieveConnection
 */

import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { SqlDriver } from '../../../core/src/repository/types';

export interface CapacitorDriverOptions {
  databaseName?: string;
  encrypted?: boolean;
  log?: (msg: string) => void;
}

let cachedDriver: Promise<SqlDriver> | null = null;

/** 打开（或复用）一条连接；同名库在 WebView 内始终只有一条物理连接 */
export async function createCapacitorDriver(
  opts: CapacitorDriverOptions = {}
): Promise<SqlDriver> {
  if (!cachedDriver) {
    cachedDriver = openDriver(opts).catch((e) => {
      // 打开失败要清缓存，允许上层「重置后重试」，否则错误会被永久钉住
      cachedDriver = null;
      throw e;
    });
  }
  return cachedDriver;
}

/** 仅用于「重置本地数据」等场景：关闭并丢弃连接缓存 */
export async function resetCapacitorDriver(): Promise<void> {
  if (!cachedDriver) return;
  try {
    const driver = await cachedDriver;
    await driver.close?.();
  } catch {
    /* 忽略关闭异常 */
  }
  cachedDriver = null;
}

async function openDriver(opts: CapacitorDriverOptions): Promise<SqlDriver> {
  const name = opts.databaseName ?? 'taskharbor';
  const log = opts.log ?? (() => {});
  const sqlite = new SQLiteConnection(CapacitorSQLite);

  let conn: SQLiteDBConnection;
  try {
    const exists = await sqlite.isConnection(name, false);
    if (exists?.result) {
      conn = await sqlite.retrieveConnection(name, false);
      log('[capacitor-driver] reuse existing connection');
    } else {
      conn = await sqlite.createConnection(name, opts.encrypted ?? false, 'no-encryption', 1, false);
    }
  } catch (e) {
    // 兜底：探测本身失败时不阻断，直接按「不存在」处理
    log(`[capacitor-driver] isConnection failed, fallback create: ${String(e)}`);
    conn = await sqlite.createConnection(name, opts.encrypted ?? false, 'no-encryption', 1, false);
  }

  const opened = await conn.isDBOpen();
  if (!opened?.result) await conn.open();

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
