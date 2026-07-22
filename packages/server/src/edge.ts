import type { PledgeConfig } from 'pledgestack-shared';
import { createRequestHandler } from './handler';
import { loadInstrumentation } from './instrumentation';

export interface EdgeServerOptions {
  config: PledgeConfig;
}

/**
 * Creates an edge-compatible request handler for PledgeStack.
 * Works with Cloudflare Workers, Vercel Edge, Deno Deploy, etc.
 */
export function createEdgeHandler(options: EdgeServerOptions) {
  const { handler } = createRequestHandler({ config: options.config, isDev: false });

  loadInstrumentation(options.config, null, false).catch((err) => {
    console.error('[pledgestack] Instrumentation failed:', err);
  });

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const method = request.method;
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const result = await handler({ url, method, headers });

    return new Response(result.body, {
      status: result.status,
      headers: result.headers,
    });
  };
}
