/**
 * core/transport/base —— 同步传输抽象（ADR-02）
 * 四个动词覆盖全部场景；LAN 与未来云端共用同一套上层 SyncEngine。
 */

import type { ChangeRecord, Cursor, PushResultItem } from '../domain/types';

export interface HubMeta {
  hubVersion: string;
  appVersion: string;
  schemaVersion: number;
  syncTables: string[];
  serverTime: string;
  deviceId: string;
}

export interface PairResult {
  token: string;
  hubId: string;
  hubVersion: string;
  schemaVersion: number;
}

export interface PushResponse {
  results: PushResultItem[];
  serverTime: string;
}

export interface PullResponse {
  table: string;
  changes: ChangeRecord[];
  nextCursor: Cursor;
  hasMore: boolean;
  serverTime: string;
}

export interface TableSummary {
  count: number;
  maxUpdatedAt: string | null;
}

export interface VerifyResponse {
  diffs: Array<{ table: string; localCount: number; hubCount: number; drift: boolean }>;
  serverTime: string;
}

export interface SyncTransport {
  readonly baseUrl: string;
  meta(): Promise<HubMeta>;
  pair(pin: string): Promise<PairResult>;
  push(changes: ChangeRecord[]): Promise<PushResponse>;
  pull(table: string, cursor: Cursor, pageSize: number): Promise<PullResponse>;
  verify(summaries: Record<string, TableSummary>): Promise<VerifyResponse>;
}

export type TransportErrorCode =
  | 'unreachable' // 连不上（Hub 未开 / AP 隔离 / IP 变更）
  | 'unauthorized' // token 失效
  | 'schema-mismatch'
  | 'server-error'
  | 'timeout'
  | 'unknown';

export class TransportError extends Error {
  constructor(
    public code: TransportErrorCode,
    message: string,
    public httpStatus?: number
  ) {
    super(message);
    this.name = 'TransportError';
  }

  /** 用户可见的修复动作（FR-10：失败必须给出可执行动作，而非只说「同步失败」） */
  get actionHint(): string {
    switch (this.code) {
      case 'unreachable':
        return '检查手机与电脑是否连接同一 WiFi，或路由器是否开启「客户端隔离（AP 隔离）」；也可改用手机热点让电脑连接，或改用 JSON 导入导出。';
      case 'unauthorized':
        return '配对已失效，请在桌面端重新生成配对码并重新扫码配对。';
      case 'schema-mismatch':
        return '两端数据版本不一致，请将桌面端与手机端升级到匹配版本后再同步。';
      case 'timeout':
        return '连接超时，请确认电脑未休眠且小湾清单正在运行，然后重试。';
      default:
        return '请稍后重试；若持续失败，可在「我的 → 导出诊断包」查看最近错误码。';
    }
  }
}
