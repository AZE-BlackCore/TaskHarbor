/**
 * core —— 共享内核统一出口
 * 纯 TypeScript，无 DOM / 无 Electron / 无 Capacitor 依赖，可单测（ADR-04）
 */

export * from './domain/types';
export * from './repository/types';
export { SqlRepository, nowIso, backoffMs } from './repository/sql-repository';
export * from './sync/cursor';
export * from './sync/conflict';
export { SyncEngine } from './sync/engine';
export type { SyncEngineOptions, SyncReport } from './sync/engine';
export * from './transport/base';
export { LanTransport } from './transport/lan';
