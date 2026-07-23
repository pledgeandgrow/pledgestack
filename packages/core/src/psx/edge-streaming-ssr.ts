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
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const content = await Promise.race([
          hole.fetcher(),
          new Promise<string>((_, reject) => {
            timer = setTimeout(() => reject(new Error('Dynamic fetch timeout')), this.config.dynamicFetchTimeout);
          }),
        ]);
        if (timer) clearTimeout(timer);
        return { id: hole.id, content, placeholder: hole.placeholder };
      } catch {
        if (timer) clearTimeout(timer);
        return { id: hole.id, content: hole.fallback ?? `<!-- ${hole.placeholder} -->`, placeholder: hole.placeholder };
      }
    });

    // TTFB is when first byte would be sent (the static shell)
    ttfbMs = Date.now() - startTime;

    const results = await Promise.all(fetchPromises);

    // Fill holes in the static shell (replace all occurrences)
    let html = staticShell;
    for (const result of results) {
      html = html.replaceAll(result.placeholder, result.content);
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
    const stream = new Readable({
      read() {},
    });

    // Split static shell at placeholders for interleaving with dynamic content
    const segments: Array<{ type: 'static' | 'hole'; content: string; hole?: PsxDynamicHole }> = [];
    let remaining = staticShell;

    for (const hole of holes) {
      const idx = remaining.indexOf(hole.placeholder);
      if (idx >= 0) {
        segments.push({ type: 'static', content: remaining.slice(0, idx) });
        segments.push({ type: 'hole', content: hole.placeholder, hole });
        remaining = remaining.slice(idx + hole.placeholder.length);
      }
    }
    segments.push({ type: 'static', content: remaining });

    // Push everything before the first hole immediately for fast TTFB
    let firstHoleIdx = segments.findIndex(s => s.type === 'hole');
    if (firstHoleIdx === -1) {
      // No holes — push entire shell and end
      stream.push(staticShell);
      stream.push(null);
      return stream;
    }

    // Push all static segments before the first hole
    for (let i = 0; i < firstHoleIdx; i++) {
      stream.push(segments[i].content);
    }

    // Fetch dynamic data and interleave with remaining static segments
    const holeSegments = segments.filter(s => s.type === 'hole') as Array<{ type: 'hole'; content: string; hole: PsxDynamicHole }>;
    const staticAfterFirstHole = segments.slice(firstHoleIdx + 1);

    Promise.all(
      holeSegments.map(async (seg) => {
        try {
          const content = await seg.hole.fetcher();
          return { type: 'dynamic' as const, content, placeholder: seg.hole.placeholder };
        } catch {
          return { type: 'dynamic' as const, content: seg.hole.fallback ?? '', placeholder: seg.hole.placeholder };
        }
      }),
    ).then((results) => {
      // Interleave dynamic results with static segments
      let resultIdx = 0;
      for (const seg of staticAfterFirstHole) {
        if (seg.type === 'hole') {
          if (resultIdx < results.length) {
            stream.push(results[resultIdx].content);
            resultIdx++;
          }
        } else {
          stream.push(seg.content);
        }
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
    let pending = false;

    return new Transform({
      transform(chunk, _encoding, callback) {
        buffer += chunk.toString();

        if (pending) {
          // Already fetching — buffer and wait
          callback(null, '');
          return;
        }

        // Check for complete placeholders in buffer
        for (const [placeholder, hole] of holeMap) {
          if (buffer.includes(placeholder)) {
            pending = true;
            const beforePlaceholder = buffer.slice(0, buffer.indexOf(placeholder));
            const afterPlaceholder = buffer.slice(buffer.indexOf(placeholder) + placeholder.length);

            // Push content before placeholder immediately
            if (beforePlaceholder) {
              this.push(beforePlaceholder);
            }

            hole.fetcher().then((content) => {
              this.push(content);
              buffer = afterPlaceholder;
              pending = false;
              callback(null, '');
            }).catch(() => {
              this.push(hole.fallback ?? '');
              buffer = afterPlaceholder;
              pending = false;
              callback(null, '');
            });
            return;
          }
        }

        // No placeholder found — pass through buffered content
        callback(null, buffer);
        buffer = '';
      },
      flush(callback) {
        if (buffer) {
          callback(null, buffer);
        } else {
          callback();
        }
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
