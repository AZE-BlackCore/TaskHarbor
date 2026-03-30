/**
 * 获取当前 UTC 时间的 ISO 8601 格式字符串
 * @returns ISO 8601 格式的时间戳，例如：2026-03-30T12:34:56.789Z
 */
export function getUTCNow(): string {
  return new Date().toISOString()
}

/**
 * 解析 ISO 8601 时间戳为 Date 对象
 * @param timestamp ISO 8601 格式的时间戳
 * @returns Date 对象
 */
export function parseTimestamp(timestamp: string): Date {
  return new Date(timestamp)
}

/**
 * 格式化时间戳为本地时间字符串
 * @param timestamp ISO 8601 格式的时间戳
 * @param locale 区域设置，默认 zh-CN
 * @returns 格式化的本地时间字符串
 */
export function formatToLocalTime(timestamp: string, locale: string = 'zh-CN'): string {
  const date = parseTimestamp(timestamp)
  return date.toLocaleString(locale)
}

/**
 * 计算两个时间戳之间的毫秒差
 * @param start 开始时间
 * @param end 结束时间，默认为当前时间
 * @returns 毫秒差
 */
export function getTimestampDiff(start: string, end: string = getUTCNow()): number {
  const startDate = parseTimestamp(start)
  const endDate = parseTimestamp(end)
  return endDate.getTime() - startDate.getTime()
}

/**
 * 检查时间戳是否有效
 * @param timestamp 待检查的时间戳
 * @returns 是否有效
 */
export function isValidTimestamp(timestamp: string): boolean {
  if (!timestamp) return false
  const date = parseTimestamp(timestamp)
  return !isNaN(date.getTime())
}
