import type { ResolvedRoute, RouteMatch } from 'pledgestack-shared';
/**
 * Converts a filesystem path to a URL pattern.
 * e.g. "blog/[slug]/page.tsx" -> "/blog/:slug"
 *      "shop/(group)/product/page.tsx" -> "/shop/product"
 *      "docs/[...slug]/page.tsx" -> "/docs/*slug"
 *      "dashboard/@analytics/page.tsx" -> "/dashboard" (slot excluded from URL)
 *      "photos/(..)foo/page.tsx" -> intercepts one level up
 */
export declare function pathToPattern(filePath: string): string;
/**
 * Extracts intercept level from a segment.
 * (..) = 1, (...) = 2, (....) = 3
 */
export declare function getInterceptLevel(segment: string): number | null;
/**
 * Checks if a segment is a parallel route slot.
 */
export declare function isParallelSlot(segment: string): boolean;
/**
 * Compiles a URL pattern into a RegExp and param names.
 */
export declare function compilePattern(pattern: string): {
    regex: RegExp;
    paramNames: string[];
};
/**
 * Matches a pathname against a list of resolved routes.
 * Returns the best match (most specific) or null.
 */
export declare function matchRoute(pathname: string, routes: ResolvedRoute[]): RouteMatch | null;
//# sourceMappingURL=match.d.ts.map