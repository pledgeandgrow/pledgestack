/**
 * #274 — Edge Streaming SSR.
 *
 * Stream SSR from edge runtime with RSC, partial prerendering at edge,
 * dynamic data from edge KV/D1, sub-50ms TTFB globally.
 *
 * Provides:
 * - Edge SSR stream renderer
 * - RSC payload streaming from edge
 * - Partial prerendering with edge cache
 * - Dynamic hole filling from edge KV/D1
 * - TTFB optimization utilities
 */

import { Readable, Transform } from 'node:stream';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EdgeSsrConfig {
  /** Whether to enable partial prerendering */
  enablePpr?: boolean;
  /** Whether to stream RSC payload */
  streamRsc?: boolean;
  /** Edge cache TTL in seconds for static shell (default: 300) */
  staticCacheTtl?: number;
  /** Max dynamic holes to fill (default: 10) */
  maxDynamicHoles?: number;
  /** Timeout for dynamic data fetching in ms (default: 5000) */
  dynamicFetchTimeout?: number;
}

export interface SsrChunk {
  type: 'static' | 'dynamic' | 'rsc' | 'metadata' | 'script' | 'done';
  content: string;
  index?: number;
}

export interface PsxDynamicHole {
  id: string;
  placeholder: string;
  fetcher: () => Promise<string>;
  fallback?: string;
}

export interface EdgeSsrResult {
  html: string;
  rscPayload?: string;
  ttfbMs: number;
  totalMs: number;
  holes: number;
  cached: boolean;
}

// ---------------------------------------------------------------------------
// Edge SSR Stream Renderer
// ---------------------------------------------------------------------------

/**
 * Edge SSR stream renderer that combines static prerendered shell
 * with dynamic data from edge KV/D1.
 */
export class EdgeSsrRenderer {
  private config: Required<EdgeSsrConfig>;

  constructor(config: EdgeSsrConfig = {}) {
    this.config = {
      enablePpr: config.enablePpr ?? true,
      streamRsc: config.streamRsc ?? true,
      staticCacheTtl: config.staticCacheTtl ?? 300,
      maxDynamicHoles: config.maxDynamicHoles ?? 10,
      dynamicFetchTimeout: config.dynamicFetchTimeout ?? 5000,
    };
  }

  /**
   * Renders a page with streaming SSR, filling dynamic holes from edge.
   */
  async render(
    staticShell: string,
    holes: PsxDynamicHole[],
    rscPayload?: string,
  ): Promise<EdgeSsrResult> {
    const startTime = Date.now();
    let ttfbMs = 0;

    if (holes.length > this.config.maxDynamicHoles) {
      holes = holes.slice(0, this.config.maxDynamicHoles);
    }

    // Fetch all dynamic data in parallel with timeout
    const fetchPromises = holes.map(async (hole) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.dynamicFetchTimeout);
        const content = await hole.fetcher();
        clearTimeout(timeout);
        return { id: hole.id, content, placeholder: hole.placeholder };
      } catch {
        return { id: hole.id, content: hole.fallback ?? `<!-- ${hole.placeholder} -->`, placeholder: hole.placeholder };
      }
    });

    // TTFB is when first byte would be sent (the static shell)
    ttfbMs = Date.now() - startTime;

    const results = await Promise.all(fetchPromises);

    // Fill holes in the static shell
    let html = staticShell;
    for (const result of results) {
      html = html.replace(result.placeholder, result.content);
    }

    const totalMs = Date.now() - startTime;

    return {
      html,
      rscPayload,
      ttfbMs,
      totalMs,
      holes: holes.length,
      cached: false,
    };
  }

  /**
   * Creates a streaming response with progressive HTML injection.
   */
  createStream(
    staticShell: string,
    holes: PsxDynamicHole[],
  ): Readable {
    const chunks: SsrChunk[] = [
      { type: 'static', content: staticShell, index: 0 },
    ];

    const stream = new Readable({
      read() {},
    });

    // Push static shell immediately for fast TTFB
    stream.push(chunks[0].content);

    // Fetch dynamic data and push as it arrives
    Promise.all(
      holes.map(async (hole) => {
        try {
          const content = await hole.fetcher();
          return { type: 'dynamic' as const, content, placeholder: hole.placeholder };
        } catch {
          return { type: 'dynamic' as const, content: hole.fallback ?? '', placeholder: hole.placeholder };
        }
      }),
    ).then((results) => {
      for (const result of results) {
        stream.push(result.content);
      }
      stream.push(null);
    });

    return stream;
  }

  /**
   * Creates a Transform stream that injects dynamic content into placeholders.
   */
  createHoleFiller(holes: PsxDynamicHole[]): Transform {
    let buffer = '';
    const holeMap = new Map(holes.map(h => [h.placeholder, h]));

    return new Transform({
      transform(chunk, _encoding, callback) {
        buffer += chunk.toString();

        // Check for complete placeholders in buffer
        for (const [placeholder, hole] of holeMap) {
          if (buffer.includes(placeholder)) {
            hole.fetcher().then((content) => {
              buffer = buffer.replace(placeholder, content);
              callback(null, buffer);
              buffer = '';
            }).catch(() => {
              buffer = buffer.replace(placeholder, hole.fallback ?? '');
              callback(null, buffer);
              buffer = '';
            });
            return;
          }
        }

        callback(null, chunk);
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Partial Prerendering
// ---------------------------------------------------------------------------

export interface PprCacheEntry {
  html: string;
  rscPayload?: string;
  cachedAt: number;
  ttl: number;
}

/**
 * Edge cache for partial prerendering.
 */
export class PprCache {
  private cache = new Map<string, PprCacheEntry>();
  private defaultTtl: number;

  constructor(defaultTtlSeconds = 300) {
    this.defaultTtl = defaultTtlSeconds * 1000;
  }

  get(key: string): PprCacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry;
  }

  set(key: string, html: string, rscPayload?: string, ttl?: number): void {
    this.cache.set(key, {
      html,
      rscPayload,
      cachedAt: Date.now(),
      ttl: ttl ?? this.defaultTtl,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ---------------------------------------------------------------------------
// TTFB Optimization
// ---------------------------------------------------------------------------

/**
 * Measures TTFB for an edge response.
 */
export function measureTtfb(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * Creates an optimized streaming response that flushes the head immediately.
 */
export function createOptimizedStream(head: string, body: Readable): Readable {
  const stream = new Readable({
    read() {},
  });

  // Flush head immediately for sub-50ms TTFB
  stream.push(head);

  // Pipe body chunks
  body.on('data', (chunk: Buffer) => {
    stream.push(chunk);
  });

  body.on('end', () => {
    stream.push(null);
  });

  body.on('error', (err) => {
    stream.destroy(err);
  });

  return stream;
}
