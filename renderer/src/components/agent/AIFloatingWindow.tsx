/**
 * AIFloatingWindow - 浮动 AI 助手窗口
 *
 * 可拖拽的桌面卡片式 AI 助手，类似 TaskReminder
 * - 紧凑模式（仅输入框）
 * - 展开模式（显示最近几条消息）
 * - 支持最小化
 */

import React, { useState, useRef, useCallback } from 'react';
import { Bot, X, Minus, ChevronUp, Send, Loader2 } from 'lucide-react';
import { useAgent } from '../../hooks/useAgent';

interface AIFloatingWindowProps {
  /** 初始 X 位置 */
  initialX?: number;
  /** 初始 Y 位置 */
  initialY?: number;
}

export function AIFloatingWindow({ initialX = 40, initialY = 200 }: AIFloatingWindowProps) {
  const agent = useAgent();
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // 拖拽逻辑
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    dragOffsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      setPos({
        x: ev.clientX - dragOffsetRef.current.x,
        y: ev.clientY - dragOffsetRef.current.y,
      });
    };
    const handleMouseUp = () => {
      draggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [pos]);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || agent.status === 'streaming' || agent.status === 'thinking') return;
    agent.sendMessage(inputText.trim());
    setInputText('');
    setExpanded(true);
  }, [agent, inputText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSend();
    },
    [handleSend]
  );

  const isStreaming =
    agent.status === 'streaming' || agent.status === 'thinking' || agent.status === 'tool_calling';

  // 最近消息（最多 3 条）
  const recentMessages = agent.messages.slice(-3);

  if (minimized) {
    return (
      <div
        style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 }}
        className="cursor-pointer"
      >
        <button
          onClick={() => setMinimized(false)}
          className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-primary shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform"
          title="展开 AI 助手"
          aria-label="展开 AI 助手"
        >
          <Bot className="w-5 h-5" />
          {isStreaming && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 ring-2 ring-white animate-pulse" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        width: expanded ? 340 : 280,
        transition: 'width 0.2s ease',
      }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden select-none"
      role="dialog"
      aria-label="浮动 AI 助手"
    >
      {/* 拖拽把手 + 标题栏 */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-violet-500 to-primary cursor-grab active:cursor-grabbing"
      >
        <Bot className="w-4 h-4 text-white flex-shrink-0" />
        <span className="text-white text-sm font-semibold flex-1">CoPaw AI</span>
        {isStreaming && <Loader2 className="w-3.5 h-3.5 text-white/80 animate-spin" />}

        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-white/70 hover:text-white p-1 rounded transition-colors"
          title={expanded ? '收起' : '展开消息'}
          aria-label={expanded ? '收起消息' : '展开消息'}
        >
          <ChevronUp className={`w-3.5 h-3.5 transition-transform ${expanded ? '' : 'rotate-180'}`} />
        </button>
        <button
          onClick={() => setMinimized(true)}
          className="text-white/70 hover:text-white p-1 rounded transition-colors"
          title="最小化"
          aria-label="最小化"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={agent.closeSidebar}
          className="text-white/70 hover:text-white p-1 rounded transition-colors"
          title="关闭"
          aria-label="关闭浮动窗口"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 最近消息列表（展开时显示） */}
      {expanded && recentMessages.length > 0 && (
        <div className="max-h-52 overflow-y-auto px-3 py-2 space-y-2 bg-gray-50 dark:bg-gray-800/50">
          {recentMessages.map((msg) => (
            <div
              key={msg.id}
              className={`text-xs leading-relaxed rounded-lg px-2.5 py-1.5 max-w-[90%] ${
                msg.role === 'user'
                  ? 'ml-auto bg-primary text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-600'
              }`}
            >
              <p className="whitespace-pre-wrap break-words line-clamp-4">{msg.content}</p>
              {msg.isStreaming && (
                <span className="inline-block w-1 h-3 bg-current ml-0.5 align-middle animate-pulse" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 输入行 */}
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? 'AI 回复中...' : '问点什么...'}
          disabled={isStreaming}
          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-primary transition-colors placeholder:text-gray-400"
          aria-label="AI 输入框"
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !inputText.trim()}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
            isStreaming || !inputText.trim()
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
          }`}
          aria-label="发送"
        >
          {isStreaming ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
