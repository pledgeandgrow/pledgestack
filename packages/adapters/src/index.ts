import type { PledgeConfig } from 'pledgestack-shared';

/**
 * Edge adapter types and shared utilities.
 *
 * PledgePack generates edge-safe bundles (no Node.js builtins).
 * These adapters provide platform-specific entry points that wrap
 * PledgeStack's edge handler for each deployment target.
 */

export type EdgeTarget = 'cloudflare' | 'vercel' | 'deno' | 'lambda' | 'netlify';

export interface EdgeAdapterConfig {
  /** Target platform */
  target: EdgeTarget;
  /** PledgeStack config */
  pledgeConfig: PledgeConfig;
  /** Whether to enable edge middleware (default: true) */
  middleware?: boolean;
  /** Whether to enable static asset serving (default: true) */
  staticAssets?: boolean;
  /** Region hint for latency-based routing (optional) */
  region?: string;
}

/**
 * Edge-compatible bundle configuration.
 * Tells PledgePack to emit an edge-safe bundle without Node.js builtins.
 *
 * In pledge.config.ts:
 * ```typescript
 * export default defineConfig({
 *   edgeTarget: 'cloudflare',
 *   edge: {
 *     excludeNodeBuiltins: true,
 *     polyfills: ['buffer', 'process', 'stream'],
 *   },
 * });
 * ```
 */
export interface EdgeBundleConfig {
  /** Target platform */
  target: EdgeTarget;
  /** Exclude Node.js built-in modules (default: true) */
  excludeNodeBuiltins?: boolean;
  /** Polyfills to include for Node.js APIs */
  polyfills?: string[];
  /** Whether to minify the edge bundle (default: true) */
  minify?: boolean;
  /** Whether to include source maps (default: false in production) */
  sourceMaps?: boolean;
}

/**
 * Generate the edge bundle config for PledgePack.
 */
export function createEdgeConfig(target: EdgeTarget, options?: Partial<EdgeBundleConfig>): EdgeBundleConfig {
  return {
    target,
    excludeNodeBuiltins: options?.excludeNodeBuiltins ?? true,
    polyfills: options?.polyfills ?? ['buffer', 'process', 'stream', 'crypto'],
    minify: options?.minify ?? true,
    sourceMaps: options?.sourceMaps ?? false,
  };
}

/**
 * List of Node.js built-in modules to exclude from edge bundles.
 */
export const NODE_BUILTIN_MODULES = [
  'node:fs',
  'node:path',
  'node:os',
  'node:child_process',
  'node:cluster',
  'node:dgram',
  'node:dns',
  'node:net',
  'node:readline',
  'node:repl',
  'node:tls',
  'node:vm',
  'node:worker_threads',
  'node:zlib',
  'fs',
  'path',
  'os',
  'child_process',
  'cluster',
  'dgram',
  'dns',
  'net',
  'readline',
  'repl',
  'tls',
  'vm',
  'worker_threads',
  'zlib',
];
