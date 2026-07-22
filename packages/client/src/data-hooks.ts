/**
 * Client-side data fetching hooks with built-in dedup, caching, and SWR.
 *
 * - useFetch: Simple fetch hook with caching and automatic revalidation
 * - useSWR: SWR-style hook (stale-while-revalidate) with focus/interval refresh
 * - useMutation: Mutation hook for data changes with optimistic updates
 *
 * These hooks work with the PledgeStack server-side cache for seamless
 * data fetching in client components.
 */

import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';
import { createElement } from 'react';

// --- Global request dedup cache ---

const requestCache = new Map<string, Promise<Response>>();
export const responseCache = new Map<string, { data: unknown; timestamp: number }>();

export function dedupFetch(url: string, options?: RequestInit): Promise<Response> {
  const key = `${options?.method ?? 'GET'}:${url}`;
  if (requestCache.has(key)) {
    return requestCache.get(key)!;
  }
  const promise = fetch(url, options);
  requestCache.set(key, promise);
  promise.finally(() => requestCache.delete(key));
  return promise;
}

// --- useFetch ---

export interface UseFetchOptions<T> {
  /** Initial data before fetch completes */
  initialData?: T;
  /** Revalidate on window focus (default: false) */
  revalidateOnFocus?: boolean;
  /** Revalidate interval in ms (0 = disabled) */
  refreshInterval?: number;
  /** Dedup requests within this window (ms, default: 2000) */
  dedupingInterval?: number;
  /** Fetch options */
  fetchOptions?: RequestInit;
  /** Transform response data */
  transform?: (data: unknown) => T;
  /** Enabled flag (false = don't fetch) */
  enabled?: boolean;
}

export interface UseFetchResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (data?: T) => void;
  revalidate: () => void;
}

/**
 * Simple data fetching hook with caching and dedup.
 *
 * Usage:
 *   const { data, error, isLoading } = useFetch('/api/posts');
 *   const { data } = useFetch('/api/user', { revalidateOnFocus: true });
 */
export function useFetch<T = unknown>(url: string, options: UseFetchOptions<T> = {}): UseFetchResult<T> {
  const {
    initialData,
    revalidateOnFocus = false,
    refreshInterval = 0,
    dedupingInterval = 2000,
    fetchOptions,
    transform,
    enabled = true,
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(!initialData && enabled);
  const [isValidating, setIsValidating] = useState(false);
  const lastFetchRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    const now = Date.now();
    if (now - lastFetchRef.current < dedupingInterval) return;
    lastFetchRef.current = now;

    setIsValidating(true);
    try {
      const res = await dedupFetch(url, fetchOptions);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const rawData = await res.json();
      const transformed = transform ? transform(rawData) : rawData as T;
      setData(transformed);
      responseCache.set(url, { data: transformed, timestamp: Date.now() });
      setError(undefined);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [url, enabled, dedupingInterval, fetchOptions, transform]);

  useEffect(() => {
    if (!enabled) return;
    void fetchData();
  }, [fetchData, enabled]);

  useEffect(() => {
    if (!revalidateOnFocus) return;
    const handler = () => void fetchData();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [revalidateOnFocus, fetchData]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const interval = setInterval(() => void fetchData(), refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchData]);

  const mutate = useCallback((newData?: T) => {
    if (newData !== undefined) {
      setData(newData);
      responseCache.set(url, { data: newData, timestamp: Date.now() });
    } else {
      void fetchData();
    }
  }, [url, fetchData]);

  const revalidate = useCallback(() => {
    lastFetchRef.current = 0;
    void fetchData();
  }, [fetchData]);

  return { data, error, isLoading, isValidating, mutate, revalidate };
}

// --- useSWR ---

export interface UseSWROptions<T> extends UseFetchOptions<T> {
  /** Fallback data from server-rendered props */
  fallbackData?: T;
  /** Revalidate on mount (default: true) */
  revalidateOnMount?: boolean;
  /** Keep previous data while fetching new data */
  keepPreviousData?: boolean;
}

/**
 * SWR-style hook with stale-while-revalidate semantics.
 * Returns cached data immediately (stale) while fetching fresh data.
 *
 * Usage:
 *   const { data, error, isValidating } = useSWR('/api/posts', {
 *     fallbackData: serverProps.posts,
 *     revalidateOnFocus: true,
 *   });
 */
export function useSWR<T = unknown>(url: string, options: UseSWROptions<T> = {}): UseFetchResult<T> {
  const {
    fallbackData,
    revalidateOnMount = true,
    keepPreviousData = true,
    ...fetchOptions
  } = options;

  // Use cached data or fallback as initial
  const cached = responseCache.get(url);
  const initial = (cached?.data as T) ?? fallbackData;

  const result = useFetch<T>(url, {
    ...fetchOptions,
    initialData: initial,
    enabled: revalidateOnMount,
  });

  // Override isLoading to be false if we have initial/cached data
  const isLoading = !initial && result.isLoading;
  const data = keepPreviousData ? (result.data ?? initial) : result.data;

  return { ...result, data, isLoading };
}

// --- useMutation ---

export interface UseMutationOptions<TData, TVariables> {
  /** Optimistic update handler */
  onMutate?: (variables: TVariables) => TData | undefined;
  /** Rollback on error */
  onError?: (error: Error, variables: TVariables) => void;
  /** Success handler */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Revalidate these URLs after mutation */
  revalidateUrls?: string[];
}

export interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  error: Error | undefined;
  isLoading: boolean;
  reset: () => void;
}

/**
 * Mutation hook for data changes with optimistic updates.
 *
 * Usage:
 *   const { mutate, isLoading } = useMutation('/api/posts', {
 *     onMutate: (newPost) => {
 *       // Optimistically update UI
 *     },
 *     revalidateUrls: ['/api/posts'],
 *   });
 *   await mutate({ title: 'New Post' });
 */
export function useMutation<TData = unknown, TVariables = unknown>(
  url: string,
  options: UseMutationOptions<TData, TVariables> = {},
): UseMutationResult<TData, TVariables> {
  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    setIsLoading(true);
    setError(undefined);

    let optimisticData: TData | undefined;
    if (options.onMutate) {
      optimisticData = options.onMutate(variables);
      if (optimisticData !== undefined) {
        setData(optimisticData);
      }
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      });

      if (!res.ok) throw new Error(`Mutation failed: ${res.status}`);

      const result = (await res.json()) as TData;
      setData(result);
      options.onSuccess?.(result, variables);

      // Revalidate associated URLs
      if (options.revalidateUrls) {
        for (const revalidateUrl of options.revalidateUrls) {
          responseCache.delete(revalidateUrl);
          // Trigger a background revalidation
          void dedupFetch(revalidateUrl).then(async (r) => {
            if (r.ok) {
              const d = await r.json();
              responseCache.set(revalidateUrl, { data: d, timestamp: Date.now() });
            }
          }).catch(() => {});
        }
      }

      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      if (optimisticData !== undefined) {
        // Rollback optimistic update
        setData(undefined);
      }
      options.onError?.(error, variables);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [url, options]);

  const reset = useCallback(() => {
    setData(undefined);
    setError(undefined);
    setIsLoading(false);
  }, []);

  return { mutate, data, error, isLoading, reset };
}

// --- SWRConfig context ---

export interface SWRConfigValue {
  /** Default fetch options for all useFetch/useSWR calls */
  defaultOptions?: Partial<UseFetchOptions<unknown>>;
  /** Global fallback data */
  fallback?: Record<string, unknown>;
  /** Prefix for all URLs */
  baseUrl?: string;
}

const SWRConfigContext = createContext<SWRConfigValue | null>(null);

export function SWRConfigProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: SWRConfigValue;
}) {
  return createElement(SWRConfigContext.Provider, { value: config }, children);
}

export function useSWRConfig(): SWRConfigValue {
  return useContext(SWRConfigContext) ?? {};
}
