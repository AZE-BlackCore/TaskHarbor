import { randomUUID } from 'crypto'

/**
 * 生成统一的 UUID 格式 ID
 * @param prefix 可选前缀，例如 'task', 'project', 'subtask' 等
 * @returns 格式化的 ID，例如：task_550e8400-e29b-41d4-a716-446655440000
 */
export function generateId(prefix?: string): string {
  const uuid = randomUUID()
  return prefix ? `${prefix}_${uuid}` : uuid
}

/**
 * 批量生成 ID
 * @param count 生成数量
 * @param prefix 可选前缀
 * @returns ID 数组
 */
export function generateIds(count: number, prefix?: string): string[] {
  return Array.from({ length: count }, () => generateId(prefix))
}
