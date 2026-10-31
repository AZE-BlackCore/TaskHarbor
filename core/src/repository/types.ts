/**
 * core/repository —— 数据访问抽象（OS 无关）
 *
 * 分层约束（设计文档 4.1）：
 *   UI → Domain Service → Repository → SqlDriver → SQLite
 * UI 层禁止直接 import platform/*，只能依赖 core/* 的抽象。
 */

import type {
  ChangeRecord,
  ConflictRecord,
  Cursor,
  OutboxItem,
  SyncOp,
} from '../domain/types';

/** 最底层 SQL 执行能力：由 ElectronDriver / CapacitorDriver 分别实现 */
export interface SqlDriver {
  /** 批量执行建表 / 迁移语句；单条失败需由实现方记录但不中断 */
  exec(statements: string[]): Promise<void>;
  /** 执行写语句，返回受影响行数（方言约束下禁止 RETURNING） */
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** 事务：回调内所有写操作要么全成功要么全回滚 */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  /** 关闭连接（移动端 App 退出 / 桌面端重载） */
  close?(): Promise<void>;
}

/** 同步相关的数据访问（元表 + 变更查询 + 幂等写入） */
export interface SyncRepository {
  // ---- 元数据 ----
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;

  // ---- 游标 ----
  getCursor(table: string): Promise<Cursor>;
  setCursor(table: string, cursor: Cursor): Promise<void>;
  getAllCursors(tables: string[]): Promise<Record<string, Cursor>>;

  // ---- 变更扫描（本地 → Hub） ----
  /** 按复合游标读取某表增量变更 */
  readChanges(table: string, since: Cursor, limit: number): Promise<ChangeRecord[]>;

  // ---- 幂等写入（对端 → 本地） ----
  /** 先 UPDATE，影响 0 行再 INSERT（规避 Android 插件 UPSERT 缺陷，设计文档 4.8） */
  upsertRecord(table: string, record: ChangeRecord): Promise<void>;
  /** 软删除：写 deletedAt，绝不物理 DELETE（ADR-08） */
  softDeleteRecord(table: string, id: string, at: string): Promise<void>;

  // ---- Outbox ----
  /** 入队：id 与时间戳由实现内部生成 */
  enqueue(
    item: Omit<OutboxItem, 'id' | 'createdAt' | 'updatedAt' | 'state' | 'retryCount'>
  ): Promise<void>;
  /** 取出待发送批次（按创建顺序） */
  takePending(limit: number): Promise<OutboxItem[]>;
  markSending(ids: string[]): Promise<void>;
  markDone(ids: string[]): Promise<void>;
  /** 失败：累加重试次数并按指数退避计算下次重试时间 */
  markFailed(ids: string[], error: string): Promise<void>;
  countPending(): Promise<number>;
  purgeDone(olderThanIso: string): Promise<void>;

  // ---- 冲突 ----
  addConflict(c: Omit<ConflictRecord, 'id' | 'createdAt' | 'resolved'>): Promise<void>;
  listConflicts(onlyUnresolved: boolean): Promise<ConflictRecord[]>;
  resolveConflict(id: string): Promise<void>;
}

/** 领域实体的通用 CRUD（移动端 UI 直接使用；桌面端仍走既有 service，行为不变） */
export interface EntityRepository {
  list<T = Record<string, unknown>>(
    table: string,
    opts?: { where?: string; params?: unknown[]; orderBy?: string; limit?: number }
  ): Promise<T[]>;
  getById<T = Record<string, unknown>>(table: string, id: string): Promise<T | null>;
  create(table: string, record: Record<string, unknown>): Promise<void>;
  update(table: string, id: string, patch: Record<string, unknown>): Promise<void>;
  softDelete(table: string, id: string): Promise<void>;
  count(table: string, where?: string, params?: unknown[]): Promise<number>;
}

/** Repository 工厂：由平台层注入 Driver */
export interface RepositoryBundle {
  sync: SyncRepository;
  entities: EntityRepository;
  driver: SqlDriver;
}
