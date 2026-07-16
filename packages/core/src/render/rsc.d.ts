import { type ReactNode } from 'react';
import type { RouteMatch, PledgeConfig } from 'pledgestack-shared';
import type { PageModule, LayoutModule } from '../router/types';
import type { RouteTree } from '../router/types';
export interface RSCPayload {
    /** The serialized RSC tree as a string */
    tree: string;
    /** Module map for client-side resolution: moduleId -> chunkPath */
    moduleMap: Record<string, string>;
    /** Client component references that need to be loaded on the client */
    clientReferences: ClientReference[];
}
export interface ClientReference {
    /** Module ID in the client bundle */
    moduleId: string;
    /** Export name (e.g. 'default') */
    exportName: string;
    /** Chunk path for lazy loading */
    chunkPath: string;
}
export interface RSCContext {
    config: PledgeConfig;
    match: RouteMatch;
    tree: RouteTree;
    modules: Map<string, PageModule | LayoutModule>;
    /** Client reference manifest mapping server modules to client chunks */
    clientManifest?: Record<string, string>;
}
/**
 * Renders a route match to an RSC payload using react-server-dom-webpack.
 * The payload is a stream that can be sent to the client for hydration.
 *
 * In production, this uses the React Server Components protocol to serialize
 * the React tree into a format that can be progressively streamed to the client.
 * Client components are identified via the client manifest and lazy-loaded.
 */
export declare function renderRSC(ctx: RSCContext): Promise<RSCPayload>;
/**
 * Renders an RSC payload to a full HTML document with streaming.
 * Used for the initial server render with RSC support.
 */
export declare function renderRSCToHTML(ctx: RSCContext): Promise<string>;
/**
 * Deserializes an RSC payload on the client side.
 * Reconstructs the React tree from the serialized stream data.
 */
export declare function hydrateRSC(payload: RSCPayload): Promise<ReactNode>;
//# sourceMappingURL=rsc.d.ts.map