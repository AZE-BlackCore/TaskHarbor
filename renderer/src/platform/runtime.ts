/**
 * platform/runtime —— 移动端运行时装配：Driver → Repository → SyncEngine
 * UI 层只依赖 core 抽象，不直接 import 原生插件（设计文档 4.1 的分层红线）
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { SqlRepository } from '../../../core/src/repository/sql-repository';
import { LanTransport } from '../../../core/src/transport/lan';
import { SyncEngine } from '../../../core/src/sync/engine';
import type { RepositoryBundle } from '../../../core/src/repository/types';
import { createCapacitorDriver, resetCapacitorDriver } from './driver-capacitor';
import { MIGRATION_SQL_001, PAGE_SIZE, SCHEMA_SQL, SCHEMA_VERSION, SYNC_TABLES } from './schema';

const KEY_TOKEN = 'cove.sync.token';
const KEY_BASEURL = 'cove.sync.baseUrl';
const KEY_HUBID = 'cove.sync.hubId';

function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface PairingInfo {
  baseUrl: string;
  token: string;
  hubId: string;
  pairedAt: string;
}

// v1.14.1：Repository 单例。webview 生命周期内 init/createEngine 可能被多处调用
// （启动、配对成功、解绑），重复构建会连带重复 createConnection → P0「already exists」
let repoPromise: Promise<{ repo: SqlRepository; deviceId: string }> | null = null;

export function initRepository(): Promise<{ repo: SqlRepository; deviceId: string }> {
  if (!repoPromise) {
    repoPromise = openRepository().catch((e) => {
      repoPromise = null; // 失败可重试
      throw e;
    });
  }
  return repoPromise;
}

/** 仅「重置本地数据」时用：丢弃 Repository 与底层连接缓存 */
export async function resetRepository(): Promise<void> {
  const p = repoPromise;
  repoPromise = null;
  if (p) {
    try {
      const { repo } = await p;
      await repo.getDriver().close?.();
    } catch {
      /* 忽略 */
    }
  }
  await resetCapacitorDriver();
}

async function openRepository(): Promise<{ repo: SqlRepository; deviceId: string }> {
  const driver = await createCapacitorDriver({ log: (m) => console.log(m) });
  const repo = new SqlRepository(driver, { deviceId: 'pending', newId });

  // DDL 单一真源：建库 + 增量迁移（迁移单条失败静默跳过）
  await repo.applySchema(SCHEMA_SQL);
  await repo.applyMigration(MIGRATION_SQL_001);
  await repo.setMeta('schemaVersion', String(SCHEMA_VERSION));

  let deviceId = await repo.getMeta('deviceId');
  if (!deviceId) {
    deviceId = newId();
    await repo.setMeta('deviceId', deviceId);
  }
  // deviceId 用于写库时标记来源，重新绑定
  (repo as unknown as { opts: { deviceId: string } }).opts.deviceId = deviceId;

  return { repo, deviceId };
}

export async function loadPairing(): Promise<PairingInfo | null> {
  const [baseUrl, token, hubId] = await Promise.all([
    Preferences.get({ key: KEY_BASEURL }),
    Preferences.get({ key: KEY_TOKEN }),
    Preferences.get({ key: KEY_HUBID }),
  ]);
  if (!baseUrl.value || !token.value) return null;
  return {
    baseUrl: baseUrl.value,
    token: token.value,
    hubId: hubId.value ?? '',
    pairedAt: new Date().toISOString(),
  };
}

export async function savePairing(info: PairingInfo): Promise<void> {
  await Preferences.set({ key: KEY_BASEURL, value: info.baseUrl });
  await Preferences.set({ key: KEY_TOKEN, value: info.token });
  await Preferences.set({ key: KEY_HUBID, value: info.hubId });
}

export async function clearPairing(): Promise<void> {
  await Preferences.remove({ key: KEY_BASEURL });
  await Preferences.remove({ key: KEY_TOKEN });
  await Preferences.remove({ key: KEY_HUBID });
}

export async function createEngine(): Promise<{
  bundle: RepositoryBundle;
  engine: SyncEngine;
  pairing: PairingInfo | null;
}> {
  const { repo, deviceId } = await initRepository();
  const pairing = await loadPairing();
  const transport = new LanTransport({
    baseUrl: pairing?.baseUrl ?? 'http://127.0.0.1:18766',
    token: pairing?.token,
    log: (m) => console.log(`[sync] ${m}`),
  });
  const engine = new SyncEngine(repo, repo, transport, {
    tables: SYNC_TABLES,
    pageSize: PAGE_SIZE,
    deviceId,
    log: (m) => console.log(`[engine] ${m}`),
  });
  return {
    bundle: { sync: repo, entities: repo, driver: repo.getDriver() },
    engine,
    pairing,
  };
}

export { Capacitor };
