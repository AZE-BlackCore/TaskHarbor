/**
 * ContextBadge - 上下文感知标签显示
 *
 * 显示 Agent 当前感知到的页面上下文（项目/任务/视图）
 */

import React, { memo } from 'react';
import { FolderOpen, CheckSquare, MapPin, X } from 'lucide-react';
import type { PageContext } from '../../types/agent';

interface ContextBadgeProps {
  context: PageContext;
  onClear?: () => void;
}

const PAGE_NAME_MAP: Record<string, string> = {
  projects: '项目管理',
  schedule: '日程管理',
  list: '任务列表',
  gantt: '甘特图',
  kanban: '看板',
  calendar: '日历',
};

const VIEW_NAME_MAP: Record<string, string> = {
  list: '列表视图',
  gantt: '甘特图',
  kanban: '看板',
  calendar: '日历',
};

export const ContextBadge = memo(({ context, onClear }: ContextBadgeProps) => {
  const hasContext =
    context.page || context.projectName || context.taskTitle || context.viewType;

  if (!hasContext) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 border-b border-primary/10">
      <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
      <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
        {context.page && (
          <Badge icon={<FolderOpen className="w-3 h-3" />}>
            {PAGE_NAME_MAP[context.page] ?? context.page}
          </Badge>
        )}
        {context.projectName && (
          <Badge icon={<FolderOpen className="w-3 h-3" />}>{context.projectName}</Badge>
        )}
        {context.taskTitle && (
          <Badge icon={<CheckSquare className="w-3 h-3" />}>{context.taskTitle}</Badge>
        )}
        {context.viewType && !context.taskTitle && (
          <Badge>{VIEW_NAME_MAP[context.viewType] ?? context.viewType}</Badge>
        )}
      </div>
      {onClear && (
        <button
          onClick={onClear}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          title="清除上下文"
          aria-label="清除上下文"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

ContextBadge.displayName = 'ContextBadge';

// 内部小标签
function Badge({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium max-w-[120px] truncate">
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}
