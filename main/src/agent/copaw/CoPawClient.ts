/**
 * CoPaw HTTP 客户端
 *
 * 提供与 CoPaw 本地服务（或远程服务）通信的能力：
 * - 检测 CoPaw 服务可用性
 * - 转发 LLM 请求（流式）
 * - 调用 CoPaw MCP 工具
 */

import * as http from 'http';
import * as https from 'https';

export interface CoPawClientConfig {
  /** CoPaw 服务地址，默认 http://localhost:3456 */
  baseUrl: string;
  /** 可选 API Key（连接远程 CoPaw 服务时使用） */
  apiKey?: string;
  /** 连接超时（ms），默认 10000 */
  connectTimeout?: number;
  /** 请求超时（ms），默认 120000 */
  requestTimeout?: number;
}

export interface CoPawChatRequest {
  model?: string;
  messages: Array<{ role: string; content: string; toolCalls?: unknown[]; toolCallId?: string }>;
  tools?: unknown[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface CoPawStreamChunk {
  id?: string;
  object?: string;
  choices?: Array<{
    delta?: {
      content?: string;
      tool_calls?: unknown[];
    };
    finish_reason?: string | null;
  }>;
  error?: { message: string };
}

/**
 * CoPaw 客户端
 */
export class CoPawClient {
  private config: Required<CoPawClientConfig>;

  constructor(config: CoPawClientConfig) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3456',
      apiKey: config.apiKey || '',
      connectTimeout: config.connectTimeout ?? 10000,
      requestTimeout: config.requestTimeout ?? 120000,
    };
  }

  /**
   * 检查 CoPaw 服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const url = new URL('/api/health', this.config.baseUrl);
      const lib = url.protocol === 'https:' ? https : http;

      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname,
          method: 'GET',
          timeout: this.config.connectTimeout,
        },
        (res) => {
          resolve(res.statusCode !== undefined && res.statusCode < 500);
        }
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });
  }

  /**
   * 获取 CoPaw 服务信息（版本、可用模型等）
   */
  async getServiceInfo(): Promise<{ version?: string; models?: string[]; name?: string } | null> {
    return new Promise((resolve) => {
      const url = new URL('/api/info', this.config.baseUrl);
      const lib = url.protocol === 'https:' ? https : http;

      let data = '';
      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname,
          method: 'GET',
          headers: this.buildHeaders(),
          timeout: this.config.connectTimeout,
        },
        (res) => {
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(null);
            }
          });
        }
      );

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    });
  }

  /**
   * 流式聊天请求（OpenAI 兼容格式）
   * 返回 AsyncGenerator，逐步 yield SSE 行
   */
  async *chatStream(request: CoPawChatRequest): AsyncGenerator<CoPawStreamChunk> {
    const url = new URL('/api/chat', this.config.baseUrl);
    const body = JSON.stringify({ ...request, stream: true });

    const responseStream = await this.makePostRequest(url, body);

    let buffer = '';
    for await (const chunk of responseStream) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const parsed: CoPawStreamChunk = JSON.parse(trimmed.slice(6));
          yield parsed;
        } catch {
          // 忽略解析错误
        }
      }
    }
  }

  // ========== Private Helpers ==========

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  private makePostRequest(url: URL, body: string): Promise<AsyncIterable<Buffer>> {
    return new Promise((resolve, reject) => {
      const lib = url.protocol === 'https:' ? https : http;

      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            ...this.buildHeaders(),
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: this.config.requestTimeout,
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`CoPaw API error: HTTP ${res.statusCode}`));
            return;
          }
          resolve(res as AsyncIterable<Buffer>);
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('CoPaw API request timeout'));
      });

      req.write(body);
      req.end();
    });
  }
}
