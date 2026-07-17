import type { PledgeResponse } from 'pledgestack-shared';

/**
 * Edge cache strategy utilities.
 *
 * Provides:
 * - Stale-while-revalidate cache header generation
 * - CDN-Cache-Control directives for edge providers
 * - Cache-Tags for tag-based invalidation
 */

export interface CacheConfig {
  /** Max age in seconds for browser cache (default: 0) */
  maxAge?: number;
  /** Stale-while-revalidate window in seconds (default: 60) */
  staleWhileRevalidate?: number;
  /** CDN max age in seconds (default: same as maxAge) */
  cdnMaxAge?: number;
  /** Cache tags for tag-based invalidation */
  tags?: string[];
  /** Whether response is stale-if-error (serve cached on origin error) */
  staleIfError?: number;
  /** Vary headers (default: ['Accept']) */
  vary?: string[];
  /** Whether to use public or private cache (default: 'public') */
  visibility?: 'public' | 'private';
  /** Whether this response should never be cached */
  noStore?: boolean;
  /** Immutable flag — for hashed assets */
  immutable?: boolean;
}

const DEFAULT_MAX_AGE = 0;
const DEFAULT_SWR = 60;
const DEFAULT_VARY = ['Accept'];

/**
 * Generate Cache-Control header value from config.
 */
export function generateCacheControl(config: CacheConfig): string {
  if (config.noStore) {
    return 'no-store, no-cache, must-revalidate';
  }

  const parts: string[] = [];
  const visibility = config.visibility ?? 'public';
  const maxAge = config.maxAge ?? DEFAULT_MAX_AGE;
  const swr = config.staleWhileRevalidate ?? DEFAULT_SWR;

  parts.push(visibility);
  parts.push(`max-age=${maxAge}`);
  parts.push(`stale-while-revalidate=${swr}`);

  if (config.staleIfError !== undefined) {
    parts.push(`stale-if-error=${config.staleIfError}`);
  }

  if (config.immutable && maxAge > 0) {
    parts.push('immutable');
  }

  return parts.join(', ');
}

/**
 * Generate CDN-Cache-Control header for edge providers.
 * This controls how long the CDN caches the response, independent of browser cache.
 */
export function generateCdnCacheControl(config: CacheConfig): string {
  if (config.noStore) {
    return 'no-store';
  }

  const cdnMaxAge = config.cdnMaxAge ?? config.maxAge ?? DEFAULT_MAX_AGE;
  const swr = config.staleWhileRevalidate ?? DEFAULT_SWR;

  const parts: string[] = [];
  parts.push(`max-age=${cdnMaxAge}`);
  parts.push(`stale-while-revalidate=${swr}`);

  if (config.staleIfError !== undefined) {
    parts.push(`stale-if-error=${config.staleIfError}`);
  }

  return parts.join(', ');
}

/**
 * Generate all cache-related headers from config.
 */
export function generateCacheHeaders(config: CacheConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  headers['Cache-Control'] = generateCacheControl(config);
  headers['CDN-Cache-Control'] = generateCdnCacheControl(config);

  if (config.tags && config.tags.length > 0) {
    headers['Cache-Tag'] = config.tags.join(',');
  }

  const vary = config.vary ?? DEFAULT_VARY;
  if (vary.length > 0) {
    headers['Vary'] = vary.join(', ');
  }

  return headers;
}

/**
 * Apply cache headers to an existing response.
 */
export function withCacheHeaders(response: PledgeResponse, config: CacheConfig): PledgeResponse {
  return {
    ...response,
    headers: {
      ...response.headers,
      ...generateCacheHeaders(config),
    },
  };
}

/**
 * Create a stale-while-revalidate response.
 * The browser shows cached content immediately while revalidating in the background.
 */
export function swrResponse(
  body: string,
  options: {
    maxAge?: number;
    staleWhileRevalidate?: number;
    cdnMaxAge?: number;
    tags?: string[];
    contentType?: string;
  } = {},
): PledgeResponse {
  return {
    status: 200,
    headers: {
      'Content-Type': options.contentType ?? 'application/json',
      ...generateCacheHeaders({
        maxAge: options.maxAge ?? 0,
        staleWhileRevalidate: options.staleWhileRevalidate ?? 60,
        cdnMaxAge: options.cdnMaxAge,
        tags: options.tags,
      }),
    },
    body,
  };
}

/**
 * Create an immutable cached response for hashed assets.
 */
export function immutableResponse(body: string, contentType: string, maxAge = 31536000): PledgeResponse {
  return {
    status: 200,
    headers: {
      'Content-Type': contentType,
      ...generateCacheHeaders({
        maxAge,
        staleWhileRevalidate: 86400,
        immutable: true,
      }),
    },
    body,
  };
}

/**
 * Create a no-store response that should never be cached.
 */
export function noStoreResponse(body: string, contentType = 'application/json'): PledgeResponse {
  return {
    status: 200,
    headers: {
      'Content-Type': contentType,
      ...generateCacheHeaders({ noStore: true }),
    },
    body,
  };
}

/**
 * Parse Cache-Control header into config object.
 */
export function parseCacheControl(header: string): Partial<CacheConfig> {
  const config: Partial<CacheConfig> = {};
  const directives = header.split(',').map((d) => d.trim().toLowerCase());

  for (const directive of directives) {
    if (directive === 'no-store') {
      config.noStore = true;
    } else if (directive === 'public') {
      config.visibility = 'public';
    } else if (directive === 'private') {
      config.visibility = 'private';
    } else if (directive === 'immutable') {
      config.immutable = true;
    } else if (directive.startsWith('max-age=')) {
      config.maxAge = parseInt(directive.slice(8), 10);
    } else if (directive.startsWith('stale-while-revalidate=')) {
      config.staleWhileRevalidate = parseInt(directive.slice(23), 10);
    } else if (directive.startsWith('stale-if-error=')) {
      config.staleIfError = parseInt(directive.slice(15), 10);
    }
  }

  return config;
}
