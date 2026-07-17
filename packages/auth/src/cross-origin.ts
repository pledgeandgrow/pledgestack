/**
 * Cross-origin isolation and CORP/COEP middleware.
 *
 * Provides:
 * - Cross-Origin-Opener-Policy (COOP) headers
 * - Cross-Origin-Embedder-Policy (COEP) headers
 * - Cross-Origin-Resource-Policy (CORP) headers
 * - Per-route configuration for SharedArrayBuffer support
 */

export interface CrossOriginConfig {
  /** COOP value (default: 'same-origin') */
  coop?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
  /** COEP value (default: 'require-corp') */
  coep?: 'require-corp' | 'credentialless' | 'unsafe-none';
  /** CORP value for static assets (default: 'same-site') */
  corp?: 'same-site' | 'same-origin' | 'cross-origin';
  /** Whether to enable cross-origin isolation (default: false) */
  enabled?: boolean;
  /** Per-route overrides */
  routes?: Record<string, Partial<CrossOriginConfig>>;
}

const DEFAULT_COOP = 'same-origin';
const DEFAULT_COEP = 'require-corp';
const DEFAULT_CORP = 'same-site';

/**
 * Generate cross-origin isolation headers (COOP + COEP).
 */
export function generateCrossOriginHeaders(config: CrossOriginConfig = {}): Record<string, string> {
  if (!config.enabled) return {};

  const headers: Record<string, string> = {};
  const coop = config.coop ?? DEFAULT_COOP;
  const coep = config.coep ?? DEFAULT_COEP;

  headers['Cross-Origin-Opener-Policy'] = coop;
  headers['Cross-Origin-Embedder-Policy'] = coep;

  return headers;
}

/**
 * Generate CORP header for static assets.
 */
export function generateCORPHeader(value?: string): string {
  return value ?? DEFAULT_CORP;
}

/**
 * Generate all cross-origin headers for a specific route.
 */
export function generateRouteCrossOriginHeaders(
  route: string,
  config: CrossOriginConfig = {},
): Record<string, string> {
  const routeConfig = config.routes?.[route] ?? {};
  const merged: CrossOriginConfig = {
    ...config,
    ...routeConfig,
    enabled: routeConfig.enabled ?? config.enabled,
  };
  return generateCrossOriginHeaders(merged);
}

/**
 * Middleware that applies cross-origin headers to responses.
 */
export function crossOriginMiddleware(config: CrossOriginConfig = {}) {
  return {
    applyHeaders(route: string): Record<string, string> {
      return generateRouteCrossOriginHeaders(route, config);
    },
    applyToResponse(route: string, headers: Record<string, string>): Record<string, string> {
      return { ...headers, ...generateRouteCrossOriginHeaders(route, config) };
    },
  };
}

/**
 * CORP middleware for static assets.
 * Automatically applies Cross-Origin-Resource-Policy to static asset responses.
 */
export function corpMiddleware(defaultValue: string = DEFAULT_CORP) {
  return {
    applyHeaders(): Record<string, string> {
      return { 'Cross-Origin-Resource-Policy': defaultValue };
    },
    applyToAsset(path: string, headers: Record<string, string> = {}): Record<string, string> {
      if (isStaticAsset(path)) {
        return { ...headers, 'Cross-Origin-Resource-Policy': defaultValue };
      }
      return headers;
    },
  };
}

/**
 * Check if a path is a static asset.
 */
function isStaticAsset(path: string): boolean {
  return /\.(js|css|png|jpg|jpeg|gif|svg|webp|avif|woff|woff2|ttf|eot|ico|wasm|map)$/i.test(path);
}

/**
 * Check if cross-origin isolation is enabled for a route.
 * When enabled, SharedArrayBuffer becomes available.
 */
export function isCrossOriginIsolated(route: string, config: CrossOriginConfig = {}): boolean {
  const routeConfig = config.routes?.[route];
  return (routeConfig?.enabled ?? config.enabled) ?? false;
}

/**
 * Generate headers to enable SharedArrayBuffer support.
 * This is a convenience function that enables full cross-origin isolation.
 */
export function enableSharedArrayBuffer(): Record<string, string> {
  return {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  };
}
