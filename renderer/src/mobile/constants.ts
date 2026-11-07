/** 移动端共享枚举选项（状态 / 优先级），避免各视图重复定义 */

import type { Priority, TaskStatus } from '../../../core/src/domain/types';

export const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'todo', label: '待办' },
  { value: 'in-progress', label: '进行中' },
  { value: 'review', label: '评审' },
  { value: 'done', label: '已完成' },
  { value: 'blocked', label: '阻塞' },
];

export const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];
