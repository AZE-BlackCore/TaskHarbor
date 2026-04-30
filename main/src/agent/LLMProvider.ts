/**
 * LLM Provider 抽象层
 * 使用 Node.js 原生 https/http 模块调用 LLM API，避免 CommonJS 兼容问题
 *
 * 修复要点（2026-04-25）：
 * - makeRequest 返回 IncomingMessage 实现真正的流式 SSE
 * - parseSSEStream 逐行解析，每个 delta 立即 yield（打字机效果）
 * - finishReason 从 SSE 数据中正确提取，不再硬编码
 * - AbortController 绑定到 HTTP 请求，取消功能生效
 * - 工具调用 ID 使用服务端返回的值
 */

import * as https from 'https';
import * as http from 'http';
import type { IncomingMessage } from 'http';
import type { LLMProvider, LLMMessage, LLMResponse, LLMConfig, ToolDefinition, ToolCall } from './types';
import { PROVIDER_MODELS } from './types';

/**
 * 创建唯一 ID（仅作 fallback）
 */
function generateToolCallId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * DeepSeek Provider 实现
 * API 兼容 OpenAI 格式
 *
 * 流式实现：逐行读取 SSE，每个有内容的 chunk 立即 yield
 * 工具调用在流结束时一次性 yield（因为需要累积完整的参数 JSON）
 */
class DeepSeekProvider implements LLMProvider {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || PROVIDER_MODELS.deepseek.baseUrl,
      model: config.model || PROVIDER_MODELS.deepseek.defaultModel,
    };
  }

  async *chat(messages: LLMMessage[], tools?: ToolDefinition[], signal?: AbortSignal): AsyncGenerator<LLMResponse> {
    const body: any = {
      model: this.config.model,
      messages,
      temperature: this.config.temperature ?? 0.7,
      max_tokens: this.config.maxTokens ?? 4096,
      stream: true,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const res = await this.makeRequest(body, signal);
    yield* this.parseSSEStream(res);
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.makeRequest({
        model: this.config.model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
        stream: false,
      });
      return true;
    } catch {
      return false;
    }
  }

  getModelName(): string {
    return this.config.model;
  }

  /**
   * 发送 HTTP 请求，返回 IncomingMessage 供流式读取
   * 支持通过 AbortSignal 中止请求
   */
  protected makeRequest(body: any, signal?: AbortSignal): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.config.baseUrl}/v1/chat/completions`);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const postData = JSON.stringify(body);

      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      // 绑定 AbortSignal
      if (signal) {
        if (signal.aborted) {
          reject(new Error('Request was aborted'));
          return;
        }
        signal.addEventListener('abort', () => {
          req.destroy(new Error('Request was aborted'));
        }, { once: true });
      }

      const req = lib.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          let errorData = '';
          res.on('data', (chunk) => { errorData += chunk; });
          res.on('end', () => {
            reject(new Error(`${this.constructor.name} API error ${res.statusCode}: ${errorData}`));
          });
          return;
        }

        resolve(res);
      });

      req.on('error', reject);
      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error(`${this.constructor.name} API request timeout (60s)`));
      });
      req.write(postData);
      req.end();
    });
  }

  /**
   * 真正的流式 SSE 解析器
   *
   * 逐行读取 IncomingMessage，每个包含文本内容的 delta 立即 yield
   * 工具调用增量累积，在流结束时（[DONE]）一次性 yield
   * finishReason 从最后一条有效 SSE chunk 中提取
   */
  protected async *parseSSEStream(res: IncomingMessage): AsyncGenerator<LLMResponse> {
    let buffer = '';
    let content = '';
    const toolCallMap = new Map<number, { id: string; name: string; args: string }>();
    let lastFinishReason: string | null = null;

    for await (const chunk of res) {
      if (abortController?.signal.aborted) break;

      buffer += chunk.toString('utf-8');
      const lines = buffer.split('\n');
      // 最后一个元素可能是不完整的行，保留在 buffer 中
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.replace(/\r$/, ''); // 兼容 \r\n
        if (!trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6).trim();
        if (jsonStr === '[DONE]') {
          // 流结束，yield 工具调用（如果有）
          if (toolCallMap.size > 0) {
            const toolCalls: ToolCall[] = [];
            for (const [, entry] of toolCallMap) {
              let parsedArgs: Record<string, any> = {};
              try {
                parsedArgs = JSON.parse(entry.args || '{}');
              } catch {
                parsedArgs = { raw: entry.args };
              }
              toolCalls.push({
                id: entry.id || generateToolCallId(),
                name: entry.name,
                args: parsedArgs,
              });
            }
            yield {
              content: '', // 工具调用 chunk 不携带文本
              toolCalls,
              finishReason: (lastFinishReason as any) || 'tool_calls',
            };
          }
          return; // 流结束
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta;
          const finishReason = parsed.choices?.[0]?.finish_reason;

          // 记录 finishReason（最后一条有效值）
          if (finishReason) {
            lastFinishReason = finishReason;
          }

          if (!delta) continue;

          // 文本内容 — 立即 yield，实现打字机效果
          if (delta.content) {
            content += delta.content;
            yield {
              content: delta.content, // 每次 yield 增量文本
              finishReason: undefined as any, // 中间 chunk 无 finishReason
            };
          }

          // 累积工具调用增量
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.index !== undefined) {
                if (!toolCallMap.has(tc.index)) {
                  toolCallMap.set(tc.index, { id: '', name: '', args: '' });
                }
                const entry = toolCallMap.get(tc.index)!;
                if (tc.id) entry.id = tc.id; // 保留服务端返回的 ID
                if (tc.function?.name) entry.name += tc.function.name;
                if (tc.function?.arguments) entry.args += tc.function.arguments;
              }
            }
          }
        } catch {
          // 跳过解析失败的行
        }
      }
    }

    // 如果流没有正常结束（异常断开），仍然尝试 yield 工具调用
    if (toolCallMap.size > 0) {
      const toolCalls: ToolCall[] = [];
      for (const [, entry] of toolCallMap) {
        let parsedArgs: Record<string, any> = {};
        try {
          parsedArgs = JSON.parse(entry.args || '{}');
        } catch {
          parsedArgs = { raw: entry.args };
        }
        toolCalls.push({
          id: entry.id || generateToolCallId(),
          name: entry.name,
          args: parsedArgs,
        });
      }
      yield {
        content: '',
        toolCalls,
        finishReason: (lastFinishReason as any) || 'tool_calls',
      };
    }
  }
}

// 引用外部的 abortController（AgentEngine 模块级变量）
// 通过 setAbortController 注入，避免循环依赖
let abortController: AbortController | null = null;

export function setAbortController(ac: AbortController | null): void {
  abortController = ac;
}

/**
 * 通义千问 Provider 实现
 * DashScope OpenAI 兼容模式
 */
class QwenProvider extends DeepSeekProvider implements LLMProvider {
  constructor(config: LLMConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_MODELS.qwen.baseUrl,
      model: config.model || PROVIDER_MODELS.qwen.defaultModel,
    });
  }

  getModelName(): string {
    return this.config.model;
  }
}

/**
 * Kimi (Moonshot) Provider 实现
 * API 兼容 OpenAI 格式
 */
class MoonshotProvider extends DeepSeekProvider implements LLMProvider {
  constructor(config: LLMConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_MODELS.moonshot.baseUrl,
      model: config.model || PROVIDER_MODELS.moonshot.defaultModel,
    });
  }

  getModelName(): string {
    return this.config.model;
  }
}

/**
 * Ollama Provider 实现
 * 本地部署，使用 localhost HTTP
 */
class OllamaProvider implements LLMProvider {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || PROVIDER_MODELS.ollama.baseUrl,
      model: config.model || PROVIDER_MODELS.ollama.defaultModel,
    };
  }

  async *chat(messages: LLMMessage[], tools?: ToolDefinition[]): AsyncGenerator<LLMResponse> {
    const body: any = {
      model: this.config.model,
      messages,
      stream: false,
      options: {
        temperature: this.config.temperature ?? 0.7,
        num_predict: this.config.maxTokens ?? 4096,
      },
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: t.function,
      }));
    }

    try {
      const result = await this.makeRequest(body);
      const toolCalls: ToolCall[] = [];

      if (result.tool_calls) {
        for (const tc of result.tool_calls) {
          toolCalls.push({
            id: generateToolCallId(),
            name: tc.function.name,
            args: tc.function.arguments,
          });
        }
      }

      yield {
        content: result.message?.content || '',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      };
    } catch (error: any) {
      yield {
        content: '',
        finishReason: 'stop',
      };
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const url = new URL(`${this.config.baseUrl}/api/tags`);
      http
        .get(url.href, (res) => {
          resolve(res.statusCode === 200);
        })
        .on('error', () => resolve(false))
        .setTimeout(5000, () => {
          resolve(false);
        });
    });
  }

  getModelName(): string {
    return this.config.model;
  }

  private makeRequest(body: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.config.baseUrl}/api/chat`);
      const postData = JSON.stringify(body);

      const options = {
        hostname: url.hostname,
        port: url.port || 11434,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Ollama response parse error: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(120000, () => {
        req.destroy();
        reject(new Error('Ollama API request timeout (120s)'));
      });
      req.write(postData);
      req.end();
    });
  }
}

/**
 * 创建 LLM Provider 实例
 */
export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'deepseek':
      return new DeepSeekProvider(config);
    case 'qwen':
      return new QwenProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    case 'moonshot':
      return new MoonshotProvider(config);
    default:
      return new DeepSeekProvider(config);
  }
}

export { DeepSeekProvider, QwenProvider, OllamaProvider, MoonshotProvider };
