/**
 * Agent 状态管理 Store (Zustand + Immer)
 * 
 * 管理 AI 助手的所有 UI 状态：对话列表、消息记录、流式输出、工具确认等
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  AgentState,
  AgentStatus,
  ChatMessage,
  Conversation,
  PendingConfirmation,
  SafeAgentConfig,
  PageContext,
  AgentStreamChunk,
} from '../types/agent';

// ========== 内部 Action 类型 ==========

interface AgentActions {
  // --- 侧边栏 ---
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;

  // --- 状态 ---
  setStatus: (status: AgentStatus) => void;
  setError: (error?: string) => void;

  // --- 上下文 ---
  setContext: (context: PageContext) => void;

  // --- 配置 ---
  setConfig: (config: SafeAgentConfig) => void;

  // --- 对话列表 ---
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (conversationId: string) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;

  // --- 当前对话 ---
  selectConversation: (conversationId: string) => void;
  startNewConversation: () => void;

  // --- 消息 ---
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  appendStreamText: (conversationId: string, content: string) => void;
  finalizeStreamMessage: (conversationId: string) => void;

  // --- 工具确认 ---
  setPendingConfirmation: (confirmation?: PendingConfirmation) => void;

  // --- 流式响应处理 ---
  handleStreamChunk: (chunk: AgentStreamChunk) => void;

  // --- 重置 ---
  resetConversation: () => void;
}

// ========== 初始状态 ==========

const initialState: AgentState = {
  enabled: true,
  sidebarOpen: false,
  status: 'idle',
  error: undefined,
  currentConversationId: undefined,
  conversations: [],
  messages: [],
  pendingConfirmation: undefined,
  config: undefined,
  context: {},
};

// ========== Store 创建 ==========

export const useAgentStore = create<AgentState & AgentActions>()(
  immer((set) => ({
    ...initialState,

    // --- 侧边栏 ---
    toggleSidebar: () =>
      set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      }),

    openSidebar: () =>
      set((state) => {
        state.sidebarOpen = true;
      }),

    closeSidebar: () =>
      set((state) => {
        state.sidebarOpen = false;
      }),

    // --- 状态 ---
    setStatus: (status) =>
      set((state) => {
        state.status = status;
        if (status !== 'error') {
          state.error = undefined;
        }
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
        if (error) {
          state.status = 'error';
        }
      }),

    // --- 上下文 ---
    setContext: (context) =>
      set((state) => {
        state.context = context;
      }),

    // --- 配置 ---
    setConfig: (config) =>
      set((state) => {
        state.config = config;
        state.enabled = config.enabled;
      }),

    // --- 对话列表 ---
    setConversations: (conversations) =>
      set((state) => {
        state.conversations = conversations;
      }),

    addConversation: (conversation) =>
      set((state) => {
        // 插入到列表头部（最新对话优先）
        state.conversations.unshift(conversation);
      }),

    removeConversation: (conversationId) =>
      set((state) => {
        state.conversations = state.conversations.filter(
          (c) => c.id !== conversationId
        );
        // 如果删除的是当前对话，清空消息
        if (state.currentConversationId === conversationId) {
          state.currentConversationId = undefined;
          state.messages = [];
        }
      }),

    updateConversationTitle: (conversationId, title) =>
      set((state) => {
        const conv = state.conversations.find((c) => c.id === conversationId);
        if (conv) {
          conv.title = title;
        }
      }),

    // --- 当前对话 ---
    selectConversation: (conversationId) =>
      set((state) => {
        state.currentConversationId = conversationId;
        state.messages = [];
        state.status = 'idle';
        state.error = undefined;
        state.pendingConfirmation = undefined;
      }),

    startNewConversation: () =>
      set((state) => {
        state.currentConversationId = undefined;
        state.messages = [];
        state.status = 'idle';
        state.error = undefined;
        state.pendingConfirmation = undefined;
      }),

    // --- 消息 ---
    setMessages: (messages) =>
      set((state) => {
        state.messages = messages;
      }),

    addMessage: (message) =>
      set((state) => {
        state.messages.push(message);
      }),

    // 追加流式文本到最后一条 assistant 消息
    appendStreamText: (conversationId, content) =>
      set((state) => {
        const lastMsg = state.messages[state.messages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          lastMsg.content += content;
        } else {
          // 创建新的流式消息
          state.messages.push({
            id: `stream-${Date.now()}`,
            conversationId,
            role: 'assistant',
            content,
            createdAt: new Date().toISOString(),
            isStreaming: true,
          });
        }
        // 更新对话时间
        const conv = state.conversations.find((c) => c.id === conversationId);
        if (conv) {
          conv.updatedAt = new Date().toISOString();
        }
      }),

    // 将流式消息标记为完成
    finalizeStreamMessage: (_conversationId) =>
      set((state) => {
        const lastMsg = state.messages[state.messages.length - 1];
        if (lastMsg && lastMsg.isStreaming) {
          lastMsg.isStreaming = false;
        }
      }),

    // --- 工具确认 ---
    setPendingConfirmation: (confirmation) =>
      set((state) => {
        state.pendingConfirmation = confirmation;
        if (confirmation) {
          state.status = 'confirming';
        } else if (state.status === 'confirming') {
          state.status = 'streaming';
        }
      }),

    // --- 流式响应处理（核心） ---
    handleStreamChunk: (chunk) =>
      set((state) => {
        switch (chunk.type) {
          case 'text': {
            state.status = 'streaming';
            // 追加到最后一条流式 assistant 消息
            const lastMsg = state.messages[state.messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
              lastMsg.content += chunk.content;
            } else {
              state.messages.push({
                id: `stream-${Date.now()}`,
                conversationId: chunk.conversationId,
                role: 'assistant',
                content: chunk.content,
                createdAt: new Date().toISOString(),
                isStreaming: true,
              });
            }
            // 更新对话 ID（首次对话时由主进程分配）
            if (!state.currentConversationId) {
              state.currentConversationId = chunk.conversationId;
            }
            break;
          }

          case 'tool_call': {
            state.status = 'tool_calling';
            break;
          }

          case 'tool_result': {
            state.status = 'tool_calling';
            break;
          }

          case 'confirmation_required': {
            state.status = 'confirming';
            state.pendingConfirmation = {
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              toolArgs: chunk.toolArgs,
              description: chunk.description,
            };
            break;
          }

          case 'error': {
            state.status = 'error';
            state.error = chunk.content;
            // 完成最后一条流式消息
            const lastMsg = state.messages[state.messages.length - 1];
            if (lastMsg && lastMsg.isStreaming) {
              lastMsg.isStreaming = false;
            }
            break;
          }

          case 'done': {
            state.status = 'idle';
            state.pendingConfirmation = undefined;
            // 更新 conversationId
            if (!state.currentConversationId) {
              state.currentConversationId = chunk.conversationId;
            }
            // 完成最后一条流式消息
            const lastMsg2 = state.messages[state.messages.length - 1];
            if (lastMsg2 && lastMsg2.isStreaming) {
              lastMsg2.isStreaming = false;
              lastMsg2.id = `msg-${Date.now()}`;
            }
            // 如果是新对话，添加到对话列表
            const convExists = state.conversations.some(
              (c) => c.id === chunk.conversationId
            );
            if (!convExists) {
              const firstUserMsg = state.messages.find((m) => m.role === 'user');
              const title = firstUserMsg
                ? firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')
                : '新对话';
              state.conversations.unshift({
                id: chunk.conversationId,
                title,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
            break;
          }
        }
      }),

    // --- 重置 ---
    resetConversation: () =>
      set((state) => {
        state.currentConversationId = undefined;
        state.messages = [];
        state.status = 'idle';
        state.error = undefined;
        state.pendingConfirmation = undefined;
      }),
  }))
);
