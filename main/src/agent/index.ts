/**
 * Agent 模块入口
 * 
 * 导出 Agent 核心功能，供 IPC handlers 使用
 */

export { resolveToolConfirmation, cancelCurrentChat, chat as agentChat } from './AgentEngine';
export { toolRegistry } from './ToolRegistry';
export { conversationMemory } from './ConversationMemory';
export { contextCollector } from './ContextCollector';
export * from './types';
