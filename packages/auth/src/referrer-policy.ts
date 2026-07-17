/**
 * Referrer policy control.
 *
 * Provides:
 * - Configurable Referrer-Policy per route
 * - Default strict-origin-when-cross-origin
 * - Per-route override support
 */

export type ReferrerPolicyValue =
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'same-origin'
  | 'origin'
  | 'strict-origin'
  | 'origin-when-cross-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

export interface ReferrerPolicyConfig {
  /** Default policy (default: 'strict-origin-when-cross-origin') */
  default?: ReferrerPolicyValue;
  /** Per-route overrides */
  routes?: Record<string, ReferrerPolicyValue>;
}

const DEFAULT_POLICY: ReferrerPolicyValue = 'strict-origin-when-cross-origin';

/**
 * Generate Referrer-Policy header for a route.
 */
export function generateReferrerPolicy(
  route: string,
  config: ReferrerPolicyConfig = {},
): string {
  const routePolicy = config.routes?.[route];
  return routePolicy ?? config.default ?? DEFAULT_POLICY;
}

/**
 * Generate Referrer-Policy headers object for a route.
 */
export function generateReferrerPolicyHeaders(
  route: string,
  config: ReferrerPolicyConfig = {},
): Record<string, string> {
  return { 'Referrer-Policy': generateReferrerPolicy(route, config) };
}

/**
 * Middleware that applies Referrer-Policy headers.
 */
export function referrerPolicyMiddleware(config: ReferrerPolicyConfig = {}) {
  return {
    applyHeaders(route: string): Record<string, string> {
      return generateReferrerPolicyHeaders(route, config);
    },
    applyToResponse(route: string, headers: Record<string, string> = {}): Record<string, string> {
      return { ...headers, ...generateReferrerPolicyHeaders(route, config) };
    },
  };
}

/**
 * Get the default referrer policy.
 */
export function getDefaultReferrerPolicy(): ReferrerPolicyValue {
  return DEFAULT_POLICY;
}
