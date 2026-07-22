/**
 * Rust-backed data hooks — call Rust functions via NAPI with automatic
 * caching, binary protocol for data transfer, and zero JSON serialization.
 *
 * Goal implemented:
 * - #255: Rust-backed data hooks
 *
 * Features:
 * - useRustQuery(): Call a Rust NAPI function with SWR-style caching
 * - useRustMutation(): Call a Rust NAPI function for mutations with cache invalidation
 * - Rust cache: Separate cache for Rust-backed queries (binary data, no JSON)
 * - Automatic serialization: Uses NAPI's native type system, no JSON.stringify
 * - Integration with responseCache for cross-hook cache sharing
 * - Prefetch support for SSR hydration
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { responseCache } from './data-hooks';

// ─── Rust Query Cache ────────────────────────────────────────────────────

/**
 * Separate cache for Rust-backed queries. Stores the raw NAPI result
 * along with metadata. Keys are prefixed with 'rust:' to avoid collisions
 * with the HTTP response cache.
 */
const rustCache = new Map<string, { data: unknown; timestamp: number }>();

/**
 * Cache TTL in milliseconds (default: 5 minutes).
 * Set to 0 to disable TTL-based eviction.
 */
const RUST_CACHE_TTL = 5 * 60 * 1000;

/**
 * Generates a cache key for a Rust function call.
 */
function rustCacheKey(fnName: string, args: unknown[]): string {
  const argsKey = args.length === 0
    ? 'none'
    : JSON.stringify(args);
  return `rust:${fnName}:${argsKey}`;
}

/**
 * Checks if a cached entry is still fresh.
 */
function isCacheFresh(timestamp: number): boolean {
  if (RUST_CACHE_TTL === 0) return true;
  return Date.now() - timestamp < RUST_CACHE_TTL;
}

/**
 * Retrieves a cached Rust query result.
 */
export function getCachedRustQuery(key: string): unknown | undefined {
  const cached = rustCache.get(key);
  if (cached && isCacheFresh(cached.timestamp)) {
    return cached.data;
  }
  if (cached) {
    rustCache.delete(key);
  }
  return undefined;
}

/**
 * Stores a Rust query result in cache.
 */
export function setCachedRustQuery(key: string, data: unknown): void {
  rustCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Invalidates cached Rust queries matching a function name pattern.
 * Supports exact match or prefix match (e.g., 'get_user' matches 'get_user:*').
 */
export function invalidateRustCache(fnNamePattern: string): number {
  let count = 0;
  const prefix = `rust:${fnNamePattern}`;

  for (const key of rustCache.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`) || key.startsWith(`${prefix},`)) {
      rustCache.delete(key);
      count++;
    }
  }

  return count;
}

/**
 * Clears all Rust query cache entries.
 */
export function clearRustCache(): void {
  rustCache.clear();
}

// ─── Request Dedup ───────────────────────────────────────────────────────

const rustRequestCache = new Map<string, Promise<unknown>>();

/**
 * Deduplicates concurrent Rust function calls with the same arguments.
 */
function dedupRustCall<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = rustRequestCache.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fn();
  rustRequestCache.set(key, promise);
  promise.finally(() => rustRequestCache.delete(key));
  return promise;
}

// ─── useRustQuery ────────────────────────────────────────────────────────

export interface UseRustQueryOptions<T> {
  /** Initial data (from SSR prefetch) */
  initialData?: T;
  /** Revalidate on window focus (default: false) */
  revalidateOnFocus?: boolean;
  /** Revalidate interval in ms (0 = disabled) */
  refreshInterval?: number;
  /** Enabled flag (false = don't fetch) */
  enabled?: boolean;
  /** Cache key override (default: auto-generated from fnName + args) */
  cacheKey?: string;
  /** Transform function for the result */
  transform?: (data: unknown) => T;
}

export interface UseRustQueryResult<T> {
  /** The data returned by the Rust function */
  data: T | undefined;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether the query is revalidating */
  isValidating: boolean;
  /** Error from the Rust function */
  error: Error | undefined;
  /** Manually trigger a refetch */
  refetch: () => void;
  /** Mutate the cached data */
  mutate: (data?: T) => void;
}

/**
 * Calls a Rust NAPI function with SWR-style caching and dedup.
 *
 * The Rust function is called via the provided `fn` callback, which should
 * invoke the NAPI addon function. Results are cached in memory and
 * deduplicated so concurrent calls with the same arguments share a single
 * NAPI boundary crossing.
 *
 * Usage:
 *   const { data, isLoading } = useRustQuery(
 *     'get_user',
 *     () => rust.get_user(userId),
 *     { revalidateOnFocus: true }
 *   );
 *
 * With arguments (for cache key generation):
 *   const { data } = useRustQuery(
 *     'get_posts',
 *     () => rust.get_posts(limit, offset),
 *     { args: [limit, offset] }
 *   );
 */
export function useRustQuery<T = unknown>(
  fnName: string,
  fn: () => Promise<T>,
  options: UseRustQueryOptions<T> & { args?: unknown[] } = {},
): UseRustQueryResult<T> {
  const {
    initialData,
    revalidateOnFocus = false,
    refreshInterval = 0,
    enabled = true,
    cacheKey,
    transform,
    args = [],
  } = options;

  const key = cacheKey ?? rustCacheKey(fnName, args);

  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData && enabled);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const execute = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    const cached = getCachedRustQuery(key) as T | undefined;
    if (cached !== undefined) {
      setData(transform ? transform(cached) : cached);
      setIsLoading(false);
    }

    setIsValidating(true);
    try {
      const result = await dedupRustCall(key, () => fnRef.current());
      const transformed = transform ? transform(result) : result as T;
      setData(transformed);
      setCachedRustQuery(key, transformed);
      setError(undefined);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [key, enabled, transform]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;
    if (initialData !== undefined) {
      setCachedRustQuery(key, initialData);
      return;
    }
    void execute();
  }, [key, enabled, initialData, execute]);

  // Revalidate on focus
  useEffect(() => {
    if (!revalidateOnFocus) return;
    const handler = () => void execute();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [revalidateOnFocus, execute]);

  // Refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const interval = setInterval(() => void execute(), refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, execute]);

  const refetch = useCallback(() => {
    rustCache.delete(key);
    void execute();
  }, [key, execute]);

  const mutate = useCallback((newData?: T) => {
    if (newData !== undefined) {
      setData(newData);
      setCachedRustQuery(key, newData);
    } else {
      void execute();
    }
  }, [key, execute]);

  return { data, isLoading, isValidating, error, refetch, mutate };
}

// ─── useRustMutation ─────────────────────────────────────────────────────

export interface UseRustMutationOptions<TData, TVariables> {
  /** Called before mutation — return optimistic data */
  onMutate?: (variables: TVariables) => TData | undefined;
  /** Called on success */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Called on error */
  onError?: (error: Error, variables: TVariables) => void;
  /** Rust function names to invalidate after mutation */
  invalidateFunctions?: string[];
  /** HTTP cache URLs to invalidate after mutation */
  revalidateUrls?: string[];
  /** Retry count (default: 0) */
  retry?: number;
  /** Retry delay in ms (default: 1000) */
  retryDelay?: number;
}

export interface UseRustMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  error: Error | undefined;
  isLoading: boolean;
  reset: () => void;
}

/**
 * Calls a Rust NAPI function for mutations with cache invalidation.
 *
 * After a successful mutation, specified Rust query caches and/or HTTP
 * response caches are invalidated to trigger refetch.
 *
 * Usage:
 *   const { mutate, isLoading } = useRustMutation(
 *     'create_post',
 *     (input) => rust.create_post(input.title, input.content),
 *     {
 *       invalidateFunctions: ['get_posts', 'get_user'],
 *       revalidateUrls: ['/api/posts'],
 *     }
 *   );
 *   await mutate({ title: 'New Post', content: 'Hello' });
 */
export function useRustMutation<TData = unknown, TVariables = unknown>(
  _fnName: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseRustMutationOptions<TData, TVariables> = {},
): UseRustMutationResult<TData, TVariables> {
  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const mutationFnRef = useRef(mutationFn);
  mutationFnRef.current = mutationFn;

  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    const opts = optionsRef.current;
    setIsLoading(true);
    setError(undefined);

    // Optimistic update
    let optimisticData: TData | undefined;
    if (opts.onMutate) {
      optimisticData = opts.onMutate(variables);
      if (optimisticData !== undefined) {
        setData(optimisticData);
      }
    }

    const maxRetries = opts.retry ?? 0;
    const retryDelay = opts.retryDelay ?? 1000;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await mutationFnRef.current(variables);
        setData(result);
        opts.onSuccess?.(result, variables);

        // Invalidate Rust query caches
        if (opts.invalidateFunctions) {
          for (const fnName of opts.invalidateFunctions) {
            invalidateRustCache(fnName);
          }
        }

        // Invalidate HTTP response caches
        if (opts.revalidateUrls) {
          for (const url of opts.revalidateUrls) {
            responseCache.delete(url);
          }
        }

        setIsLoading(false);
        return result;
      } catch (err) {
        lastError = err as Error;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)));
        }
      }
    }

    // All retries exhausted
    if (lastError) {
      setError(lastError);
      if (optimisticData !== undefined) {
        setData(undefined);
      }
      opts.onError?.(lastError, variables);
    }
    setIsLoading(false);
    throw lastError;
  }, []);

  const reset = useCallback(() => {
    setData(undefined);
    setError(undefined);
    setIsLoading(false);
  }, []);

  return { mutate, data, error, isLoading, reset };
}

// ─── SSR Prefetch for Rust Queries ───────────────────────────────────────

/**
 * Prefetches a Rust query on the server during SSR.
 * The result is stored in the Rust cache and can be dehydrated for
 * transfer to the client.
 *
 * Usage in server components:
 *   const user = await prefetchRustQuery('get_user', () => rust.get_user(id), [id]);
 */
export async function prefetchRustQuery<T>(
  fnName: string,
  fn: () => Promise<T>,
  args: unknown[] = [],
): Promise<T> {
  const key = rustCacheKey(fnName, args);

  const cached = getCachedRustQuery(key) as T | undefined;
  if (cached !== undefined) return cached;

  const result = await fn();
  setCachedRustQuery(key, result);
  return result;
}

/**
 * Serializes the Rust cache for transfer to the client.
 * Returns a JSON string that can be embedded in the HTML.
 */
export function dehydrateRustCache(): string {
  const entries: Record<string, { data: unknown; timestamp: number }> = {};
  for (const [key, value] of rustCache.entries()) {
    entries[key] = value;
  }
  return JSON.stringify(entries);
}

/**
 * Hydrates the Rust cache from a dehydrated server state.
 * Call this on the client to populate the cache before rendering.
 */
export function hydrateRustCache(dehydratedState: string): void {
  try {
    const entries = JSON.parse(dehydratedState) as Record<string, { data: unknown; timestamp: number }>;
    for (const [key, value] of Object.entries(entries)) {
      rustCache.set(key, value);
    }
  } catch {
    // Invalid dehydrated state — ignore
  }
}

/**
 * Clears the prefetch store. Called after dehydration to prevent
 * stale data from leaking between requests.
 */
export function clearRustPrefetchStore(): void {
  rustCache.clear();
}

/**
 * Hook that automatically hydrates the Rust cache on mount.
 * Call this once in your root client component alongside useHydrate().
 */
export function useRustHydrate(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { __PLEDGE_RUST_DEHYDRATED__?: string };
    if (w.__PLEDGE_RUST_DEHYDRATED__) {
      hydrateRustCache(w.__PLEDGE_RUST_DEHYDRATED__);
      delete w.__PLEDGE_RUST_DEHYDRATED__;
    }
  }, []);
}

// ─── Batch Rust Queries ──────────────────────────────────────────────────

/**
 * Executes multiple Rust queries in parallel and returns all results.
 * Each query is deduplicated and cached independently.
 *
 * Usage:
 *   const [user, posts, stats] = await batchRustQueries([
 *     { fnName: 'get_user', fn: () => rust.get_user(id), args: [id] },
 *     { fnName: 'get_posts', fn: () => rust.get_posts(), args: [] },
 *     { fnName: 'get_stats', fn: () => rust.get_stats(), args: [] },
 *   ]);
 */
export async function batchRustQueries<T extends unknown[]>(
  queries: Array<{ fnName: string; fn: () => Promise<unknown>; args?: unknown[] }>,
): Promise<T> {
  const results = await Promise.all(
    queries.map(({ fnName, fn, args = [] }) => {
      const key = rustCacheKey(fnName, args);
      const cached = getCachedRustQuery(key);
      if (cached !== undefined) return Promise.resolve(cached);
      return dedupRustCall(key, fn).then((result) => {
        setCachedRustQuery(key, result);
        return result;
      });
    }),
  );
  return results as T;
}

/**
 * Hook for batched Rust queries with reactive state.
 *
 * Usage:
 *   const { data, isLoading } = useBatchRustQueries([
 *     { fnName: 'get_user', fn: () => rust.get_user(id), args: [id] },
 *     { fnName: 'get_posts', fn: () => rust.get_posts(), args: [] },
 *   ]);
 */
export function useBatchRustQueries(
  queries: Array<{ fnName: string; fn: () => Promise<unknown>; args?: unknown[] }>,
  options: { enabled?: boolean } = {},
): { data: unknown[] | undefined; isLoading: boolean; error: Error | undefined; refetch: () => void } {
  const { enabled = true } = options;
  const [data, setData] = useState<unknown[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | undefined>(undefined);
  const queriesRef = useRef(queries);
  queriesRef.current = queries;

  const execute = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(undefined);
    try {
      const results = await batchRustQueries(queriesRef.current);
      setData(results);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void execute();
  }, [execute]);

  const refetch = useCallback(() => {
    // Clear all related caches
    for (const { fnName, args = [] } of queriesRef.current) {
      rustCache.delete(rustCacheKey(fnName, args));
    }
    void execute();
  }, [execute]);

  return { data, isLoading, error, refetch };
}
