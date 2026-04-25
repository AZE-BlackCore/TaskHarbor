/**
 * useAgent Hook
 *
 * 封装 AI Agent 的核心交互逻辑：
 * - 发送消息（触发流式对话）
 * - 监听流式 chunk（agentStore.handleStreamChunk）
 * - 确认 / 拒绝工具调用
 * - 取消当前对话
 * - 初始化（加载历史、加载配置）
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAgentStore } from '../stores/agentStore';
import type { AgentRequest, AgentStreamChunk, PageContext } from '../types/agent';

// ========== 主 Hook ==========

export function useAgent() {
  const store = useAgentStore();
  const streamCleanupRef = useRef<(() => void) | null>(null);

  // 注册流式监听器（组件 mount 时注册，unmount 时清除）
  useEffect(() => {
    if (!window.electronAPI?.onAgentStream) return;

    const cleanup = window.electronAPI.onAgentStream((raw) => {
      const chunk = raw as AgentStreamChunk;
      store.handleStreamChunk(chunk);
    });

    streamCleanupRef.current = cleanup;

    return () => {
      cleanup?.();
      streamCleanupRef.current = null;
    };
  }, [store]);

  // ---- 发送消息 ----
  const sendMessage = useCallback(
    async (message: string, context?: PageContext): Promise<void> => {
      if (!message.trim()) return;
      if (store.status === 'streaming' || store.status === 'tool_calling') return;

      // 立即在 UI 中显示用户消息
      const userMsgId = `user-${Date.now()}`;
      store.addMessage({
        id: userMsgId,
        conversationId: store.currentConversationId ?? '',
        role: 'user',
        content: message.trim(),
        createdAt: new Date().toISOString(),
      });

      store.setStatus('thinking');
      store.setError(undefined);

      const request: AgentRequest = {
        conversationId: store.currentConversationId,
        message: message.trim(),
        context: context ?? store.context,
      };

      try {
        const result = await window.electronAPI.agentChat({
          conversationId: request.conversationId,
          message: request.message,
          context: request.context as Record<string, unknown>,
        });

        if (!result.success) {
          store.setError(result.error ?? 'Agent 调用失败');
        }
        // 流式输出通过 onAgentStream 异步推入，无需在此处理
      } catch (err) {
        store.setError(err instanceof Error ? err.message : '未知错误');
      }
    },
    [store]
  );

  // ---- 确认工具调用 ----
  const confirmToolCall = useCallback(
    async (approved: boolean): Promise<void> => {
      const pending = store.pendingConfirmation;
      if (!pending) return;

      store.setPendingConfirmation(undefined);

      try {
        await window.electronAPI.agentConfirmToolCall(pending.toolCallId, approved);
      } catch (err) {
        store.setError(err instanceof Error ? err.message : '确认工具调用失败');
      }
    },
    [store]
  );

  // ---- 取消当前对话 ----
  const cancelChat = useCallback(async (): Promise<void> => {
    try {
      await window.electronAPI.agentCancel();
      store.setStatus('idle');
    } catch (err) {
      console.error('取消对话失败:', err);
    }
  }, [store]);

  // ---- 加载对话列表 ----
  const loadConversations = useCallback(async (): Promise<void> => {
    try {
      const result = await window.electronAPI.agentListConversations();
      if (result.success && result.conversations) {
        store.setConversations(result.conversations);
      }
    } catch (err) {
      console.error('加载对话列表失败:', err);
    }
  }, [store]);

  // ---- 选择并加载对话消息 ----
  const selectConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      store.selectConversation(conversationId);

      try {
        const result = await window.electronAPI.agentGetMessages(conversationId);
        if (result.success && result.messages) {
          const messages = result.messages.map((m) => ({
            id: m.id as string,
            conversationId: m.conversationId as string,
            role: m.role as 'user' | 'assistant' | 'tool' | 'system',
            content: m.content as string,
            createdAt: m.createdAt as string,
          }));
          store.setMessages(messages);
        }
      } catch (err) {
        console.error('加载对话消息失败:', err);
      }
    },
    [store]
  );

  // ---- 删除对话 ----
  const deleteConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      try {
        const result = await window.electronAPI.agentDeleteConversation(conversationId);
        if (result.success) {
          store.removeConversation(conversationId);
        }
      } catch (err) {
        console.error('删除对话失败:', err);
      }
    },
    [store]
  );

  // ---- 清空所有历史 ----
  const clearHistory = useCallback(async (): Promise<void> => {
    try {
      const result = await window.electronAPI.agentClearHistory();
      if (result.success) {
        store.setConversations([]);
        store.startNewConversation();
      }
    } catch (err) {
      console.error('清空历史失败:', err);
    }
  }, [store]);

  // ---- 导出对话 ----
  const exportConversation = useCallback(
    async (conversationId: string): Promise<string | null> => {
      try {
        const result = await window.electronAPI.agentExportConversation(conversationId);
        if (result.success && result.markdown) {
          return result.markdown;
        }
      } catch (err) {
        console.error('导出对话失败:', err);
      }
      return null;
    },
    []
  );

  // ---- 加载配置 ----
  const loadConfig = useCallback(async (): Promise<void> => {
    try {
      const result = await window.electronAPI.agentGetConfig();
      if (result.success && result.config) {
        store.setConfig(result.config as Parameters<typeof store.setConfig>[0]);
      }
    } catch (err) {
      console.error('加载 Agent 配置失败:', err);
    }
  }, [store]);

  // ---- 更新配置 ----
  const updateConfig = useCallback(
    async (config: Record<string, unknown>): Promise<boolean> => {
      try {
        const result = await window.electronAPI.agentUpdateConfig(config);
        if (result.success && result.config) {
          store.setConfig(result.config as Parameters<typeof store.setConfig>[0]);
        }
        return result.success;
      } catch (err) {
        console.error('更新 Agent 配置失败:', err);
        return false;
      }
    },
    [store]
  );

  // ---- 测试连接 ----
  const testConnection = useCallback(
    async (providerType?: string): Promise<{ available: boolean; provider?: string; model?: string; error?: string }> => {
      try {
        const result = await window.electronAPI.agentTestConnection(providerType);
        return {
          available: result.available,
          provider: result.provider,
          model: result.model,
          error: result.error,
        };
      } catch (err) {
        return {
          available: false,
          error: err instanceof Error ? err.message : '连接测试失败',
        };
      }
    },
    []
  );

  // ---- 更新上下文 ----
  const setContext = useCallback(
    (context: PageContext): void => {
      store.setContext(context);
    },
    [store]
  );

  return {
    // state
    enabled: store.enabled,
    sidebarOpen: store.sidebarOpen,
    status: store.status,
    error: store.error,
    currentConversationId: store.currentConversationId,
    conversations: store.conversations,
    messages: store.messages,
    pendingConfirmation: store.pendingConfirmation,
    config: store.config,
    context: store.context,

    // sidebar
    toggleSidebar: store.toggleSidebar,
    openSidebar: store.openSidebar,
    closeSidebar: store.closeSidebar,

    // actions
    sendMessage,
    confirmToolCall,
    cancelChat,
    loadConversations,
    selectConversation,
    startNewConversation: store.startNewConversation,
    deleteConversation,
    clearHistory,
    exportConversation,
    loadConfig,
    updateConfig,
    testConnection,
    setContext,
  };
}
