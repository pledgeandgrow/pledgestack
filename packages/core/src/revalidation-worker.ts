/**
 * Background revalidation worker — separate process for ISR revalidation.
 *
 * Runs as a standalone process that periodically revalidates cached data
 * for routes with ISR (Incremental Static Regeneration) enabled.
 *
 * This offloads revalidation work from the main server process, ensuring
 * that background refreshes don't compete with request handling for resources.
 *
 * Usage:
 *   // As a separate process:
 *   npx pledge revalidate-worker --config .pledge/isr-config.json
 *
 *   // Or programmatically:
 *   const worker = createRevalidationWorker({
 *     routes: [
 *       { pattern: '/blog/[slug]', revalidate: 60, tags: ['posts'] },
 *       { pattern: '/products/[id]', revalidate: 300, tags: ['products'] },
 *     ],
 *   });
 *   worker.start();
 */

import { revalidateTag, revalidatePath, registerISR, unregisterISR, unregisterAllISR } from './fetch-cache';
import { revalidatePersistentTag, revalidatePersistentPath, pruneExpiredEntries } from './persistent-cache';

export interface ISRRouteConfig {
  /** Route pattern (e.g., '/blog/[slug]') */
  pattern: string;
  /** Revalidation interval in seconds */
  revalidate: number;
  /** Tags to revalidate */
  tags?: string[];
  /** Paths to revalidate */
  paths?: string[];
  /** Optional handler for custom revalidation logic */
  handler?: () => Promise<void>;
}

export interface RevalidationWorkerConfig {
  /** ISR route configurations */
  routes: ISRRouteConfig[];
  /** Interval for pruning expired entries (seconds, default: 3600) */
  pruneInterval?: number;
  /** Max age for cache entries before pruning (seconds, default: 86400) */
  maxEntryAge?: number;
  /** Whether to also revalidate persistent cache (default: true) */
  persistent?: boolean;
}

export interface RevalidationWorker {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  addRoute(route: ISRRouteConfig): void;
  removeRoute(pattern: string): void;
  getStats(): { routes: number; lastRun: number | null; errors: number };
}

/**
 * Creates a background revalidation worker.
 *
 * The worker uses setInterval-based timers (via registerISR) to periodically
 * revalidate cached data. It also prunes expired entries from the persistent cache.
 */
export function createRevalidationWorker(config: RevalidationWorkerConfig): RevalidationWorker {
  const routes = new Map<string, ISRRouteConfig>();
  let pruneTimer: ReturnType<typeof setInterval> | null = null;
  const revalidationTimers: ReturnType<typeof setInterval>[] = [];
  let running = false;
  let lastRun: number | null = null;
  let errorCount = 0;

  // Initialize routes
  for (const route of config.routes) {
    routes.set(route.pattern, route);
  }

  function revalidateRoute(route: ISRRouteConfig) {
    lastRun = Date.now();
    try {
      // Revalidate in-memory cache
      if (route.tags) {
        for (const tag of route.tags) {
          revalidateTag(tag);
          if (config.persistent !== false) {
            revalidatePersistentTag(tag);
          }
        }
      }
      if (route.paths) {
        for (const path of route.paths) {
          revalidatePath(path);
          if (config.persistent !== false) {
            revalidatePersistentPath(path);
          }
        }
      }
    } catch (err) {
      errorCount++;
      console.error(`[pledgestack] Revalidation worker error for ${route.pattern}:`, err);
    }
  }

  return {
    start(): void {
      if (running) return;
      running = true;

      // Register ISR timers for each route
      for (const route of routes.values()) {
        registerISR(route.pattern, {
          revalidate: route.revalidate,
          tags: route.tags,
          handler: route.handler ?? (() => Promise.resolve()),
        });

        // Also set up a timer for persistent cache revalidation
        if (config.persistent !== false) {
          const timer = setInterval(() => revalidateRoute(route), route.revalidate * 1000);
          revalidationTimers.push(timer);
        }
      }

      // Set up pruning timer
      const pruneInterval = config.pruneInterval ?? 3600;
      const maxAge = config.maxEntryAge ?? 86400;
      if (pruneInterval > 0) {
        pruneTimer = setInterval(() => {
          try {
            const pruned = pruneExpiredEntries(maxAge);
            if (pruned > 0) {
              console.log(`[pledgestack] Pruned ${pruned} expired cache entries`);
            }
          } catch (err) {
            errorCount++;
            console.error('[pledgestack] Cache pruning error:', err);
          }
        }, pruneInterval * 1000);
      }
    },

    stop(): void {
      if (!running) return;
      running = false;
      unregisterAllISR();
      if (pruneTimer) {
        clearInterval(pruneTimer);
        pruneTimer = null;
      }
      for (const timer of revalidationTimers) {
        clearInterval(timer);
      }
      revalidationTimers.length = 0;
    },

    isRunning(): boolean {
      return running;
    },

    addRoute(route: ISRRouteConfig): void {
      routes.set(route.pattern, route);
      if (running) {
        registerISR(route.pattern, {
          revalidate: route.revalidate,
          tags: route.tags,
          handler: route.handler ?? (() => Promise.resolve()),
        });
      }
    },

    removeRoute(pattern: string): void {
      routes.delete(pattern);
      if (running) {
        unregisterISR(pattern);
      }
    },

    getStats(): { routes: number; lastRun: number | null; errors: number } {
      return {
        routes: routes.size,
        lastRun,
        errors: errorCount,
      };
    },
  };
}

/**
 * Loads ISR route configuration from a JSON file.
 * Used by the CLI command `pledge revalidate-worker`.
 */
export async function loadISRConfig(configPath: string): Promise<RevalidationWorkerConfig> {
  const { readFile } = await import('node:fs/promises');
  const content = await readFile(configPath, 'utf-8');
  return JSON.parse(content) as RevalidationWorkerConfig;
}

/**
 * Runs the revalidation worker as a standalone process.
 * Handles graceful shutdown on SIGINT/SIGTERM.
 */
export async function runRevalidationWorker(configPath: string): Promise<void> {
  const config = await loadISRConfig(configPath);
  const worker = createRevalidationWorker(config);

  worker.start();
  console.log(`[pledgestack] Revalidation worker started with ${config.routes.length} routes`);

  // Graceful shutdown
  const shutdown = () => {
    console.log('[pledgestack] Shutting down revalidation worker...');
    worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
