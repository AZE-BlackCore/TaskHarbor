/**
 * ChatMessage - 聊天消息气泡组件
 *
 * 渲染 user / assistant / tool 三种角色的消息气泡
 */

import React, { memo } from 'react';
import { User, Bot } from 'lucide-react';
import { StreamingText } from './StreamingText';
import type { ChatMessage as ChatMessageType } from '../../types/agent';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage = memo(({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // 系统消息（灰色居中小字）
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      role="listitem"
    >
      {/* 头像 */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isUser
            ? 'bg-primary/10 text-primary'
            : 'bg-gradient-to-br from-violet-500 to-primary text-white'
        }`}
        aria-hidden="true"
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* 气泡内容 */}
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2.5 ${
          isUser
            ? 'bg-primary text-white rounded-tr-sm'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-sm shadow-sm'
        }`}
      >
        {isUser ? (
          // 用户消息：纯文本
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        ) : (
          // AI 消息：Markdown 渲染
          <StreamingText
            content={message.content}
            isStreaming={message.isStreaming}
            className="text-sm"
          />
        )}

        {/* 时间戳 */}
        <p
          className={`text-[10px] mt-1 ${
            isUser ? 'text-white/60 text-right' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
