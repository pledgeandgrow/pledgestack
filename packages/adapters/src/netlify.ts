import { createEdgeHandler } from '@pledgestack/server';
import type { PledgeConfig } from '@pledgestack/shared';
import { createEdgeConfig, type EdgeBundleConfig } from './index';

export { createEdgeConfig, type EdgeBundleConfig };

/**
 * Netlify adapter for PledgeStack.
 *
 * PledgePack generates a bundle for Netlify Functions. This adapter provides
 * the Netlify Function handler that converts Netlify events to Request/Response.
 *
 * Usage — PledgePack generates this as the Netlify entry:
 * ```typescript
 * import { createNetlifyHandler } from '@pledgestack/adapters/netlify';
 *
 * export default createNetlifyHandler({ config });
 * ```
 *
 * netlify.toml:
 * ```toml
 * [build]
 * command = "pledgestack build"
 * publish = ".pledge/static"
 *
 * [[redirects]]
 * from = "/*"
 * to = "/.netlify/functions/pledge"
 * status = 200
 * ```
 */

export interface NetlifyEvent {
  httpMethod: string;
  path: string;
  queryStringParameters?: Record<string, string>;
  headers: Record<string, string>;
  body?: string | null;
  isBase64Encoded?: boolean;
}

export interface NetlifyResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

export function createNetlifyHandler(options: { config: PledgeConfig }) {
  const handler = createEdgeHandler({ config: options.config });

  return async function netlifyHandler(event: NetlifyEvent): Promise<NetlifyResult> {
    const url = new URL(event.path, 'https://netlify.app');

    if (event.queryStringParameters) {
      for (const [key, value] of Object.entries(event.queryStringParameters)) {
        url.searchParams.set(key, value);
      }
    }

    const request = new Request(url.toString(), {
      method: event.httpMethod,
      headers: event.headers,
      body: event.body ?? undefined,
    });

    const response = await handler(request);
    const body = await response.text();

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      statusCode: response.status,
      headers,
      body,
    };
  };
}

/**
 * Generate netlify.toml configuration for PledgeStack.
 */
export function generateNetlifyConfig(options?: {
  buildCommand?: string;
  publishDir?: string;
  functionsDir?: string;
}): string {
  const buildCommand = options?.buildCommand ?? 'pledgestack build';
  const publishDir = options?.publishDir ?? '.pledge/static';
  const functionsDir = options?.functionsDir ?? '.pledge/functions';

  return `[build]
  command = "${buildCommand}"
  publish = "${publishDir}"
  functions = "${functionsDir}"

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/pledge"
  status = 200

[build.environment]
  NODE_VERSION = "20"`;
}

export function getNetlifyEdgeConfig(): EdgeBundleConfig {
  return createEdgeConfig('netlify');
}
