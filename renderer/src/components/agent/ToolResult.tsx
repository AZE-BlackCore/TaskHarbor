/**
 * ToolResult - 工具执行结果展示卡片
 *
 * 显示工具调用的名称、参数和执行结果
 */

import React, { memo, useState } from 'react';
import { ChevronDown, ChevronRight, Wrench, CheckCircle, XCircle } from 'lucide-react';

interface ToolResultProps {
  toolName: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  status: 'calling' | 'success' | 'error';
}

// 工具名称中文映射
const TOOL_NAME_MAP: Record<string, string> = {
  createTask: '创建任务',
  updateTask: '更新任务',
  deleteTask: '删除任务',
  getTasks: '查询任务',
  getTaskById: '获取任务详情',
  createProject: '创建项目',
  updateProject: '更新项目',
  deleteProject: '删除项目',
  getProjects: '查询项目',
  getProjectStats: '查询项目统计',
  createSchedule: '创建日程',
  updateSchedule: '更新日程',
  deleteSchedule: '删除日程',
  getSchedules: '查询日程',
  analyzeProjects: '分析项目',
  generateReport: '生成报告',
};

export const ToolResult = memo(({ toolName, toolArgs, toolResult, status }: ToolResultProps) => {
  const [expanded, setExpanded] = useState(false);
  const displayName = TOOL_NAME_MAP[toolName] ?? toolName;

  const resultText =
    toolResult != null
      ? typeof toolResult === 'string'
        ? toolResult
        : JSON.stringify(toolResult, null, 2)
      : null;

  return (
    <div className="my-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden text-xs">
      {/* 工具头部 */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left"
      >
        {status === 'calling' ? (
          <Wrench className="w-3.5 h-3.5 text-primary animate-pulse flex-shrink-0" />
        ) : status === 'success' ? (
          <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        )}
        <span className="font-medium text-gray-700 dark:text-gray-300">{displayName}</span>
        {status === 'calling' && (
          <span className="ml-auto text-gray-400 animate-pulse">执行中...</span>
        )}
        {status !== 'calling' && (
          <span className="ml-auto text-gray-400">
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        )}
      </button>

      {/* 展开详情 */}
      {expanded && (toolArgs || resultText) && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 space-y-2">
          {toolArgs && Object.keys(toolArgs).length > 0 && (
            <div>
              <p className="text-gray-400 dark:text-gray-500 mb-1 font-medium uppercase tracking-wider text-[10px]">
                参数
              </p>
              <pre className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(toolArgs, null, 2)}
              </pre>
            </div>
          )}
          {resultText && (
            <div>
              <p className="text-gray-400 dark:text-gray-500 mb-1 font-medium uppercase tracking-wider text-[10px]">
                结果
              </p>
              <pre className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all leading-relaxed max-h-32 overflow-y-auto">
                {resultText}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ToolResult.displayName = 'ToolResult';
