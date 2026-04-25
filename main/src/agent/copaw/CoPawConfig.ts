/**
 * CoPaw 连接配置管理
 *
 * 管理 CoPaw 连接状态，包括：
 * - 可用性检测（启动时 + 定期轮询）
 * - 配置持久化
 * - 连接状态通知
 */

import { CoPawClient } from './CoPawClient';

export interface CoPawConnectionStatus {
  available: boolean;
  lastChecked: Date | null;
  serviceInfo?: { version?: string; name?: string; models?: string[] } | null;
  error?: string;
}

type StatusListener = (status: CoPawConnectionStatus) => void;

/**
 * CoPaw 配置管理器（单例）
 *
 * 负责检测 CoPaw 连接状态，并在状态变化时通知监听器（用于 UI 自动切换 Provider）
 */
class CoPawConfigManager {
  private client: CoPawClient | null = null;
  private status: CoPawConnectionStatus = {
    available: false,
    lastChecked: null,
  };
  private listeners: Set<StatusListener> = new Set();
  private pollTimer: NodeJS.Timeout | null = null;

  /**
   * 初始化 CoPaw 连接
   * @param baseUrl CoPaw 服务地址
   * @param apiKey 可选 API Key
   */
  initialize(baseUrl: string, apiKey?: string): void {
    this.client = new CoPawClient({ baseUrl, apiKey });
    // 立即检查一次
    this.checkConnection();
    // 每 30 秒轮询一次
    this.startPolling(30000);
  }

  /**
   * 检查连接状态
   */
  async checkConnection(): Promise<CoPawConnectionStatus> {
    if (!this.client) {
      this.status = { available: false, lastChecked: new Date(), error: 'CoPaw 未配置' };
      this.notifyListeners();
      return this.status;
    }

    try {
      const available = await this.client.isAvailable();
      const serviceInfo = available ? await this.client.getServiceInfo() : null;

      this.status = {
        available,
        lastChecked: new Date(),
        serviceInfo,
        error: available ? undefined : 'CoPaw 服务不可用',
      };
    } catch (err: unknown) {
      this.status = {
        available: false,
        lastChecked: new Date(),
        error: err instanceof Error ? err.message : '连接检查失败',
      };
    }

    this.notifyListeners();
    return this.status;
  }

  /**
   * 获取当前连接状态（不触发检查）
   */
  getStatus(): CoPawConnectionStatus {
    return { ...this.status };
  }

  /**
   * 获取 CoPaw 客户端实例
   */
  getClient(): CoPawClient | null {
    return this.status.available ? this.client : null;
  }

  /**
   * 订阅状态变化
   */
  onStatusChange(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 停止轮询（应用退出时调用）
   */
  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private startPolling(intervalMs: number): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      this.checkConnection().catch(() => { /* 静默失败 */ });
    }, intervalMs);
    // 不阻止进程退出
    if (this.pollTimer.unref) {
      this.pollTimer.unref();
    }
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach((l) => {
      try { l(status); } catch { /* 静默 */ }
    });
  }
}

export const coPawConfig = new CoPawConfigManager();
