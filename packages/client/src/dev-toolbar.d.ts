/**
 * Dev Toolbar — Development-only toolbar for PledgeStack.
 *
 * Features:
 * - Route inspector: shows matched route, params, render mode
 * - Pledge inspector: lists all pledged components and their strategies
 * - Cache viewer: shows fetch cache entries and revalidation tags
 * - Build info: framework version, dev server status
 *
 * Only active in development mode. Injected by the dev server.
 */
interface DevToolbarData {
    route: {
        pattern: string;
        mode: string;
        params: Record<string, string>;
    };
    pledges: Array<{
        id: string;
        name: string;
        strategy: string;
        hydrated: boolean;
    }>;
    cache: Array<{
        key: string;
        tags: string[];
        revalidate: number | null;
        createdAt: number;
    }>;
    version: string;
}
export declare function initDevToolbar(data: DevToolbarData): void;
export {};
//# sourceMappingURL=dev-toolbar.d.ts.map