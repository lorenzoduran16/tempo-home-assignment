/**
 * In-Memory Caching Engine with Time-To-Live (TTL)
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * Retrieves data from the cache. Returns null if expired or not found.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Saves data to the cache with a specified TTL (in milliseconds).
   * Default: 10 minutes (600,000 ms)
   */
  set<T>(key: string, data: T, ttlMs = 10 * 60 * 1000): void {
    this.store.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  /**
   * Evicts a key from the cache map.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Sweeps all keys.
   */
  clear(): void {
    this.store.clear();
  }
}

// Single active instance for API caching
export const globalCache = new MemoryCache();
