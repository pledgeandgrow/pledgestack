import { type IncomingMessage, type ServerResponse } from 'node:http';
import type { PledgeConfig } from 'pledgestack-shared';
export interface NodeServerOptions {
    config: PledgeConfig;
    port?: number;
    hostname?: string;
    isDev?: boolean;
    /** PledgePack dev server port for proxying module/asset/HMR requests */
    pledgepackPort?: number;
}
/**
 * Creates and starts a Node.js HTTP server for PledgeStack.
 *
 * In dev mode with pledgepackPort set:
 *   - Module/asset/HMR requests are proxied to PledgePack's Rust dev server
 *   - SSR, API routes, and middleware are handled by Node.js
 *   - HMR is handled by PledgePack's Rust server (WebSocket proxy)
 *
 * In production mode:
 *   - All requests handled by Node.js from pre-bundled output
 */
export declare function startNodeServer(options: NodeServerOptions): import("http").Server<typeof IncomingMessage, typeof ServerResponse>;
//# sourceMappingURL=node.d.ts.map