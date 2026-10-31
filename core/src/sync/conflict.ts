/**
 * core/sync/conflict —— 记录级 LWW 裁决 + 冲突留档（ADR-05 / ADR-07）
 *
 * 红线：不允许静默丢弃数据。任何被覆盖的版本都必须写入 _sync_conflicts。
 * ADR-07：一端删除、另一端修改时，修改优先（误删不可再生）。
 */

import type { ChangeRecord } from '../domain/types';

export type ConflictKind = 'lww' | 'delete-vs-update';

export interface LocalState {
  id: string;
  updatedAt: string;
  deletedAt?: string | null;
  payload: Record<string, unknown> | null;
}

export interface Resolution {
  /** 最终落库的一方 */
  winner: ChangeRecord | LocalState;
  /** 是否需要登记冲突副本 */
  conflict: boolean;
  kind?: ConflictKind;
  /** 被覆盖的一方的载荷，用于留档 */
  loserPayloadJson?: string | null;
  loserUpdatedAt?: string | null;
}

export function decide(
  incoming: ChangeRecord,
  local: LocalState | null
): Resolution {
  // 本地无记录：直接应用（含「删除意图」的墓碑）
  if (!local) {
    return { winner: incoming, conflict: false };
  }

  const incomingDeleted = !!incoming.deletedAt;
  const localDeleted = !!local.deletedAt;

  // 两端均删除 → 收敛为删除，无需留档
  if (incomingDeleted && localDeleted) {
    return { winner: incoming, conflict: false };
  }

  // 删除 vs 修改 → 修改优先（ADR-07）
  if (incomingDeleted && !localDeleted) {
    return {
      winner: local,
      conflict: true,
      kind: 'delete-vs-update',
      loserPayloadJson: JSON.stringify(incoming.payload ?? null),
      loserUpdatedAt: incoming.updatedAt,
    };
  }
  if (!incomingDeleted && localDeleted) {
    return {
      winner: incoming,
      conflict: true,
      kind: 'delete-vs-update',
      loserPayloadJson: JSON.stringify(local.payload ?? null),
      loserUpdatedAt: local.updatedAt,
    };
  }

  // 双端均修改：记录级 LWW（Hub 侧 updatedAt 较大者胜）
  if (incoming.updatedAt > local.updatedAt) {
    return {
      winner: incoming,
      conflict: true,
      kind: 'lww',
      loserPayloadJson: JSON.stringify(local.payload ?? null),
      loserUpdatedAt: local.updatedAt,
    };
  }
  if (incoming.updatedAt < local.updatedAt) {
    return {
      winner: local,
      conflict: true,
      kind: 'lww',
      loserPayloadJson: JSON.stringify(incoming.payload ?? null),
      loserUpdatedAt: incoming.updatedAt,
    };
  }
  // 时间戳完全相同：视为同一版本，幂等接受
  return { winner: incoming, conflict: false };
}
