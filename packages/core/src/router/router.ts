import { matchRoute, pathToPattern, compilePattern } from './match';
import type { RouteTree, RouteTreeNode } from './types';
import type { ResolvedRoute, RouteMatch, PledgeConfig } from 'pledgestack-shared';
import { ROUTE_GROUP_PATTERN } from 'pledgestack-shared';

export { matchRoute, pathToPattern, compilePattern };

/**
 * Builds a route tree from a flat list of resolved routes.
 * This represents the nested layout structure.
 *
 * Handles:
 * - Route groups (group) — skipped from URL, layouts still apply
 * - Parallel routes @slot — attached as slots to parent node
 */
export function buildRouteTree(routes: ResolvedRoute[]): RouteTree {
  const root: RouteTreeNode = {
    pattern: '/',
    segment: '',
    children: [],
    route: undefined,
    layouts: [],
  };

  for (const route of routes) {
    const segments = route.pattern.split('/').filter(Boolean);
    let current = root;

    for (const segment of segments) {
      // Skip route groups in tree navigation — they don't affect URL
      if (ROUTE_GROUP_PATTERN.test(segment)) continue;

      let child = current.children.find((c: RouteTreeNode) => c.segment === segment);
      if (!child) {
        child = {
          pattern: current.pattern === '/' ? `/${segment}` : `${current.pattern}/${segment}`,
          segment,
          children: [],
          route: undefined,
          layouts: [],
        };
        current.children.push(child);
      }
      current = child;
    }

    // Assign route to the leaf node
    if (route.isLayout) {
      current.layouts.push(route);
      // Attach slots from the layout's resolved route
      if (route.slots) {
        if (!current.slots) current.slots = {};
        for (const [slotName, slotPath] of Object.entries(route.slots)) {
          current.slots[slotName] = {
            pattern: current.pattern,
            segment: `@${slotName}`,
            children: [],
            route: {
              filePath: slotPath,
              pattern: current.pattern,
              mode: 'ssr',
              runtime: route.runtime,
              isLayout: false,
              isErrorBoundary: false,
              isLoading: false,
              isNotFound: false,
            },
            layouts: [],
          };
        }
      }
    } else {
      current.route = route;
    }
  }

  return { root };
}

/**
 * Flattens the route tree into a list of routes for matching.
 */
export function flattenRouteTree(tree: RouteTree): ResolvedRoute[] {
  const routes: ResolvedRoute[] = [];
  function walk(node: RouteTreeNode) {
    if (node.route) routes.push(node.route);
    for (const layout of node.layouts) routes.push(layout);
    for (const child of node.children) walk(child);
  }
  walk(tree.root);
  return routes;
}

/**
 * Gets the layout chain for a matched route.
 * Returns layouts from root to the matched route's parent.
 */
export function getLayoutChain(match: RouteMatch, tree: RouteTree): ResolvedRoute[] {
  const segments = match.route.pattern.split('/').filter(Boolean);
  const layouts: ResolvedRoute[] = [];
  let current = tree.root;

  // Collect layouts from root down
  layouts.push(...current.layouts);

  for (const segment of segments) {
    const child = current.children.find((c: RouteTreeNode) => c.segment === segment);
    if (!child) break;
    layouts.push(...child.layouts);
    current = child;
  }

  return layouts;
}

/**
 * Creates a router instance that can match routes and resolve layouts.
 */
export function createRouter(routes: ResolvedRoute[], _config: PledgeConfig) {
  const tree = buildRouteTree(routes);
  const flatRoutes = flattenRouteTree(tree);

  return {
    tree,
    routes: flatRoutes,
    match(pathname: string): RouteMatch | null {
      return matchRoute(pathname, flatRoutes);
    },
    getLayouts(match: RouteMatch): ResolvedRoute[] {
      return getLayoutChain(match, tree);
    },
  };
}

export type Router = ReturnType<typeof createRouter>;
