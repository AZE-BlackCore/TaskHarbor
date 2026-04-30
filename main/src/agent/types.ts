/**
 * Agent 模块类型定义
 * 统一的类型系统，供主进程 Agent 模块内部使用
 */

// ========== LLM 相关类型 ==========

export type LLMProviderType = 'deepseek' | 'qwen' | 'ollama' | 'moonshot';

export interface LLMConfig {
  provider: LLMProviderType;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length';
}

export interface LLMProvider {
  chat(messages: LLMMessage[], tools?: ToolDefinition[], signal?: AbortSignal): AsyncGenerator<LLMResponse>;
  isAvailable(): Promise<boolean>;
  getModelName(): string;
}

// ========== 工具相关类型 ==========

export interface ToolParameter {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  description?: string;
  enum?: string[];
  items?: Record<string, any>;  // 用于 array 类型
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, ToolParameter>;
      required?: string[];
    };
  };
}

export interface AgentTool {
  definition: ToolDefinition;
  execute: (params: Record<string, any>) => Promise<any>;
  requireConfirmation?: boolean;
  formatConfirmation?: (params: Record<string, any>) => string;
}

// ========== Agent 引擎类型 ==========

export interface PageContext {
  currentView: string;
  currentProjectId: string | null;
  currentProjectName: string | null;
  selectedTaskId: string | null;
  selectedTaskDescription: string | null;
  selectedTaskIds: string[];
  taskSummary: string;
  recentChanges: string;
}

export interface AgentRequest {
  message: string;
  context?: Partial<PageContext>;
  conversationId?: string;
}

export type AgentStreamChunk =
  | { type: 'text'; content: string; conversationId: string }
  | { type: 'tool_call'; toolName: string; toolArgs: any; toolCallId: string }
  | { type: 'tool_result'; toolName: string; toolResult: any; toolCallId: string }
  | { type: 'confirmation_required'; toolName: string; toolArgs: any; toolCallId: string; description: string }
  | { type: 'error'; content: string }
  | { type: 'done'; conversationId: string };

// ========== 对话记忆类型 ==========

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  provider: string;
  model: string;
  messageCount: number;
}

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  context?: Partial<PageContext>;
  createdAt: string;
}

// ========== Agent 配置类型 ==========

export interface AgentConfig {
  provider: LLMProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  streamEnabled: boolean;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  provider: 'deepseek',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 4096,
  streamEnabled: true,
};

// ========== 默认 Provider 模型映射 ==========

export const PROVIDER_MODELS: Record<LLMProviderType, { defaultModel: string; baseUrl: string; models: string[] }> = {
  deepseek: {
    defaultModel: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  qwen: {
    defaultModel: 'qwen-turbo',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'],
  },
  ollama: {
    defaultModel: 'qwen2.5:7b',
    baseUrl: 'http://localhost:11434',
    models: ['qwen2.5:7b', 'llama3:8b', 'codellama:13b'],
  },
  moonshot: {
    defaultModel: 'moonshot-v1-8k',
    baseUrl: 'https://api.moonshot.cn',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  },
};
