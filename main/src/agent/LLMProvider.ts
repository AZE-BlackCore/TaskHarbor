/**
 * LLM Provider 抽象层
 * 使用 Node.js 原生 https/http 模块调用 LLM API，避免 CommonJS 兼容问题
 */

import * as https from 'https';
import * as http from 'http';
import type { LLMProvider, LLMMessage, LLMResponse, LLMConfig, ToolDefinition, ToolCall } from './types';
import { PROVIDER_MODELS } from './types';

/**
 * 创建唯一 ID
 */
function generateToolCallId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * DeepSeek Provider 实现
 * API 兼容 OpenAI 格式
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

  async *chat(messages: LLMMessage[], tools?: ToolDefinition[]): AsyncGenerator<LLMResponse> {
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

    const response = await this.makeRequest(body);
    yield* this.parseSSEStream(response, tools);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.makeRequest({
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

  private makeRequest(body: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.config.baseUrl}/v1/chat/completions`);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const postData = JSON.stringify(body);

      const options = {
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

      const req = lib.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          let errorData = '';
          res.on('data', (chunk) => { errorData += chunk; });
          res.on('end', () => {
            reject(new Error(`DeepSeek API error ${res.statusCode}: ${errorData}`));
          });
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      });

      req.on('error', reject);
      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error('DeepSeek API request timeout (60s)'));
      });
      req.write(postData);
      req.end();
    });
  }

  private async *parseSSEStream(data: string, _tools?: ToolDefinition[]): AsyncGenerator<LLMResponse> {
    const lines = data.split('\n');
    let content = '';
    const toolCalls: ToolCall[] = [];
    const toolCallMap = new Map<number, { name: string; args: string }>();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') break;

      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta;
        if (!delta) continue;

        // 累积文本内容
        if (delta.content) {
          content += delta.content;
        }

        // 累积工具调用
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              if (!toolCallMap.has(tc.index)) {
                toolCallMap.set(tc.index, { name: '', args: '' });
              }
              const entry = toolCallMap.get(tc.index)!;
              if (tc.id) {
                // 新的工具调用使用服务端 ID 或本地 ID
              }
              if (tc.function?.name) entry.name += tc.function.name;
              if (tc.function?.arguments) entry.args += tc.function.arguments;
            }
          }
        }
      } catch {
        // 跳过解析失败的行
      }
    }

    // 构建工具调用
    if (toolCallMap.size > 0) {
      for (const [_, entry] of toolCallMap) {
        let parsedArgs: Record<string, any> = {};
        try {
          parsedArgs = JSON.parse(entry.args);
        } catch {
          parsedArgs = { raw: entry.args };
        }
        toolCalls.push({
          id: generateToolCallId(),
          name: entry.name,
          args: parsedArgs,
        });
      }
    }

    yield {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
    };
  }
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
 * CoPaw Provider 实现
 *
 * 通过 CoPaw 本地服务（或远程服务）提供 LLM 能力
 * CoPaw 服务暴露 OpenAI 兼容的 /api/chat 端点
 */
class CoPawProvider extends DeepSeekProvider {
  constructor(config: LLMConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_MODELS.copaw.baseUrl,
      model: config.model || PROVIDER_MODELS.copaw.defaultModel,
    });
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const baseUrl = this.config.baseUrl || PROVIDER_MODELS.copaw.baseUrl;
      // 检测 /api/health 端点
      const url = new URL('/api/health', baseUrl);
      const lib = url.protocol === 'https:' ? https : http;

      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? '443' : '80'),
          path: url.pathname,
          method: 'GET',
        },
        (res) => {
          resolve(res.statusCode !== undefined && res.statusCode < 500);
        }
      );
      req.on('error', () => resolve(false));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });
  }

  getModelName(): string {
    return `CoPaw/${this.config.model}`;
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
    case 'copaw':
      return new CoPawProvider(config);
    default:
      return new DeepSeekProvider(config);
  }
}

export { DeepSeekProvider, QwenProvider, OllamaProvider, CoPawProvider };
