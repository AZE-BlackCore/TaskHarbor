/**
 * 简单的缓存工具类
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // 存活时间（毫秒）
}

class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();

  /**
   * 从缓存获取数据
   * @param key 缓存键
   * @returns 缓存的数据，不存在或已过期返回 null
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 存活时间（毫秒），默认 5 秒
   */
  set<T>(key: string, data: T, ttl: number = 5000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string) {
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 清除匹配特定模式的缓存键
   * @param pattern 正则表达式或字符串前缀
   */
  invalidate(pattern: string | RegExp) {
    for (const key of this.cache.keys()) {
      if (typeof pattern === 'string') {
        if (key.startsWith(pattern)) {
          this.cache.delete(key);
        }
      } else {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const now = Date.now();
    let total = 0;
    let expired = 0;

    for (const entry of this.cache.values()) {
      total++;
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      }
    }

    return {
      total,
      expired,
      valid: total - expired,
    };
  }
}

// 单例导出
export const cacheService = new CacheService();

/**
 * 项目统计缓存键生成器
 */
export const getProjectStatsCacheKey = (projectId: string) =>
  `project_stats:${projectId}`;

/**
 * 任务统计缓存键生成器
 */
export const getTaskStatsCacheKey = (filters?: {
  projectId?: string;
  status?: string;
}) => `task_stats:${JSON.stringify(filters || {})}`;
