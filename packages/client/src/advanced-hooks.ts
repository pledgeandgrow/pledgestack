/**
 * Advanced data hooks — pagination, infinite scroll, optimistic updates, and
 * server-side prefetching for SSR→client state transfer.
 *
 * Goals implemented:
 * - #246: useInfiniteQuery — cursor-based infinite scroll with prefetch
 * - #247: usePaginatedQuery — offset/limit pagination with URL-synced state
 * - #248: Optimistic update framework — useOptimisticMutation with rollback
 * - #249: Server-side query prefetching — prefetchQuery + dehydrate/hydrate
 * - #250: Mutation queue — serialized/deduped mutations with retry
 * - #252: useSubscription — WebSocket/SSE real-time data hooks
 * - #253: Selective cache invalidation — wildcard pattern matching
 * - #254: Cross-tab state sync — BroadcastChannel cache synchronization
 *
 * These hooks build on the existing useFetch/useSWR/useMutation primitives
 * and integrate with the PledgeStack server-side cache for seamless SSR.
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createElement,
  type ReactNode,
} from 'react';
import { responseCache, dedupFetch } from './data-hooks';

// ─── #246: useInfiniteQuery ──────────────────────────────────────────────

export interface UseInfiniteQueryOptions<T> {
  /** Initial data for the first page (from SSR) */
  initialData?: T[];
  /** Function to get the next cursor from a page of data */
  getNextCursor: (lastPage: T[]) => string | null;
  /** Function to build the URL for a given cursor */
  getUrl: (cursor: string | null) => string;
  /** Number of pages to prefetch ahead (default: 1) */
  prefetchCount?: number;
  /** Revalidate on focus (default: false) */
  revalidateOnFocus?: boolean;
  /** Enabled flag (false = don't fetch) */
  enabled?: boolean;
  /** Fetch options */
  fetchOptions?: RequestInit;
}

export interface UseInfiniteQueryResult<T> {
  /** All pages of data concatenated */
  data: T[];
  /** Whether the first page is loading */
  isLoading: boolean;
  /** Whether more pages are being fetched */
  isFetchingMore: boolean;
  /** Whether there are more pages to load */
  hasMore: boolean;
  /** Error from any page fetch */
  error: Error | undefined;
  /** Load the next page */
  fetchMore: () => Promise<void>;
  /** Reset to first page */
  reset: () => void;
}

/**
 * Infinite scroll hook with cursor-based pagination.
 *
 * Usage:
 *   const { data, fetchMore, hasMore } = useInfiniteQuery<Post>({
 *     getUrl: (cursor) => `/api/posts${cursor ? `?cursor=${cursor}` : ''}`,
 *     getNextCursor: (lastPage) => lastPage.length > 0 ? lastPage[lastPage.length - 1].id : null,
 *     initialData: serverProps.posts,
 *   });
 */
export function useInfiniteQuery<T = unknown>(
  options: UseInfiniteQueryOptions<T>,
): UseInfiniteQueryResult<T> {
  const {
    initialData,
    getNextCursor,
    getUrl,
    prefetchCount = 1,
    revalidateOnFocus = false,
    enabled = true,
    fetchOptions,
  } = options;

  const [pages, setPages] = useState<T[][]>(initialData ? [initialData] : []);
  const [isLoading, setIsLoading] = useState(!initialData && enabled);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);

  // Calculate next cursor from last page
  useEffect(() => {
    if (pages.length > 0) {
      const nextCursor = getNextCursor(pages[pages.length - 1]);
      cursorRef.current = nextCursor;
      hasMoreRef.current = nextCursor !== null;
    }
  }, [pages, getNextCursor]);

  const fetchFirstPage = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(undefined);
    try {
      const url = getUrl(null);
      const res = await dedupFetch(url, fetchOptions);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = (await res.json()) as T[];
      setPages([data]);
      responseCache.set(url, { data, timestamp: Date.now() });
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, getUrl, fetchOptions]);

  const fetchMore = useCallback(async () => {
    if (isFetchingMore || !hasMoreRef.current) return;

    const cursor = cursorRef.current;
    if (cursor === null) return;

    setIsFetchingMore(true);
    try {
      const url = getUrl(cursor);
      const res = await fetch(url, fetchOptions);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = (await res.json()) as T[];
      setPages((prev) => [...prev, data]);
      responseCache.set(url, { data, timestamp: Date.now() });
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, getUrl, fetchOptions]);

  // Initial fetch if no initialData
  useEffect(() => {
    if (!enabled) return;
    if (pages.length === 0 && !initialData) {
      void fetchFirstPage();
    }
  }, [enabled, pages.length, initialData, fetchFirstPage]);

  // Prefetch next pages
  useEffect(() => {
    if (prefetchCount <= 0 || !hasMoreRef.current) return;
    const cursor = cursorRef.current;
    if (cursor === null) return;

    // Prefetch in background without updating state
    const prefetchUrl = getUrl(cursor);
    void dedupFetch(prefetchUrl).then(async (r: Response) => {
      if (r.ok) {
        const d = await r.json();
        responseCache.set(prefetchUrl, { data: d, timestamp: Date.now() });
      }
    }).catch(() => {});
  }, [pages, prefetchCount, getUrl]);

  // Revalidate on focus
  useEffect(() => {
    if (!revalidateOnFocus) return;
    const handler = () => void fetchFirstPage();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [revalidateOnFocus, fetchFirstPage]);

  const reset = useCallback(() => {
    setPages([]);
    cursorRef.current = null;
    hasMoreRef.current = true;
    void fetchFirstPage();
  }, [fetchFirstPage]);

  const allData = pages.flat();
  const hasMore = hasMoreRef.current;

  return {
    data: allData,
    isLoading,
    isFetchingMore,
    hasMore,
    error,
    fetchMore,
    reset,
  };
}

// ─── #247: usePaginatedQuery ─────────────────────────────────────────────

export interface UsePaginatedQueryOptions<T> {
  /** Initial data for the first page (from SSR) */
  initialData?: T[];
  /** Initial total count (from SSR) */
  initialTotal?: number;
  /** Page size (items per page) */
  pageSize: number;
  /** Function to build the URL for a given page */
  getUrl: (page: number, pageSize: number) => string;
  /** Sync page number to URL search params (default: true) */
  syncToUrl?: boolean;
  /** URL search param name for page (default: 'page') */
  pageParam?: string;
  /** Prefetch adjacent pages (default: true) */
  prefetchAdjacent?: boolean;
  /** Enabled flag */
  enabled?: boolean;
  /** Fetch options */
  fetchOptions?: RequestInit;
}

export interface UsePaginatedQueryResult<T> {
  /** Data for the current page */
  data: T[];
  /** Current page number (0-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  total: number;
  /** Whether the current page is loading */
  isLoading: boolean;
  /** Error from the current page fetch */
  error: Error | undefined;
  /** Go to a specific page */
  goToPage: (page: number) => void;
  /** Go to the next page */
  nextPage: () => void;
  /** Go to the previous page */
  prevPage: () => void;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPrevPage: boolean;
}

/**
 * Paginated query hook with offset/limit pagination and URL-synced state.
 *
 * Usage:
 *   const { data, page, nextPage, totalPages } = usePaginatedQuery<Post>({
 *     pageSize: 20,
 *     getUrl: (page, size) => `/api/posts?offset=${page * size}&limit=${size}`,
 *     initialData: serverProps.posts,
 *     initialTotal: serverProps.total,
 *   });
 */
export function usePaginatedQuery<T = unknown>(
  options: UsePaginatedQueryOptions<T>,
): UsePaginatedQueryResult<T> {
  const {
    initialData,
    initialTotal,
    pageSize,
    getUrl,
    syncToUrl = true,
    pageParam = 'page',
    prefetchAdjacent = true,
    enabled = true,
    fetchOptions,
  } = options;

  // Read initial page from URL if syncing
  const getInitialPage = useCallback((): number => {
    if (!syncToUrl || typeof window === 'undefined') return 0;
    const params = new URLSearchParams(window.location.search);
    const p = parseInt(params.get(pageParam) ?? '0', 10);
    return isNaN(p) || p < 0 ? 0 : p;
  }, [syncToUrl, pageParam]);

  const [page, setPage] = useState(getInitialPage);
  const [data, setData] = useState<T[] | undefined>(initialData);
  const [total, setTotal] = useState(initialTotal ?? 0);
  const [isLoading, setIsLoading] = useState(!initialData && enabled);
  const [error, setError] = useState<Error | undefined>(undefined);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchPage = useCallback(async (targetPage: number) => {
    if (!enabled) return;
    if (targetPage < 0 || targetPage >= totalPages) return;

    setIsLoading(true);
    setError(undefined);
    try {
      const url = getUrl(targetPage, pageSize);
      const res = await dedupFetch(url, fetchOptions);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const json = (await res.json()) as T[] | { data: T[]; total: number };

      if (Array.isArray(json)) {
        setData(json);
      } else {
        setData(json.data);
        setTotal(json.total);
      }
      responseCache.set(url, { data: json, timestamp: Date.now() });
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, totalPages, getUrl, pageSize, fetchOptions]);

  // Fetch when page changes
  useEffect(() => {
    if (!enabled) return;
    // Skip fetch if we have initialData and are on page 0
    if (page === 0 && initialData) return;
    void fetchPage(page);
  }, [page, enabled, fetchPage, initialData]);

  // Sync page to URL
  useEffect(() => {
    if (!syncToUrl || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (page === 0) {
      url.searchParams.delete(pageParam);
    } else {
      url.searchParams.set(pageParam, String(page));
    }
    window.history.replaceState({}, '', url.toString());
  }, [page, syncToUrl, pageParam]);

  // Prefetch adjacent pages
  useEffect(() => {
    if (!prefetchAdjacent || !enabled) return;

    const pagesToPrefetch = [page + 1, page - 1].filter(
      (p) => p >= 0 && p < totalPages,
    );

    for (const p of pagesToPrefetch) {
      const prefetchUrl = getUrl(p, pageSize);
      if (!responseCache.has(prefetchUrl)) {
        void dedupFetch(prefetchUrl).then(async (r: Response) => {
          if (r.ok) {
            const d = await r.json();
            responseCache.set(prefetchUrl, { data: d, timestamp: Date.now() });
          }
        }).catch(() => {});
      }
    }
  }, [page, prefetchAdjacent, enabled, totalPages, getUrl, pageSize]);

  const goToPage = useCallback((targetPage: number) => {
    if (targetPage >= 0 && targetPage < totalPages) {
      setPage(targetPage);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages - 1));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 0));
  }, []);

  return {
    data: data ?? [],
    page,
    totalPages,
    total,
    isLoading,
    error,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: page < totalPages - 1,
    hasPrevPage: page > 0,
  };
}

// ─── #248: Optimistic Update Framework ───────────────────────────────────

export interface UseOptimisticMutationOptions<TData, TVariables, TContext> {
  /** The mutation function (e.g., POST to an API) */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Called before the mutation — return optimistic context for rollback */
  onMutate: (variables: TVariables) => TContext | Promise<TContext>;
  /** Called on success — commit the real data */
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  /** Called on error — rollback using the context */
  onError: (error: Error, variables: TVariables, context: TContext) => void;
  /** Called after success or error — cleanup */
  onSettled?: (data: TData | undefined, error: Error | undefined, variables: TVariables, context: TContext) => void;
  /** Revalidate these cache URLs after mutation */
  revalidateUrls?: string[];
  /** Retry configuration */
  retry?: number;
  /** Retry delay in ms (default: 1000) */
  retryDelay?: number;
}

export interface UseOptimisticMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  error: Error | undefined;
  isLoading: boolean;
  /** Whether the mutation is being retried */
  retryCount: number;
  /** Reset state */
  reset: () => void;
}

/**
 * Optimistic mutation hook with automatic rollback and retry.
 *
 * Usage:
 *   const { mutate, isLoading } = useOptimisticMutation({
 *     mutationFn: (newTodo) => fetch('/api/todos', { method: 'POST', body: JSON.stringify(newTodo) }),
 *     onMutate: (newTodo) => {
 *       const previousTodos = queryCache.get('todos');
 *       queryCache.set('todos', [...previousTodos, newTodo]);
 *       return { previousTodos };
 *     },
 *     onError: (_err, _vars, context) => {
 *       queryCache.set('todos', context.previousTodos); // Rollback
 *     },
 *     revalidateUrls: ['/api/todos'],
 *   });
 */
export function useOptimisticMutation<TData = unknown, TVariables = unknown, TContext = unknown>(
  options: UseOptimisticMutationOptions<TData, TVariables, TContext>,
): UseOptimisticMutationResult<TData, TVariables> {
  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    setIsLoading(true);
    setError(undefined);
    setRetryCount(0);

    const opts = optionsRef.current;
    const maxRetries = opts.retry ?? 0;
    const retryDelay = opts.retryDelay ?? 1000;

    // Execute optimistic update
    const context = await opts.onMutate(variables);

    let lastError: Error | undefined;
    let result: TData | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        result = await opts.mutationFn(variables);
        setData(result);
        opts.onSuccess?.(result, variables, context);

        // Revalidate associated URLs
        if (opts.revalidateUrls) {
          for (const url of opts.revalidateUrls) {
            responseCache.delete(url);
            void dedupFetch(url).then(async (r: Response) => {
              if (r.ok) {
                const d = await r.json();
                responseCache.set(url, { data: d, timestamp: Date.now() });
              }
            }).catch(() => {});
          }
        }

        opts.onSettled?.(result, undefined, variables, context);
        setIsLoading(false);
        return result;
      } catch (err) {
        lastError = err as Error;
        if (attempt < maxRetries) {
          setRetryCount(attempt + 1);
          await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    // All retries exhausted — rollback
    if (lastError) {
      setError(lastError);
      opts.onError?.(lastError, variables, context);
      opts.onSettled?.(undefined, lastError, variables, context);
    }
    setIsLoading(false);
    throw lastError;
  }, []);

  const reset = useCallback(() => {
    setData(undefined);
    setError(undefined);
    setIsLoading(false);
    setRetryCount(0);
  }, []);

  return { mutate, data, error, isLoading, retryCount, reset };
}

// ─── #249: Server-Side Query Prefetching ─────────────────────────────────

/**
 * Prefetch cache — stores data fetched on the server for hydration.
 * This is a simple in-memory store that gets serialized and sent to the client.
 */
const prefetchStore = new Map<string, { data: unknown; timestamp: number }>();

/**
 * Prefetches a query on the server during SSR.
 * The result is stored in the prefetch store and can be dehydrated
 * for transfer to the client.
 *
 * Usage in server components:
 *   const posts = await prefetchQuery('/api/posts', { revalidate: 60 });
 *   // posts is available immediately, and the data is cached for hydration
 */
export async function prefetchQuery<T = unknown>(
  url: string,
  _options?: { revalidate?: number; tags?: string[] },
): Promise<T> {
  // Check if already in prefetch store
  const cached = prefetchStore.get(url);
  if (cached) {
    return cached.data as T;
  }

  // Fetch the data
  const res = await fetch(url);
  if (!res.ok) throw new Error(`prefetchQuery failed: ${res.status}`);
  const data = (await res.json()) as T;

  // Store in prefetch store
  prefetchStore.set(url, { data, timestamp: Date.now() });

  // Also store in the response cache for client-side use
  responseCache.set(url, { data, timestamp: Date.now() });

  return data;
}

/**
 * Serializes the prefetch store for transfer to the client.
 * Returns a JSON string that can be embedded in the HTML response.
 *
 * Usage in SSR:
 *   const dehydratedState = dehydrate();
 *   // Embed in HTML: <script>window.__PLEDGE_DEHYDRATED__ = ${dehydratedState}</script>
 */
export function dehydrate(): string {
  const entries: Record<string, { data: unknown; timestamp: number }> = {};
  for (const [key, value] of prefetchStore.entries()) {
    entries[key] = value;
  }
  return JSON.stringify(entries);
}

/**
 * Hydrates the client-side cache from a dehydrated server state.
 * Call this on the client to populate the cache before rendering.
 *
 * Usage on client:
 *   hydrateCache(window.__PLEDGE_DEHYDRATED__);
 *   // Now useSWR('/api/posts') will use the prefetched data
 */
export function hydrateCache(dehydratedState: string): void {
  try {
    const entries = JSON.parse(dehydratedState) as Record<string, { data: unknown; timestamp: number }>;
    for (const [key, value] of Object.entries(entries)) {
      responseCache.set(key, value);
    }
  } catch {
    // Invalid dehydrated state — ignore
  }
}

/**
 * Clears the prefetch store. Called after dehydration to prevent
 * stale data from leaking between requests.
 */
export function clearPrefetchStore(): void {
  prefetchStore.clear();
}

/**
 * React component that injects the dehydrated state into the page.
 * Place this in your root layout's <head> or before closing <body>.
 *
 * Usage:
 *   <DehydrateState />
 */
export function DehydrateState(): ReactNode {
  if (typeof window !== 'undefined') return null;
  const state = dehydrate();
  if (state === '{}') return null;

  return createElement('script', {
    dangerouslySetInnerHTML: {
      __html: `window.__PLEDGE_DEHYDRATED__ = ${state};`,
    },
  });
}

/**
 * Hook that automatically hydrates the cache on mount.
 * Call this once in your root client component.
 *
 * Usage:
 *   function App() {
 *     useHydrate();
 *     return <Router />;
 *   }
 */
export function useHydrate(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { __PLEDGE_DEHYDRATED__?: string };
    if (w.__PLEDGE_DEHYDRATED__) {
      hydrateCache(w.__PLEDGE_DEHYDRATED__);
      delete w.__PLEDGE_DEHYDRATED__;
    }
  }, []);
}

// ─── #250: Mutation Queue ────────────────────────────────────────────────

/**
 * Mutation queue — serializes concurrent mutations to the same cache key,
 * deduplicates identical mutations, and provides retry with exponential backoff.
 *
 * Each cache key gets its own queue. Mutations are processed sequentially
 * to prevent race conditions. If a mutation fails, it retries up to the
 * configured limit before rolling back and proceeding to the next queued
 * mutation.
 */

interface QueuedMutation {
  id: string;
  key: string;
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  retries: number;
  maxRetries: number;
  retryDelay: number;
}

const mutationQueues = new Map<string, QueuedMutation[]>();
const processingQueues = new Set<string>();
const mutationDedup = new Map<string, Promise<unknown>>();

/**
 * Enqueues a mutation for a given cache key. Mutations to the same key
 * are processed sequentially. Identical mutations (same key + same fn.toString())
 * are deduplicated — the second call returns the same promise as the first.
 *
 * @param key - Cache key for queue serialization
 * @param fn - Mutation function to execute
 * @param options - Retry configuration
 * @returns Promise that resolves with the mutation result
 */
export function enqueueMutation<T>(
  key: string,
  fn: () => Promise<T>,
  options?: { maxRetries?: number; retryDelay?: number },
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const retryDelay = options?.retryDelay ?? 1000;

  // Dedup: if an identical mutation is already queued/processing, return its promise
  const dedupKey = `${key}:${fn.toString()}`;
  const existing = mutationDedup.get(dedupKey);
  if (existing) return existing as Promise<T>;

  const promise = new Promise<T>((resolve, reject) => {
    const mutation: QueuedMutation = {
      id: `${key}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      key,
      fn: fn as () => Promise<unknown>,
      resolve: resolve as (value: unknown) => void,
      reject,
      retries: 0,
      maxRetries,
      retryDelay,
    };

    const queue = mutationQueues.get(key) ?? [];
    queue.push(mutation);
    mutationQueues.set(key, queue);

    void processQueue(key);
  });

  mutationDedup.set(dedupKey, promise);
  promise.finally(() => mutationDedup.delete(dedupKey));

  return promise;
}

async function processQueue(key: string): Promise<void> {
  if (processingQueues.has(key)) return;
  processingQueues.add(key);

  while (true) {
    const queue = mutationQueues.get(key);
    if (!queue || queue.length === 0) break;

    const mutation = queue[0];

    try {
      const result = await mutation.fn();
      mutation.resolve(result);
    } catch (err) {
      if (mutation.retries < mutation.maxRetries) {
        mutation.retries++;
        await new Promise((r) => setTimeout(r, mutation.retryDelay * mutation.retries));
        continue; // Retry same mutation
      }
      mutation.reject(err as Error);
    }

    // Remove processed mutation
    queue.shift();
    mutationQueues.set(key, queue);
  }

  processingQueues.delete(key);
}

/**
 * Hook that provides a queued mutation function. All mutations to the same
 * key are serialized and deduplicated.
 *
 * Usage:
 *   const { mutate, isLoading, queueLength } = useQueuedMutation('todos');
 *   await mutate(() => fetch('/api/todos', { method: 'POST', body: ... }));
 */
export function useQueuedMutation<T = unknown>(key: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [error, setError] = useState<Error | undefined>(undefined);

  const mutate = useCallback(
    async (fn: () => Promise<T>, options?: { maxRetries?: number; retryDelay?: number }): Promise<T> => {
      setIsLoading(true);
      setError(undefined);
      setQueueLength((mutationQueues.get(key)?.length ?? 0) + 1);
      try {
        const result = await enqueueMutation(key, fn, options);
        return result;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
        setQueueLength(mutationQueues.get(key)?.length ?? 0);
      }
    },
    [key],
  );

  return { mutate, isLoading, queueLength, error };
}

// ─── #252: Real-Time Data Hooks (useSubscription) ────────────────────────

export interface UseSubscriptionOptions<T> {
  /** Transform raw message data before storing */
  transform?: (data: unknown) => T;
  /** Initial data (from SSR) */
  initialData?: T;
  /** Reconnect automatically (default: true) */
  autoReconnect?: boolean;
  /** Max reconnection attempts (default: 5) */
  maxReconnects?: number;
  /** Reconnection delay base in ms (default: 1000, exponential backoff) */
  reconnectDelay?: number;
  /** Enabled flag */
  enabled?: boolean;
}

export interface UseSubscriptionResult<T> {
  /** Latest data from the stream */
  data: T | undefined;
  /** Whether the connection is open */
  isConnected: boolean;
  /** Whether currently reconnecting */
  isReconnecting: boolean;
  /** Connection error */
  error: Error | undefined;
  /** Reconnect count */
  reconnectCount: number;
  /** Manually send data (WebSocket only) */
  send: (data: string | ArrayBuffer) => void;
  /** Manually close the connection */
  close: () => void;
}

/**
 * Real-time data subscription hook for WebSocket and SSE streams.
 *
 * For WebSocket:
 *   const { data, isConnected, send } = useSubscription<MessageType>('ws://localhost:3001/ws');
 *
 * For SSE:
 *   const { data, isConnected } = useSubscription<EventType>('/api/events', { type: 'sse' });
 */
export function useSubscription<T = unknown>(
  url: string,
  options: UseSubscriptionOptions<T> & { type?: 'websocket' | 'sse' } = {},
): UseSubscriptionResult<T> {
  const {
    transform,
    initialData,
    autoReconnect = true,
    maxReconnects = 5,
    reconnectDelay = 1000,
    enabled = true,
    type = url.startsWith('ws://') || url.startsWith('wss://') ? 'websocket' : 'sse',
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [reconnectCount, setReconnectCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    if (type === 'websocket') {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectCountRef.current = 0;
        setReconnectCount(0);
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          setData(transform ? transform(raw) : (raw as T));
        } catch {
          setData(transform ? transform(event.data) : (event.data as T));
        }
      };

      ws.onerror = () => {
        setError(new Error('WebSocket error'));
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (autoReconnect && reconnectCountRef.current < maxReconnects) {
          reconnectCountRef.current++;
          setReconnectCount(reconnectCountRef.current);
          setIsReconnecting(true);
          reconnectTimerRef.current = setTimeout(
            () => connect(),
            reconnectDelay * Math.pow(2, reconnectCountRef.current - 1),
          );
        }
      };
    } else {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectCountRef.current = 0;
        setReconnectCount(0);
      };

      es.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          setData(transform ? transform(raw) : (raw as T));
        } catch {
          setData(transform ? transform(event.data) : (event.data as T));
        }
      };

      es.onerror = () => {
        setError(new Error('SSE connection error'));
        setIsConnected(false);
        if (autoReconnect && reconnectCountRef.current < maxReconnects) {
          reconnectCountRef.current++;
          setReconnectCount(reconnectCountRef.current);
          setIsReconnecting(true);
          // EventSource auto-reconnects, but we track the count
        }
      };
    }
  }, [url, type, enabled, autoReconnect, maxReconnects, reconnectDelay, transform]);

  useEffect(() => {
    if (!enabled) return;
    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect, enabled]);

  const send = useCallback((data: string | ArrayBuffer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const close = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  return {
    data,
    isConnected,
    isReconnecting,
    error,
    reconnectCount,
    send,
    close,
  };
}

// ─── #253: Selective Cache Invalidation ──────────────────────────────────

/**
 * Invalidates cache entries matching a pattern. Supports wildcards:
 * - `invalidate('users/*')` — all URLs starting with 'users/'
 * - `invalidate('users/123')` — exact match
 * - `invalidate('**')` — clear entire cache
 *
 * @param pattern - Glob-style pattern (* matches any chars except /, ** matches everything)
 * @returns Number of entries invalidated
 */
export function invalidateCache(pattern: string): number {
  let count = 0;

  // Convert glob pattern to regex
  const regex = globToRegex(pattern);

  for (const key of responseCache.keys()) {
    if (regex.test(key)) {
      responseCache.delete(key);
      count++;
    }
  }

  return count;
}

/**
 * Invalidates cache entries and triggers revalidation by re-fetching them.
 * Returns a map of URL → fetch promise for tracking revalidation progress.
 *
 * @param pattern - Glob-style pattern
 * @returns Map of revalidation promises
 */
export async function revalidatePattern(
  pattern: string,
): Promise<Map<string, Promise<Response>>> {
  const regex = globToRegex(pattern);
  const revalidations = new Map<string, Promise<Response>>();

  for (const key of responseCache.keys()) {
    if (regex.test(key)) {
      responseCache.delete(key);
      revalidations.set(key, dedupFetch(key));
    }
  }

  return revalidations;
}

/**
 * Hook that provides pattern-based cache invalidation functions.
 *
 * Usage:
 *   const { invalidate, revalidate } = useCacheInvalidation();
 *   await invalidate('users/*');
 *   await revalidate('posts/**');
 */
export function useCacheInvalidation() {
  const invalidate = useCallback((pattern: string) => {
    const count = invalidateCache(pattern);
    return count;
  }, []);

  const revalidate = useCallback(async (pattern: string) => {
    const promises = await revalidatePattern(pattern);
    await Promise.allSettled(promises.values());
    return promises.size;
  }, []);

  return { invalidate, revalidate };
}

/**
 * Converts a glob pattern to a RegExp.
 * `*` matches any characters except `/`
 * `**` matches any characters including `/`
 */
function globToRegex(pattern: string): RegExp {
  let regex = '';
  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === '*' && pattern[i + 1] === '*') {
      regex += '.*';
      i += 2;
    } else if (pattern[i] === '*') {
      regex += '[^/]*';
      i++;
    } else {
      regex += pattern[i].replace(/[.+^${}()|[\]\\]/g, '\\$&');
      i++;
    }
  }
  return new RegExp(`^${regex}$`);
}

// ─── #254: Cross-Tab State Synchronization ───────────────────────────────

const BROADCAST_CHANNEL_NAME = '__pledge_cache_sync__';
const broadcastRef = { current: null as BroadcastChannel | null };

/**
 * Initializes cross-tab cache synchronization via BroadcastChannel.
 * When one tab invalidates or updates cache, all other tabs receive
 * the change and update their local caches.
 *
 * Call this once in your root client component:
 *   useCrossTabSync();
 */
export function useCrossTabSync(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    broadcastRef.current = channel;

    channel.onmessage = (event) => {
      const msg = event.data as CrossTabMessage;
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'invalidate':
          if (msg.pattern) {
            invalidateCache(msg.pattern);
          }
          break;
        case 'update':
          if (msg.key && msg.data !== undefined) {
            responseCache.set(msg.key, { data: msg.data, timestamp: Date.now() });
          }
          break;
        case 'clear':
          responseCache.clear();
          break;
      }
    };

    return () => {
      channel.close();
      broadcastRef.current = null;
    };
  }, []);
}

interface CrossTabMessage {
  type: 'invalidate' | 'update' | 'clear';
  key?: string;
  pattern?: string;
  data?: unknown;
}

/**
 * Broadcasts a cache invalidation to all tabs.
 * Also invalidates locally.
 */
export function broadcastInvalidate(pattern: string): void {
  invalidateCache(pattern);
  if (broadcastRef.current) {
    broadcastRef.current.postMessage({ type: 'invalidate', pattern } satisfies CrossTabMessage);
  }
}

/**
 * Broadcasts a cache update to all tabs.
 * Also updates locally.
 */
export function broadcastUpdate(key: string, data: unknown): void {
  responseCache.set(key, { data, timestamp: Date.now() });
  if (broadcastRef.current) {
    broadcastRef.current.postMessage({ type: 'update', key, data } satisfies CrossTabMessage);
  }
}

/**
 * Broadcasts a full cache clear to all tabs.
 * Also clears locally.
 */
export function broadcastClear(): void {
  responseCache.clear();
  if (broadcastRef.current) {
    broadcastRef.current.postMessage({ type: 'clear' } satisfies CrossTabMessage);
  }
}

/**
 * Hook that provides cross-tab cache operations.
 * Must be used within a component tree that has called useCrossTabSync().
 *
 * Usage:
 *   const { invalidate, update, clear } = useCrossTabCache();
 *   await invalidate('users/*');  // Invalidates in all tabs
 */
export function useCrossTabCache() {
  const invalidate = useCallback((pattern: string) => {
    broadcastInvalidate(pattern);
  }, []);

  const update = useCallback((key: string, data: unknown) => {
    broadcastUpdate(key, data);
  }, []);

  const clear = useCallback(() => {
    broadcastClear();
  }, []);

  return { invalidate, update, clear };
}
