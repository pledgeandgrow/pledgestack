import { createHash } from 'node:crypto';

export type FetchCacheOption = 'force-cache' | 'no-store' | 'default' | 'isr';

export interface FetchOptions extends Omit<RequestInit, 'cache'> {
  /** Cache behavior: 'force-cache' (cache indefinitely), 'no-store' (bypass cache), 'isr' (cache with revalidation) */
  cache?: FetchCacheOption;
  /** Revalidation interval in seconds (only used with cache: 'isr') */
  revalidate?: number;
  /** Tags for on-demand revalidation */
  tags?: string[];
}

interface CacheEntry {
  response: Response;
  timestamp: number;
  revalidate?: number;
  tags: string[];
}

const cache = new Map<string, CacheEntry>();
const tagIndex = new Map<string, Set<string>>();

/**
 * Cached fetch implementation for server-side data fetching.
 * Supports 'force-cache', 'no-store', 'default', and 'isr' cache modes.
 */
export async function cachedFetch(url: string | URL, options: FetchOptions = {}): Promise<Response> {
  const urlStr = typeof url === 'string' ? url : url.toString();
  const cacheMode = options.cache ?? 'default';
  const revalidate = options.revalidate;
  const tags = options.tags ?? [];

  // Bypass cache entirely
  if (cacheMode === 'no-store') {
    return fetch(url, stripPledgeOptions(options));
  }

  const cacheKey = computeCacheKey(urlStr, options);

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    const now = Date.now();

    // Check if entry is still fresh
    if (cacheMode === 'force-cache') {
      return cached.response.clone();
    }

    if (cached.revalidate !== undefined) {
      const ageSeconds = (now - cached.timestamp) / 1000;
      if (ageSeconds < cached.revalidate) {
        return cached.response.clone();
      }
      // Stale — revalidate in background
      revalidateInBackground(cacheKey, urlStr, options, revalidate, tags);
      return cached.response.clone();
    }

    // Default cache: use if fresh (5 min default)
    const ageSeconds = (now - cached.timestamp) / 1000;
    if (ageSeconds < 300) {
      return cached.response.clone();
    }
  }

  // Fetch and cache
  const response = await fetch(url, stripPledgeOptions(options));
  const entry: CacheEntry = {
    response: response.clone(),
    timestamp: Date.now(),
    revalidate: cacheMode === 'isr' ? revalidate : undefined,
    tags,
  };

  cache.set(cacheKey, entry);

  // Update tag index
  for (const tag of tags) {
    if (!tagIndex.has(tag)) tagIndex.set(tag, new Set());
    tagIndex.get(tag)!.add(cacheKey);
  }

  return response.clone();
}

/**
 * Revalidates all cached responses associated with a tag.
 */
export function revalidateTag(tag: string): void {
  const keys = tagIndex.get(tag);
  if (!keys) return;
  for (const key of keys) {
    cache.delete(key);
  }
  tagIndex.delete(tag);
}

/**
 * Revalidates a specific path's cached responses.
 */
export function revalidatePath(path: string): void {
  for (const [key, entry] of cache) {
    if (key.includes(path)) {
      cache.delete(key);
      for (const tag of entry.tags) {
        tagIndex.get(tag)?.delete(key);
      }
    }
  }
}

/**
 * Clears the entire fetch cache.
 */
export function clearFetchCache(): void {
  cache.clear();
  tagIndex.clear();
}

function stripPledgeOptions(options: FetchOptions): RequestInit {
  const { cache: _cache, revalidate: _revalidate, tags: _tags, ...init } = options;
  return init;
}

function computeCacheKey(url: string, options: FetchOptions): string {
  const data = `${url}:${options.method ?? 'GET'}:${JSON.stringify(options.headers ?? {})}`;
  return createHash('sha256').update(data).digest('hex');
}

async function revalidateInBackground(
  cacheKey: string,
  url: string,
  options: FetchOptions,
  revalidate: number | undefined,
  tags: string[],
): Promise<void> {
  try {
    const response = await fetch(url, stripPledgeOptions(options));
    cache.set(cacheKey, {
      response: response.clone(),
      timestamp: Date.now(),
      revalidate,
      tags,
    });
  } catch {
    // Keep stale data on background fetch failure
  }
}
