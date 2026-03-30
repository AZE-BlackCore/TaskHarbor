/**
 * 主进程缓存服务
 * 用于缓存数据库查询结果，减少重复查询
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // 存活时间（毫秒）
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  
  // 统计信息
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  /**
   * 从缓存获取数据
   * @param key 缓存键
   * @returns 缓存的数据，不存在或已过期返回 null
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 存活时间（毫秒），默认 2 秒
   */
  set<T>(key: string, data: T, ttl: number = 2000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    this.stats.sets++;
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string) {
    this.cache.delete(key);
    this.stats.deletes++;
  }

  /**
   * 清除所有缓存
   */
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  /**
   * 清除匹配特定前缀的缓存
   * @param prefix 前缀
   */
  invalidateByPrefix(prefix: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : '0.00';
    
    return {
      ...this.stats,
      total,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }
}

// 单例导出
export const cacheService = new CacheService();

/**
 * 查询缓存键生成器
 */
export const getQueryCacheKey = (query: string, params?: any[]) => {
  return `query:${query}:${JSON.stringify(params || [])}`;
};

/**
 * 任务查询缓存键
 */
export const getTasksCacheKey = (filters?: any) => {
  return `tasks:${JSON.stringify(filters || {})}`;
};

/**
 * 项目查询缓存键
 */
export const getProjectCacheKey = (id: string) => {
  return `project:${id}`;
};

/**
 * 项目统计缓存键
 */
export const getProjectStatsCacheKey = (projectId: string) => {
  return `project_stats:${projectId}`;
};
