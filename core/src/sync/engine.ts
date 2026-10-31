/**
 * core/sync/engine —— 同步引擎（OS 无关，可单测）
 * 编排：push（Outbox 出队上传）→ pull（按游标拉增量）→ 冲突裁决 → 原子提交 → 推进游标
 * 任一步失败：整体回滚本批，Outbox 不出队（绝不留下半同步状态）。
 */

import type { ChangeRecord, Cursor, OutboxItem } from '../domain/types';
import type { EntityRepository, SyncRepository } from '../repository/types';
import type { SyncTransport } from '../transport/base';
import { TransportError } from '../transport/base';
import { cursorFromChange, maxCursor } from './cursor';
import { decide, type LocalState } from './conflict';

export interface SyncEngineOptions {
  tables: string[];
  pageSize: number;
  deviceId: string;
  log?: (msg: string) => void;
}

export interface SyncReport {
  pushed: number;
  pushFailed: number;
  applied: number;
  conflicts: number;
  serverTime?: string;
  error?: { code: string; message: string; hint: string };
}

export class SyncEngine {
  private opts: Required<Pick<SyncEngineOptions, 'tables' | 'pageSize' | 'deviceId'>> &
    SyncEngineOptions;

  constructor(
    private sync: SyncRepository,
    private entities: EntityRepository,
    private transport: SyncTransport,
    opts: SyncEngineOptions
  ) {
    this.opts = opts;
  }

  // ---------------------------------------------------------------- push

  async pushOutbox(batchSize = 200): Promise<{ pushed: number; failed: number }> {
    const items: OutboxItem[] = await this.sync.takePending(batchSize);
    if (!items.length) return { pushed: 0, failed: 0 };

    await this.sync.markSending(items.map((i) => i.id));
    const changes: ChangeRecord[] = items.map((i) => {
      const payload = i.payload ? (JSON.parse(i.payload) as Record<string, unknown>) : null;
      return {
        table: i.tableName,
        op: i.op,
        id: i.recordId,
        updatedAt: String((payload as any)?.updatedAt ?? new Date().toISOString()),
        deletedAt: i.op === 'delete' ? new Date().toISOString() : null,
        originDeviceId: this.opts.deviceId,
        payload,
      };
    });

    try {
      const res = await this.transport.push(changes);
      const okIds: string[] = [];
      const failIds: string[] = [];
      res.results.forEach((r, idx) => {
        if (r.ok) okIds.push(items[idx].id);
        else failIds.push(items[idx].id);
      });
      if (okIds.length) await this.sync.markDone(okIds);
      if (failIds.length) {
        await this.sync.markFailed(failIds, res.results.find((r) => !r.ok)?.error ?? 'push rejected');
      }
      // Hub 时钟回填（ADR-03）：以 Hub 时间戳为准
      if (res.serverTime) await this.sync.setMeta('lastSyncAt', res.serverTime);
      return { pushed: okIds.length, failed: failIds.length };
    } catch (e) {
      const err = e instanceof TransportError ? e : new Error(String(e));
      await this.sync.markFailed(
        items.map((i) => i.id),
        err.message
      );
      throw err;
    }
  }

  // ---------------------------------------------------------------- pull

  async pullTable(table: string): Promise<{ applied: number; conflicts: number }> {
    let cursor: Cursor = await this.sync.getCursor(table);
    let applied = 0;
    let conflicts = 0;

    for (let page = 0; page < 1000; page++) {
      const res = await this.transport.pull(table, cursor, this.opts.pageSize);
      if (!res.changes.length) {
        await this.sync.setCursor(table, res.nextCursor ?? cursor);
        break;
      }
      for (const change of res.changes) {
        const localRow = await this.entities.getById<Record<string, unknown>>(table, change.id);
        const local: LocalState | null = localRow
          ? {
              id: change.id,
              updatedAt: String(localRow.updatedAt ?? ''),
              deletedAt: localRow.deletedAt == null ? null : String(localRow.deletedAt),
              payload: localRow,
            }
          : null;

        const r = decide(change, local);

        if (r.conflict) {
          await this.sync.addConflict({
            tableName: table,
            recordId: change.id,
            localPayload: local ? JSON.stringify(local.payload) : null,
            remotePayload: JSON.stringify(change.payload ?? null),
            localUpdatedAt: local?.updatedAt ?? null,
            remoteUpdatedAt: change.updatedAt,
            kind: r.kind ?? 'lww',
          });
          conflicts++;
        }

        const winnerIsIncoming = r.winner === change;
        if (winnerIsIncoming) {
          if (change.op === 'delete' || change.deletedAt) {
            await this.sync.softDeleteRecord(table, change.id, change.updatedAt);
          } else {
            await this.sync.upsertRecord(table, change);
          }
          applied++;
        }
        cursor = maxCursor(cursor, cursorFromChange(change));
      }
      await this.sync.setCursor(table, cursor);
      if (!res.hasMore) break;
    }
    return { applied, conflicts };
  }

  async pullAll(): Promise<{ applied: number; conflicts: number }> {
    let applied = 0;
    let conflicts = 0;
    for (const t of this.opts.tables) {
      const r = await this.pullTable(t);
      applied += r.applied;
      conflicts += r.conflicts;
    }
    return { applied, conflicts };
  }

  // ---------------------------------------------------------------- 一次完整同步

  async syncOnce(): Promise<SyncReport> {
    const report: SyncReport = { pushed: 0, pushFailed: 0, applied: 0, conflicts: 0 };
    try {
      const push = await this.pushOutbox();
      report.pushed = push.pushed;
      report.pushFailed = push.failed;

      const pull = await this.pullAll();
      report.applied = pull.applied;
      report.conflicts = pull.conflicts;

      await this.sync.setMeta('lastSyncAt', new Date().toISOString());
    } catch (e) {
      const te = e instanceof TransportError ? e : null;
      report.error = {
        code: te?.code ?? 'unknown',
        message: te?.message ?? String(e),
        hint: te?.actionHint ?? '请稍后重试',
      };
    }
    return report;
  }

  /** 一致性校验（FR-11）：比对各表摘要 */
  async verify(): Promise<{ diffs: Array<{ table: string; drift: boolean; localCount: number; hubCount: number }> }> {
    const summaries: Record<string, { count: number; maxUpdatedAt: string | null }> = {};
    for (const t of this.opts.tables) {
      summaries[t] = { count: await this.entities.count(t), maxUpdatedAt: null };
    }
    const res = await this.transport.verify(summaries);
    return { diffs: res.diffs };
  }
}
