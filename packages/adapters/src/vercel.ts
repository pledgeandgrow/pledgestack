import { createEdgeHandler } from 'pledgestack-server';
import type { PledgeConfig } from 'pledgestack-shared';
import { createEdgeConfig, type EdgeBundleConfig } from './index';

export { createEdgeConfig, type EdgeBundleConfig };

/**
 * Vercel Edge adapter for PledgeStack.
 *
 * PledgePack generates an edge-safe bundle. This adapter provides the
 * Vercel Edge Function entry point.
 *
 * Usage — PledgePack generates this as the edge entry:
 * ```typescript
 * import { createVercelEdgeHandler } from 'pledgestack-adapters/vercel';
 *
 * export default createVercelEdgeHandler({ config });
 * ```
 *
 * vercel.json:
 * ```json
 * {
 *   "functions": { "app/**": { "runtime": "@vercel/edge" } }
 * }
 * ```
 */

export function createVercelEdgeHandler(options: { config: PledgeConfig }) {
  const edgeHandler = createEdgeHandler({ config: options.config });

  return async function handler(request: Request): Promise<Response> {
    return edgeHandler(request);
  };
}

/**
 * Generate vercel.json configuration for PledgeStack.
 */
export function generateVercelConfig(options?: {
  edge?: boolean;
  regions?: string[];
  cleanUrls?: boolean;
  trailingSlash?: boolean;
}): Record<string, unknown> {
  return {
    version: 2,
    builds: [
      {
        src: '.pledge/server.js',
        use: '@vercel/node',
        config: {
          includeFiles: '.pledge/**',
        },
      },
    ],
    routes: [
      { src: '/_pledge/(.*)', dest: '.pledge/server.js' },
      { src: '/(.*)', dest: '.pledge/server.js' },
    ],
    regions: options?.regions,
    cleanUrls: options?.cleanUrls ?? true,
    trailingSlash: options?.trailingSlash ?? false,
  };
}

export function getVercelEdgeConfig(): EdgeBundleConfig {
  return createEdgeConfig('vercel');
}
