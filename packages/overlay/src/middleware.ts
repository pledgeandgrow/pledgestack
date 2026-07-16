import type { DevtoolsData as DevtoolsDataType, RouteInfo, CacheEntry } from './types';

export type { DevtoolsData, RouteInfo, CacheEntry } from './types';

export function createDevtoolsMiddleware() {
  const data: DevtoolsDataType = { routes: [], cacheEntries: [] };

  return {
    name: 'pledgestack-devtools',
    getData(): DevtoolsDataType {
      return data;
    },
    addRoute(route: RouteInfo): void {
      data.routes.push(route);
    },
    addCacheEntry(entry: CacheEntry): void {
      data.cacheEntries.push(entry);
    },
    transformHtml(html: string): string {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return html;
      if (!html.includes('</body>')) return html;
      return html.replace('</body>', '<script src="/__pledge/devtools" defer></script></body>');
    },
  };
}
