/**
 * core/transport/lan —— 局域网 HTTP 实现（阶段一）
 * ADR-06：明文 HTTP，最小攻击面（默认关闭 / 仅绑 WiFi 网卡 IP / 仅放行私有网段）
 *
 * 日志脱敏（7.3）：只输出 ID、表名、时间戳、错误码，禁止输出任务标题与正文。
 */

import type { ChangeRecord, Cursor, PushResultItem } from '../domain/types';
import type {
  HubMeta,
  PairResult,
  PullResponse,
  PushResponse,
  SyncTransport,
  TableSummary,
  VerifyResponse,
} from './base';
import { TransportError } from './base';

export interface LanTransportOptions {
  baseUrl: string; // 例：http://192.168.1.23:18766
  token?: string;
  timeoutMs?: number;
  log?: (msg: string) => void;
}

export class LanTransport implements SyncTransport {
  readonly baseUrl: string;
  private token?: string;
  private timeoutMs: number;
  private log: (msg: string) => void;

  constructor(opts: LanTransportOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.token = opts.token;
    this.timeoutMs = opts.timeoutMs ?? 8000;
    this.log = opts.log ?? (() => {});
  }

  setToken(token: string): void {
    this.token = token;
  }

  private async request<T>(
    path: string,
    init: { method: string; body?: unknown } = { method: 'GET' }
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: init.method,
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      });
      if (res.status === 401 || res.status === 403) {
        throw new TransportError('unauthorized', 'token 无效或已失效', res.status);
      }
      if (res.status === 426) {
        throw new TransportError('schema-mismatch', '两端 schema 版本不一致', res.status);
      }
      if (!res.ok) {
        throw new TransportError('server-error', `Hub 返回 ${res.status}`, res.status);
      }
      return (await res.json()) as T;
    } catch (e) {
      if (e instanceof TransportError) throw e;
      const err = e as Error;
      if (err.name === 'AbortError') {
        throw new TransportError('timeout', '请求超时');
      }
      throw new TransportError('unreachable', '无法连接 Hub（网络不可达或被拒绝）');
    } finally {
      clearTimeout(timer);
    }
  }

  async meta(): Promise<HubMeta> {
    return this.request<HubMeta>('/api/sync/meta');
  }

  async pair(
    pin: string,
    opts: { deviceId?: string; deviceName?: string } = {}
  ): Promise<PairResult> {
    const r = await this.request<PairResult>('/api/sync/pair', {
      method: 'POST',
      body: {
        pin,
        deviceId: opts.deviceId ?? '',
        deviceName: opts.deviceName ?? '移动端',
      },
    });
    this.token = r.token;
    return r;
  }

  async push(changes: ChangeRecord[]): Promise<PushResponse> {
    return this.request<PushResponse>('/api/sync/push', {
      method: 'POST',
      body: { changes },
    });
  }

  async pull(table: string, cursor: Cursor, pageSize: number): Promise<PullResponse> {
    const qs = new URLSearchParams({
      table,
      cursorTs: cursor.ts ?? '',
      cursorId: cursor.id ?? '',
      pageSize: String(pageSize),
    });
    return this.request<PullResponse>(`/api/sync/pull?${qs.toString()}`);
  }

  async verify(summaries: Record<string, TableSummary>): Promise<VerifyResponse> {
    return this.request<VerifyResponse>('/api/sync/verify', {
      method: 'POST',
      body: { summaries },
    });
  }
}

export type { PushResultItem };
