import type { PledgeConfig } from '@pledgestack/shared';
export interface EdgeServerOptions {
    config: PledgeConfig;
}
/**
 * Creates an edge-compatible request handler for PledgeStack.
 * Works with Cloudflare Workers, Vercel Edge, Deno Deploy, etc.
 */
export declare function createEdgeHandler(options: EdgeServerOptions): (request: Request) => Promise<Response>;
//# sourceMappingURL=edge.d.ts.map