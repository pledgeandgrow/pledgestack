import { matchRoute, pathToPattern, compilePattern } from './match';
import type { RouteTree } from './types';
import type { ResolvedRoute, RouteMatch, PledgeConfig } from 'pledgestack-shared';
export { matchRoute, pathToPattern, compilePattern };
/**
 * Builds a route tree from a flat list of resolved routes.
 * This represents the nested layout structure.
 *
 * Handles:
 * - Route groups (group) — skipped from URL, layouts still apply
 * - Parallel routes @slot — attached as slots to parent node
 */
export declare function buildRouteTree(routes: ResolvedRoute[]): RouteTree;
/**
 * Flattens the route tree into a list of routes for matching.
 */
export declare function flattenRouteTree(tree: RouteTree): ResolvedRoute[];
/**
 * Gets the layout chain for a matched route.
 * Returns layouts from root to the matched route's parent.
 */
export declare function getLayoutChain(match: RouteMatch, tree: RouteTree): ResolvedRoute[];
/**
 * Creates a router instance that can match routes and resolve layouts.
 */
export declare function createRouter(routes: ResolvedRoute[], _config: PledgeConfig): {
    tree: RouteTree;
    routes: ResolvedRoute[];
    match(pathname: string): RouteMatch | null;
    getLayouts(match: RouteMatch): ResolvedRoute[];
};
export type Router = ReturnType<typeof createRouter>;
//# sourceMappingURL=router.d.ts.map