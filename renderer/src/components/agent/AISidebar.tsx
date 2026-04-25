/**
 * AISidebar - 右侧 AI 对话侧边栏
 *
 * - 可折叠，宽度 380px
 * - 包含对话历史列表 + 当前对话消息 + 输入框
 * - 集成工具确认卡片
 * - 支持新建对话 / 切换历史对话
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  X,
  PlusCircle,
  MessageSquare,
  History,
  Trash2,
  ChevronLeft,
  Settings,
  Loader2,
  AlertCircle,
  Bot,
} from 'lucide-react';
import { useAgent } from '../../hooks/useAgent';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ToolConfirmation } from './ToolConfirmation';
import { ContextBadge } from './ContextBadge';
import { QuickActions } from './QuickActions';

interface AISidebarProps {
  onOpenSettings?: () => void;
}

export function AISidebar({ onOpenSettings }: AISidebarProps) {
  const agent = useAgent();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  // 挂载时加载配置和对话历史
  useEffect(() => {
    agent.loadConfig();
    agent.loadConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 消息列表自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agent.messages]);

  const handleSend = useCallback(
    (msg: string) => {
      agent.sendMessage(msg);
    },
    [agent]
  );

  const handleConfirm = useCallback(
    (approved: boolean) => {
      agent.confirmToolCall(approved);
    },
    [agent]
  );

  const handleSelectConversation = useCallback(
    (id: string) => {
      agent.selectConversation(id);
      setShowHistory(false);
    },
    [agent]
  );

  // 侧边栏收起时不渲染内容
  if (!agent.sidebarOpen) return null;

  return (
    <div
      className="w-[380px] flex-shrink-0 flex flex-col border-l border-gray-100 dark:border-gray-700 bg-white dark:bg-dark-card h-screen overflow-hidden"
      role="complementary"
      aria-label="AI 助手侧边栏"
    >
      {/* ===== 顶部栏 ===== */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-primary flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900 dark:text-white text-sm flex-1">
          CoPaw AI
        </span>

        {/* 状态指示 */}
        {agent.status === 'thinking' || agent.status === 'streaming' || agent.status === 'tool_calling' ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : agent.status === 'error' ? (
          <AlertCircle className="w-4 h-4 text-red-500" title={agent.error} />
        ) : null}

        {/* 工具栏按钮 */}
        <button
          onClick={() => setShowHistory((v) => !v)}
          className={`p-1.5 rounded-lg transition-colors ${
            showHistory
              ? 'bg-primary/10 text-primary'
              : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="对话历史"
          aria-label="查看对话历史"
        >
          <History className="w-4 h-4" />
        </button>

        <button
          onClick={agent.startNewConversation}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="新建对话"
          aria-label="新建对话"
        >
          <PlusCircle className="w-4 h-4" />
        </button>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="AI 设置"
            aria-label="AI 设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={agent.closeSidebar}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="关闭侧边栏"
          aria-label="关闭 AI 侧边栏"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ===== 历史对话面板（覆盖层） ===== */}
      {showHistory && (
        <div className="absolute right-0 top-0 w-[380px] h-full bg-white dark:bg-dark-card z-10 flex flex-col border-l border-gray-100 dark:border-gray-700">
          {/* 历史顶部 */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={() => setShowHistory(false)}
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              aria-label="返回"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold text-gray-900 dark:text-white text-sm flex-1">
              对话历史
            </span>
            <button
              onClick={async () => {
                if (confirm('确定要清空所有对话历史吗？此操作不可恢复。')) {
                  await agent.clearHistory();
                  setShowHistory(false);
                }
              }}
              className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="清空所有历史"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空
            </button>
          </div>

          {/* 历史列表 */}
          <div className="flex-1 overflow-y-auto py-2">
            {agent.conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">暂无对话历史</p>
              </div>
            ) : (
              agent.conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    conv.id === agent.currentConversationId
                      ? 'bg-primary/5 border-r-2 border-primary'
                      : ''
                  }`}
                  onClick={() => handleSelectConversation(conv.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectConversation(conv.id)}
                >
                  <MessageSquare className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium">
                      {conv.title}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      {formatRelativeTime(conv.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`确定删除对话"${conv.title}"吗？`)) {
                        agent.deleteConversation(conv.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all"
                    title="删除此对话"
                    aria-label="删除对话"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===== 上下文标签 ===== */}
      <ContextBadge
        context={agent.context}
        onClear={() => agent.setContext({})}
      />

      {/* ===== 消息区域 ===== */}
      <div className="flex-1 overflow-y-auto px-3 py-3" role="list" aria-label="对话消息">
        {agent.messages.length === 0 && !agent.currentConversationId ? (
          // 空状态：显示快捷操作
          <QuickActions onAction={handleSend} />
        ) : (
          <>
            {agent.messages.map((msg) => (
              <React.Fragment key={msg.id}>
                <ChatMessage message={msg} />
                {/* 工具确认卡片（显示在触发的消息之后） */}
                {agent.pendingConfirmation && msg === agent.messages[agent.messages.length - 1] && (
                  <ToolConfirmation
                    confirmation={agent.pendingConfirmation}
                    onConfirm={handleConfirm}
                  />
                )}
              </React.Fragment>
            ))}

            {/* 错误提示 */}
            {agent.status === 'error' && agent.error && (
              <div className="flex items-start gap-2 my-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">出错了</p>
                  <p className="text-red-600 dark:text-red-400 mt-0.5">{agent.error}</p>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ===== 输入区域 ===== */}
      <ChatInput
        onSend={handleSend}
        onCancel={agent.cancelChat}
        status={agent.status}
        disabled={!agent.enabled}
      />
    </div>
  );
}

// 相对时间格式化
function formatRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins} 分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  } catch {
    return '';
  }
}
