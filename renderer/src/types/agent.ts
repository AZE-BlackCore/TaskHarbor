/**
 * 渲染进程 Agent 相关类型定义
 * 与主进程 types.ts 对应，用于前端 UI 和状态管理
 */

// ========== LLM Provider ==========

export type LLMProviderType = 'deepseek' | 'qwen' | 'ollama' | 'copaw';

export interface AgentConfig {
  provider: LLMProviderType;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  enabled: boolean;
  autoContext: boolean;
  confirmBeforeWrite: boolean;
}

// 脱敏后的配置（API Key 会被遮掩）
export interface SafeAgentConfig extends AgentConfig {
  apiKey?: string; // 格式：sk-****xxxx
}

// ========== 流式响应 Chunk ==========

export type AgentStreamChunk =
  | { type: 'text'; content: string; conversationId: string }
  | { type: 'tool_call'; toolName: string; toolArgs: Record<string, unknown>; toolCallId: string }
  | { type: 'tool_result'; toolName: string; toolResult: unknown; toolCallId: string }
  | { type: 'confirmation_required'; toolName: string; toolArgs: Record<string, unknown>; toolCallId: string; description: string }
  | { type: 'error'; content: string }
  | { type: 'done'; conversationId: string };

// ========== 对话历史 ==========

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type ChatMessageRole = 'user' | 'assistant' | 'tool' | 'system';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatMessageRole;
  content: string;
  toolCalls?: ToolCallRecord[];
  toolCallId?: string;
  createdAt: string;
  /** 是否正在流式输出中（临时状态，不存储到 DB） */
  isStreaming?: boolean;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

// ========== 工具确认 ==========

export interface PendingConfirmation {
  toolCallId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  description: string;
}

// ========== 上下文 ==========

export interface PageContext {
  page?: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  selectedItems?: string[];
  viewType?: string;
}

// ========== 请求 ==========

export interface AgentRequest {
  conversationId?: string;
  message: string;
  context?: PageContext;
}

// ========== UI 状态 ==========

export type AgentStatus =
  | 'idle'        // 空闲
  | 'thinking'    // LLM 推理中
  | 'streaming'   // 流式输出文本
  | 'tool_calling' // 执行工具
  | 'confirming'  // 等待用户确认
  | 'error';      // 出错

export interface AgentState {
  // 是否启用 Agent
  enabled: boolean;
  // 侧边栏是否展开
  sidebarOpen: boolean;
  // 当前状态
  status: AgentStatus;
  // 当前错误信息
  error?: string;
  // 当前对话 ID
  currentConversationId?: string;
  // 对话历史列表
  conversations: Conversation[];
  // 当前对话的所有消息（UI 展示用，包含流式中消息）
  messages: ChatMessage[];
  // 等待用户确认的工具调用
  pendingConfirmation?: PendingConfirmation;
  // Agent 配置（脱敏版）
  config?: SafeAgentConfig;
  // 当前页面上下文
  context: PageContext;
}
