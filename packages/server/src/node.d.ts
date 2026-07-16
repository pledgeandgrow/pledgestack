import { type IncomingMessage, type ServerResponse } from 'node:http';
import type { PledgeConfig } from 'pledgestack-shared';
export interface NodeServerOptions {
    config: PledgeConfig;
    port?: number;
    hostname?: string;
    isDev?: boolean;
}
/**
 * Creates and starts a Node.js HTTP server for PledgeStack.
 * In dev mode, enables HMR via file watching.
 */
export declare function startNodeServer(options: NodeServerOptions): import("http").Server<typeof IncomingMessage, typeof ServerResponse>;
//# sourceMappingURL=node.d.ts.map