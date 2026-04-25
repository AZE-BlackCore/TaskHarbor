/**
 * QuickActions - 快捷操作面板
 *
 * 当对话列表为空时显示，引导用户发起常用操作
 */

import React, { memo } from 'react';
import { 
  PlusCircle, 
  BarChart2, 
  FileText, 
  Search, 
  AlertTriangle,
  Calendar
} from 'lucide-react';

interface QuickActionsProps {
  onAction: (message: string) => void;
}

const ACTIONS = [
  {
    icon: <PlusCircle className="w-5 h-5" />,
    label: '创建任务',
    desc: '用自然语言快速创建任务',
    prompt: '帮我创建一个新任务',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    icon: <BarChart2 className="w-5 h-5" />,
    label: '项目进度',
    desc: '分析当前项目完成情况',
    prompt: '分析所有项目的进度和完成情况',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    icon: <FileText className="w-5 h-5" />,
    label: '生成报告',
    desc: '自动生成日报/周报',
    prompt: '帮我生成今天的工作日报',
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
  },
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    label: '逾期预警',
    desc: '查看即将或已经逾期的任务',
    prompt: '有哪些任务即将逾期或已经逾期？',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    label: '今日安排',
    desc: '查看今天的任务和日程',
    prompt: '今天有哪些待办任务和日程安排？',
    color: 'text-pink-500',
    bg: 'bg-pink-50 dark:bg-pink-900/20',
  },
  {
    icon: <Search className="w-5 h-5" />,
    label: '智能搜索',
    desc: '用自然语言搜索任务',
    prompt: '帮我查找所有高优先级且未完成的任务',
    color: 'text-cyan-500',
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
  },
];

export const QuickActions = memo(({ onAction }: QuickActionsProps) => {
  return (
    <div className="flex flex-col items-center py-6 px-3">
      {/* Logo + 欢迎语 */}
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-primary flex items-center justify-center mb-3 shadow-lg">
        <span className="text-2xl">✨</span>
      </div>
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
        CoPaw AI 助手
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-5">
        用自然语言管理任务、分析进度、生成报告
      </p>

      {/* 操作卡片网格 */}
      <div className="grid grid-cols-2 gap-2 w-full">
        {ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => onAction(action.prompt)}
            className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-dark-bg hover:border-primary/30 hover:shadow-sm transition-all text-left group"
          >
            <div className={`p-1.5 rounded-lg ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}>
              {action.icon}
            </div>
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{action.label}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">{action.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
});

QuickActions.displayName = 'QuickActions';
