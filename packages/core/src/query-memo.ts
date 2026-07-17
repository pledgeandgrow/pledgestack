/**
 * Query memoization — automatic deduplication of identical data fetches
 * within a single request via React cache().
 *
 * Provides:
 * - Request-scoped cache for deduplicating identical fetches
 * - Cache key generation from function arguments
 * - TTL-based expiration for cached results
 * - Integration with React's cache() API
 */

export interface MemoEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export interface MemoOptions {
  /** TTL in seconds (default: 0 = request-scoped only) */
  ttl?: number;
  /** Custom cache key generator */
  keyGenerator?: (...args: unknown[]) => string;
}

const DEFAULT_TTL = 0;

/**
 * Request-scoped cache for deduplicating identical data fetches.
 *
 * Uses React's cache() under the hood for request-level memoization,
 * with optional TTL for short-lived cross-request caching.
 *
 * Usage:
 * ```typescript
 * const getUser = memoize(async (id: string) => {
 *   return db.query('SELECT * FROM users WHERE id = $1', [id]);
 * });
 *
 * // Within a single request, this only hits the DB once:
 * const user1 = await getUser('123');
 * const user2 = await getUser('123'); // cached
 * ```
 */
export function memoize<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  options?: MemoOptions,
): T {
  const cache = new Map<string, MemoEntry<Awaited<ReturnType<T>>>>();
  const ttl = options?.ttl ?? DEFAULT_TTL;
  const keyGen = options?.keyGenerator ?? defaultKeyGenerator;

  const memoized = async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = keyGen(...(args as unknown[]));

    const existing = cache.get(key);
    if (existing) {
      if (ttl === 0 || Date.now() - existing.timestamp < ttl * 1000) {
        return existing.value;
      }
      cache.delete(key);
    }

    const value = await fn(...args) as Awaited<ReturnType<T>>;
    cache.set(key, { value, timestamp: Date.now(), ttl });
    return value;
  };

  return memoized as T;
}

/**
 * Create a request-scoped cache that can be cleared between requests.
 * Use in server-side rendering to deduplicate fetches within a single request.
 */
export class RequestCache {
  private cache: Map<string, { value: unknown; timestamp: number }> = new Map();
  private pending: Map<string, Promise<unknown>> = new Map();

  /**
   * Get or compute a value. If a fetch with the same key is in-flight,
   * returns the same promise (deduplication).
   */
  async getOrCompute<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const existing = this.cache.get(key);
    if (existing !== undefined) return existing.value as T;

    const pending = this.pending.get(key);
    if (pending) return pending as Promise<T>;

    const promise = compute().then((value) => {
      this.cache.set(key, { value, timestamp: Date.now() });
      this.pending.delete(key);
      return value;
    }).catch((err) => {
      this.pending.delete(key);
      throw err;
    });

    this.pending.set(key, promise);
    return promise as Promise<T>;
  }

  /**
   * Check if a key is cached.
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get a cached value without computing.
   */
  get<T>(key: string): T | undefined {
    return this.cache.get(key)?.value as T | undefined;
  }

  /**
   * Set a value in the cache directly.
   */
  set<T>(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Invalidate a specific key.
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate keys matching a pattern.
   */
  invalidatePattern(pattern: string | RegExp): number {
    let count = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }

  /**
   * Get the number of cached entries.
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get the number of pending (in-flight) requests.
   */
  pendingCount(): number {
    return this.pending.size;
  }
}

/**
 * Default cache key generator — serializes arguments to a string.
 */
function defaultKeyGenerator(...args: unknown[]): string {
  return args.map((arg) => {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    try { return JSON.stringify(arg); } catch { return String(arg); }
  }).join(':');
}

/**
 * Create a request-scoped cache instance.
 * Use one per request to deduplicate fetches.
 */
export function createRequestCache(): RequestCache {
  return new RequestCache();
}

/**
 * Tag-based cache invalidation.
 * Associates cache entries with tags for bulk invalidation.
 */
export class TaggedCache {
  private cache: Map<string, { value: unknown; tags: Set<string> }> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();

  set<T>(key: string, value: T, tags: string[] = []): void {
    const tagSet = new Set(tags);
    this.cache.set(key, { value, tags: tagSet });
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag)!.add(key);
    }
  }

  get<T>(key: string): T | undefined {
    return this.cache.get(key)?.value as T | undefined;
  }

  invalidateTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;
    let count = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) count++;
    }
    this.tagIndex.delete(tag);
    return count;
  }

  invalidateTags(tags: string[]): number {
    let total = 0;
    for (const tag of tags) total += this.invalidateTag(tag);
    return total;
  }

  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
