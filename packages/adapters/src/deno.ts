import { createEdgeHandler } from 'pledgestack-server';
import type { PledgeConfig } from 'pledgestack-shared';
import { createEdgeConfig, type EdgeBundleConfig } from './index';

export { createEdgeConfig, type EdgeBundleConfig };

/**
 * Deno Deploy adapter for PledgeStack.
 *
 * PledgePack generates an edge-safe ESM bundle. This adapter provides
 * the Deno Deploy entry point.
 *
 * Usage — PledgePack generates this as the Deno entry:
 * ```typescript
 * import { createDenoHandler } from 'pledgestack-adapters/deno';
 *
 * Deno.serve(createDenoHandler({ config }));
 * ```
 */

export function createDenoHandler(options: { config: PledgeConfig }) {
  const handler = createEdgeHandler({ config: options.config });

  return async function serve(request: Request): Promise<Response> {
    return handler(request);
  };
}

/**
 * Generate deno.json configuration for PledgeStack.
 */
export function generateDenoConfig(options?: {
  importMap?: boolean;
  compilerOptions?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    tasks: {
      dev: 'pledgestack dev',
      build: 'pledgestack build --edge deno',
      start: 'deno run --allow-net --allow-read --allow-env .pledge/edge/deno.js',
    },
    compilerOptions: {
      jsx: 'react-jsx',
      jsxImportSource: 'react',
      ...options?.compilerOptions,
    },
  };
}

export function getDenoEdgeConfig(): EdgeBundleConfig {
  return createEdgeConfig('deno');
}
