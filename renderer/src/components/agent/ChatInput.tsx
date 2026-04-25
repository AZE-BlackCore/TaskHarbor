/**
 * ChatInput - 聊天输入框组件
 *
 * 支持：
 * - Enter 发送，Shift+Enter 换行
 * - 发送中禁用
 * - 快捷操作按钮
 */

import React, { memo, useRef, useState, useCallback, KeyboardEvent } from 'react';
import { Send, Square, Zap } from 'lucide-react';
import type { AgentStatus } from '../../types/agent';

interface ChatInputProps {
  onSend: (message: string) => void;
  onCancel: () => void;
  status: AgentStatus;
  disabled?: boolean;
}

// 快捷操作建议
const QUICK_SUGGESTIONS = [
  '今天有哪些任务？',
  '帮我生成今日工作报告',
  '查看逾期任务',
  '创建一个新任务',
];

export const ChatInput = memo(({ onSend, onCancel, status, disabled }: ChatInputProps) => {
  const [text, setText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = status === 'streaming' || status === 'thinking' || status === 'tool_calling';
  const isConfirming = status === 'confirming';
  const canSend = !disabled && !isStreaming && !isConfirming && text.trim().length > 0;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    const msg = text.trim();
    setText('');
    // 自动收缩 textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onSend(msg);
  }, [canSend, text, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // 自适应高度
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  const handleSuggestion = useCallback(
    (s: string) => {
      setText('');
      setShowSuggestions(false);
      onSend(s);
    },
    [onSend]
  );

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 p-3 bg-white dark:bg-dark-card">
      {/* 快捷建议 */}
      {showSuggestions && !isStreaming && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* 快捷操作触发按钮 */}
        <button
          onClick={() => setShowSuggestions((v) => !v)}
          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            showSuggestions
              ? 'bg-primary/10 text-primary'
              : 'text-gray-400 hover:text-primary hover:bg-primary/5'
          }`}
          title="快捷操作"
          disabled={isStreaming}
          aria-label="显示快捷操作"
        >
          <Zap className="w-4 h-4" />
        </button>

        {/* 输入框 */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(false)}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-primary dark:focus:border-primary transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 leading-relaxed"
          placeholder={
            isConfirming
              ? '请先确认或取消工具操作...'
              : isStreaming
              ? 'AI 正在回复...'
              : '输入消息（Enter 发送，Shift+Enter 换行）'
          }
          disabled={disabled || isConfirming}
          aria-label="聊天输入框"
          style={{ minHeight: '38px' }}
        />

        {/* 发送 / 取消按钮 */}
        {isStreaming ? (
          <button
            onClick={onCancel}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
            title="停止生成"
            aria-label="停止生成"
          >
            <Square className="w-4 h-4 fill-white" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              canSend
                ? 'bg-primary hover:bg-primary/90 text-white shadow-sm hover:shadow'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
            title="发送消息"
            aria-label="发送消息"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 提示文字 */}
      <p className="text-[10px] text-gray-300 dark:text-gray-600 text-center mt-1.5">
        AI 可能出错，重要操作请再次核实
      </p>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
