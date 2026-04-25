/**
 * ToolConfirmation - 工具调用确认卡片
 *
 * 当 Agent 要执行写操作（创建/修改/删除）时，
 * 显示此卡片让用户确认或取消
 */

import React, { memo } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import type { PendingConfirmation } from '../../types/agent';

interface ToolConfirmationProps {
  confirmation: PendingConfirmation;
  onConfirm: (approved: boolean) => void;
}

// 根据工具名判断操作危险级别
function getDangerLevel(toolName: string): 'danger' | 'warning' | 'info' {
  if (toolName.startsWith('delete') || toolName.startsWith('clear')) return 'danger';
  if (toolName.startsWith('update') || toolName.startsWith('move')) return 'warning';
  return 'info';
}

const DANGER_STYLES = {
  danger: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-500',
    title: 'text-red-800 dark:text-red-300',
    confirmBtn: 'bg-red-500 hover:bg-red-600 text-white',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-500',
    title: 'text-amber-800 dark:text-amber-300',
    confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500',
    title: 'text-blue-800 dark:text-blue-300',
    confirmBtn: 'bg-primary hover:bg-primary/90 text-white',
  },
};

// 工具名称中文映射
const TOOL_NAME_MAP: Record<string, string> = {
  createTask: '创建任务',
  updateTask: '更新任务',
  deleteTask: '删除任务',
  deleteTasksBatch: '批量删除任务',
  createProject: '创建项目',
  updateProject: '更新项目',
  deleteProject: '删除项目',
  createSchedule: '创建日程',
  updateSchedule: '更新日程',
  deleteSchedule: '删除日程',
};

export const ToolConfirmation = memo(({ confirmation, onConfirm }: ToolConfirmationProps) => {
  const { toolName, toolArgs, description } = confirmation;
  const level = getDangerLevel(toolName);
  const styles = DANGER_STYLES[level];
  const displayName = TOOL_NAME_MAP[toolName] ?? toolName;

  // 将参数整理为易读格式
  const argEntries = Object.entries(toolArgs).filter(([, v]) => v != null && v !== '');

  return (
    <div
      className={`rounded-xl border ${styles.bg} ${styles.border} p-3 my-2 text-sm`}
      role="alertdialog"
      aria-label={`确认操作：${displayName}`}
    >
      {/* 标题行 */}
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${styles.icon}`} />
        <span className={`font-semibold ${styles.title}`}>需要确认：{displayName}</span>
      </div>

      {/* 描述 */}
      <p className="text-gray-600 dark:text-gray-400 mb-2 text-xs leading-relaxed">
        {description}
      </p>

      {/* 参数摘要 */}
      {argEntries.length > 0 && (
        <div className="mb-3 bg-white/60 dark:bg-gray-900/40 rounded-lg px-3 py-2 text-xs space-y-1">
          {argEntries.slice(0, 5).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 w-20 truncate">
                {key}
              </span>
              <span className="text-gray-700 dark:text-gray-300 break-all">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
          {argEntries.length > 5 && (
            <p className="text-gray-400 dark:text-gray-500 text-[10px]">
              ...还有 {argEntries.length - 5} 个参数
            </p>
          )}
        </div>
      )}

      {/* 按钮组 */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => onConfirm(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
          aria-label="取消操作"
        >
          <X className="w-3.5 h-3.5" />
          取消
        </button>
        <button
          onClick={() => onConfirm(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${styles.confirmBtn} transition-colors`}
          aria-label="确认执行"
        >
          <Check className="w-3.5 h-3.5" />
          确认执行
        </button>
      </div>
    </div>
  );
});

ToolConfirmation.displayName = 'ToolConfirmation';
