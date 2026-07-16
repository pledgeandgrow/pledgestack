import type { ResolvedRoute, RouteMatch } from 'pledgestack-shared';
import {
  DYNAMIC_SEGMENT_PATTERN,
  CATCH_ALL_PATTERN,
  OPTIONAL_CATCH_ALL_PATTERN,
  ROUTE_GROUP_PATTERN,
  PARALLEL_ROUTE_PATTERN,
  INTERCEPT_ROUTE_PATTERN,
  INTERCEPT_ROUTE_SEGMENT_PATTERN,
} from 'pledgestack-shared';

/**
 * Converts a filesystem path to a URL pattern.
 * e.g. "blog/[slug]/page.tsx" -> "/blog/:slug"
 *      "shop/(group)/product/page.tsx" -> "/shop/product"
 *      "docs/[...slug]/page.tsx" -> "/docs/*slug"
 *      "dashboard/@analytics/page.tsx" -> "/dashboard" (slot excluded from URL)
 *      "photos/(..)foo/page.tsx" -> intercepts one level up
 */
export function pathToPattern(filePath: string): string {
  const segments = filePath.split('/').filter(Boolean);
  const patternSegments: string[] = [];

  for (const segment of segments) {
    // Skip route groups (group) — no URL impact
    if (ROUTE_GROUP_PATTERN.test(segment)) continue;

    // Skip parallel route slots @slot — no URL impact, rendered in layout
    if (PARALLEL_ROUTE_PATTERN.test(segment)) continue;

    // Handle intercepting routes (..)folder, (...)folder, (....)folder
    const interceptMatch = segment.match(INTERCEPT_ROUTE_SEGMENT_PATTERN);
    if (interceptMatch) {
      // Intercepting routes don't add to the URL pattern directly;
      // they intercept another route. The target segment is the captured group.
      patternSegments.push(interceptMatch[1]);
      continue;
    }

    // Handle standalone intercepting route markers (..), (...), (....)
    if (INTERCEPT_ROUTE_PATTERN.test(segment)) continue;

    // Catch-all [...slug]
    const catchAll = segment.match(CATCH_ALL_PATTERN);
    if (catchAll) {
      patternSegments.push(`*${catchAll[1]}`);
      continue;
    }

    // Optional catch-all [[...slug]]
    const optionalCatchAll = segment.match(OPTIONAL_CATCH_ALL_PATTERN);
    if (optionalCatchAll) {
      patternSegments.push(`*${optionalCatchAll[1]}`);
      continue;
    }

    // Dynamic [slug]
    const dynamic = segment.match(DYNAMIC_SEGMENT_PATTERN);
    if (dynamic) {
      patternSegments.push(`:${dynamic[1]}`);
      continue;
    }

    // Static segment
    patternSegments.push(segment);
  }

  return '/' + patternSegments.join('/');
}

/**
 * Extracts intercept level from a segment.
 * (..) = 1, (...) = 2, (....) = 3
 */
export function getInterceptLevel(segment: string): number | null {
  const match = segment.match(INTERCEPT_ROUTE_PATTERN);
  if (!match) return null;
  const dots = segment.match(/\./g);
  return dots ? dots.length - 1 : null;
}

/**
 * Checks if a segment is a parallel route slot.
 */
export function isParallelSlot(segment: string): boolean {
  return PARALLEL_ROUTE_PATTERN.test(segment);
}

/**
 * Compiles a URL pattern into a RegExp and param names.
 */
export function compilePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const regexStr = pattern
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      // Catch-all *slug
      if (segment.startsWith('*')) {
        const name = segment.slice(1);
        paramNames.push(name);
        return '(?:/(.*))?';
      }
      // Dynamic :slug
      if (segment.startsWith(':')) {
        const name = segment.slice(1);
        paramNames.push(name);
        return '([^/]+)';
      }
      // Static
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');

  return {
    regex: new RegExp(`^/${regexStr}/?$`),
    paramNames,
  };
}

/**
 * Matches a pathname against a list of resolved routes.
 * Returns the best match (most specific) or null.
 */
export function matchRoute(pathname: string, routes: ResolvedRoute[]): RouteMatch | null {
  let bestMatch: RouteMatch | null = null;
  let bestScore = -1;

  for (const route of routes) {
    const { regex, paramNames } = compilePattern(route.pattern);
    const match = regex.exec(pathname);
    if (!match) continue;

    const params: Record<string, string> = {};
    paramNames.forEach((name, i) => {
      params[name] = decodeURIComponent(match[i + 1] ?? '');
    });

    // Score: more static segments = higher specificity
    const score = route.pattern.split('/').filter((s) => !s.startsWith(':') && !s.startsWith('*')).length;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { pathname, params, route };
    }
  }

  return bestMatch;
}
