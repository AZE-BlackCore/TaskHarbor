/**
 * mobile/store —— 移动端状态（本地优先：读永不等网络，写立即本地生效）
 */

import { create } from 'zustand';
import type { Schedule, Task } from '../../../core/src/domain/types';
import type { SqlRepository } from '../../../core/src/repository/sql-repository';
import type { SyncEngine } from '../../../core/src/sync/engine';
import type { SyncReport } from '../../../core/src/sync/engine';
import { LanTransport } from '../../../core/src/transport/lan';
import { PAGE_SIZE, SYNC_TABLES } from '../platform/schema';
import {
  clearPairing,
  createEngine,
  initRepository,
  loadPairing,
  resetRepository,
  savePairing,
  type PairingInfo,
} from '../platform/runtime';

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'offline' | 'error' | 'unpaired';

interface MobileState {
  ready: boolean;
  initError: string | null;
  repo: SqlRepository | null;
  engine: SyncEngine | null;
  deviceId: string | null;
  pairing: PairingInfo | null;

  tasks: Task[];
  schedules: Schedule[];
  pending: number;
  conflicts: number;
  lastSyncAt: string | null;
  status: SyncStatus;
  lastReport: SyncReport | null;
  lastErrorHint: string | null;

  init(): Promise<void>;
  /** 单次初始化（init 内重试用，UI 不直接调用） */
  initOnce(): Promise<void>;
  refresh(): Promise<void>;
  syncNow(): Promise<void>;
  pair(baseUrl: string, pin: string): Promise<void>;
  unpair(): Promise<void>;
  createTask(input: Partial<Task>): Promise<void>;
  setTaskStatus(id: string, status: Task['status']): Promise<void>;
  createSchedule(input: Partial<Schedule>): Promise<void>;
  listConflicts(): Promise<void>;
  conflictList: Array<{ id: string; tableName: string; recordId: string; remoteUpdatedAt: string | null }>;
}

export const useMobileStore = create<MobileState>((set, get) => ({
  ready: false,
  initError: null,
  repo: null,
  engine: null,
  deviceId: null,
  pairing: null,
  tasks: [],
  schedules: [],
  pending: 0,
  conflicts: 0,
  lastSyncAt: null,
  status: 'idle',
  lastReport: null,
  lastErrorHint: null,
  conflictList: [],

  async init() {
    // v1.14.1：首次失败时丢弃连接缓存再重试一次（自愈「already exists」类残留）
    try {
      await get().initOnce();
    } catch (e) {
      console.warn('[mobile] init retry after reset', e);
      try {
        await resetRepository();
        await get().initOnce();
      } catch (e2) {
        console.error('[mobile] init failed', e2);
        set({ initError: e2 instanceof Error ? e2.message : String(e2), ready: true });
      }
    }
  },

  async initOnce() {
    try {
      const { repo, deviceId } = await initRepository();
      const pairing = await loadPairing();
      const { engine } = await createEngine();
      const lastSyncAt = await repo.getMeta('lastSyncAt');
      const pending = await repo.syncCount();
      const conflicts = await repo.conflictCount();
      set({ repo, engine, deviceId, pairing, ready: true, lastSyncAt, pending, conflicts });
      await get().refresh();
      // 有配对则自动尝试一次合流（UC-03）
      if (pairing) void get().syncNow();
    } catch (e) {
      console.error('[mobile] init failed', e);
      set({ initError: e instanceof Error ? e.message : String(e), ready: true });
    }
  },

  async refresh() {
    const { repo } = get();
    if (!repo) return;
    const tasks = await repo.entities.list<Task>('tasks', {
      where: 'deletedAt IS NULL',
      orderBy: 'updatedAt DESC',
      limit: 500,
    });
    const schedules = await repo.entities.list<Schedule>('schedules', {
      where: 'deletedAt IS NULL',
      orderBy: 'startTime ASC',
      limit: 500,
    });
    const pending = await repo.syncCount();
    const conflicts = await repo.conflictCount();
    set({ tasks, schedules, pending, conflicts });
  },

  async syncNow() {
    const { engine, pairing } = get();
    if (!engine) return;
    if (!pairing) {
      set({ status: 'unpaired' });
      return;
    }
    set({ status: 'syncing', lastErrorHint: null });
    const report = await engine.syncOnce();
    await get().refresh();
    const lastSyncAt = await get().repo?.getMeta('lastSyncAt');
    if (report.error) {
      set({ status: 'offline', lastReport: report, lastErrorHint: report.error.hint });
    } else {
      set({ status: 'ok', lastReport: report, lastSyncAt: lastSyncAt ?? new Date().toISOString() });
    }
  },

  async pair(baseUrl, pin) {
    const base = baseUrl.trim().replace(/\/+$/, '');
    if (!base) throw new Error('请先填写电脑地址，例如 http://192.168.1.23:18766');
    const transport = new LanTransport({ baseUrl: base });
    const meta = await transport.meta(); // 握手：可达性与 schema 版本
    const res = await transport.pair(pin.trim());
    if (meta.schemaVersion !== undefined && res.schemaVersion !== meta.schemaVersion) {
      throw new Error('两端数据版本不一致，请升级到匹配版本');
    }
    const info: PairingInfo = {
      baseUrl: base,
      token: res.token,
      hubId: res.hubId,
      pairedAt: new Date().toISOString(),
    };
    await savePairing(info);
    const { engine } = await createEngine();
    set({ pairing: info, engine, status: 'idle' });
    await get().syncNow();
  },

  async unpair() {
    await clearPairing();
    const { engine } = await createEngine();
    set({ pairing: null, engine, status: 'unpaired' });
  },

  async createTask(input) {
    const { repo } = get();
    if (!repo) return;
    const now = new Date().toISOString();
    const record: Record<string, unknown> = {
      id: `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      description: input.description ?? '未命名任务',
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      progress: input.progress ?? 0,
      startDate: input.startDate ?? null,
      estimatedEndDate: input.estimatedEndDate ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await repo.getDriver().transaction(async () => {
      await repo.entities.create('tasks', record);
    });
    await get().refresh();
  },

  async setTaskStatus(id, status) {
    const { repo } = get();
    if (!repo) return;
    await repo.getDriver().transaction(async () => {
      await repo.entities.update('tasks', id, { status });
    });
    await get().refresh();
  },

  async createSchedule(input) {
    const { repo } = get();
    if (!repo) return;
    const now = new Date().toISOString();
    await repo.getDriver().transaction(async () => {
      await repo.entities.create('schedules', {
        id: `sch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        title: input.title ?? '未命名日程',
        description: input.description ?? null,
        location: input.location ?? null,
        startTime: input.startTime ?? now,
        endTime: input.endTime ?? now,
        allDay: input.allDay ? 1 : 0,
        color: input.color ?? '#3B82F6',
        priority: input.priority ?? 'medium',
        reminder: input.reminder ?? null,
        completed: 0,
        createdAt: now,
        updatedAt: now,
      });
    });
    await get().refresh();
  },

  async listConflicts() {
    const { repo } = get();
    if (!repo) return;
    const list = await repo.sync.listConflicts(true);
    set({
      conflictList: list.map((c) => ({
        id: c.id,
        tableName: c.tableName,
        recordId: c.recordId,
        remoteUpdatedAt: c.remoteUpdatedAt,
      })),
    });
  },
}));

export { SYNC_TABLES, PAGE_SIZE };
