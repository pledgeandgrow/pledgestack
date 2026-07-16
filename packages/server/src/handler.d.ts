import type { PledgeConfig, PledgeResponse } from 'pledgestack-shared';
export interface RequestHandlerOptions {
    config: PledgeConfig;
    isDev?: boolean;
}
/**
 * Creates a request handler that routes requests to the appropriate
 * page, API route, or static asset. Integrates module loading,
 * middleware execution, and RSC rendering.
 */
export declare function createRequestHandler(options: RequestHandlerOptions): {
    handler: (req: {
        url: URL;
        method: string;
        headers: Record<string, string>;
        body?: string | Buffer | null;
    }) => Promise<PledgeResponse>;
    invalidate: () => void;
};
//# sourceMappingURL=handler.d.ts.map