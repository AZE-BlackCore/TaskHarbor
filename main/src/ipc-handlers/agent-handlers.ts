/**
 * Agent IPC 处理器
 * 处理渲染进程发来的 Agent 相关 IPC 请求，流式推送响应
 */

import { ipcMain } from 'electron';
import type { AgentRequest } from '../agent/types';
import { chat, cancelCurrentChat, resolveToolConfirmation } from '../agent/AgentEngine';
import { conversationMemory } from '../agent/ConversationMemory';
import {
  getAgentConfig,
  saveAgentConfig,
  getSafeConfig,
} from '../services/agentConfigService';
import { createLLMProvider } from '../agent/LLMProvider';

export function setupAgentHandlers(): void {
  // ========== 流式对话 ==========
  ipcMain.handle('agent:chat', async (event, request: AgentRequest) => {
    try {
      for await (const chunk of chat(request)) {
        // 检查渲染进程是否还在（窗口可能已关闭）
        if (event.sender.isDestroyed()) break;
        event.sender.send('agent:stream', chunk);
      }
      return { success: true };
    } catch (error: any) {
      console.error('[AgentHandlers] chat error:', error);
      if (!event.sender.isDestroyed()) {
        event.sender.send('agent:stream', {
          type: 'error',
          content: error.message || '未知错误',
        });
      }
      return { success: false, error: error.message };
    }
  });

  // ========== 确认/拒绝工具调用 ==========
  ipcMain.handle('agent:confirmToolCall', async (_event, toolCallId: string, approved: boolean) => {
    resolveToolConfirmation(toolCallId, approved);
    return { success: true };
  });

  // ========== 取消当前对话 ==========
  ipcMain.handle('agent:cancel', async () => {
    cancelCurrentChat();
    return { success: true };
  });

  // ========== 获取配置（脱敏） ==========
  ipcMain.handle('agent:getConfig', async () => {
    try {
      return { success: true, config: getSafeConfig() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ========== 更新配置 ==========
  ipcMain.handle('agent:updateConfig', async (_event, config: Record<string, any>) => {
    try {
      const updated = saveAgentConfig(config);
      return { success: true, config: getSafeConfig() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ========== 测试 LLM 连接 ==========
  ipcMain.handle('agent:testConnection', async (_event, providerType?: string) => {
    try {
      const config = getAgentConfig();
      if (providerType) {
        config.provider = providerType as any;
      }
      const provider = createLLMProvider(config);
      const available = await provider.isAvailable();
      return {
        success: true,
        available,
        provider: config.provider,
        model: provider.getModelName(),
      };
    } catch (error: any) {
      return {
        success: false,
        available: false,
        error: error.message,
      };
    }
  });

  // ========== 获取对话历史列表 ==========
  ipcMain.handle('agent:listConversations', async () => {
    try {
      const conversations = await conversationMemory.listConversations();
      return { success: true, conversations };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ========== 获取指定对话的消息记录 ==========
  ipcMain.handle('agent:getMessages', async (_event, conversationId: string) => {
    try {
      const messages = await conversationMemory.getFullMessageRecords(conversationId);
      return { success: true, messages };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ========== 删除指定对话 ==========
  ipcMain.handle('agent:deleteConversation', async (_event, conversationId: string) => {
    try {
      await conversationMemory.deleteConversation(conversationId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ========== 清空所有对话历史 ==========
  ipcMain.handle('agent:clearHistory', async () => {
    try {
      await conversationMemory.clearAllConversations();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ========== 导出对话为 Markdown ==========
  ipcMain.handle('agent:exportConversation', async (_event, conversationId: string) => {
    try {
      const markdown = await conversationMemory.exportConversation(conversationId);
      return { success: true, markdown };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  console.log('[AgentHandlers] All agent IPC handlers registered');
}
