export interface RouteInfo {
  path: string;
  mode: string;
  runtime: string;
  filePath: string;
  loadTime?: number;
  renderTime?: number;
}

export interface CacheEntry {
  key: string;
  tags: string[];
  expiresAt: number;
  size: number;
}

export interface DevtoolsData {
  routes: RouteInfo[];
  cacheEntries: CacheEntry[];
}
