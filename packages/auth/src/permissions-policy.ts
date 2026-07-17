/**
 * Permission policy framework.
 *
 * Provides:
 * - Permissions-Policy header management
 * - Disable unused browser APIs by default (camera, microphone, geolocation)
 * - Per-route override support
 */

export type PermissionPolicyDirective =
  | 'self'
  | 'src'
  | 'none'
  | '*'
  | string;

export interface PermissionPolicyConfig {
  /** Default permissions (all disabled unless explicitly allowed) */
  defaults?: Record<string, PermissionPolicyDirective | string[]>;
  /** Per-route overrides */
  routes?: Record<string, Record<string, PermissionPolicyDirective | string[]>>;
  /** Whether to allow all permissions for specific routes */
  allowAllRoutes?: string[];
}

const RESTRICTED_FEATURES = [
  'camera',
  'microphone',
  'geolocation',
  'payment',
  'usb',
  'magnetometer',
  'gyroscope',
  'accelerometer',
  'ambient-light-sensor',
  'autoplay',
  'encrypted-media',
  'fullscreen',
  'picture-in-picture',
  'publickey-credentials-get',
  'screen-wake-lock',
  'web-share',
  'clipboard-read',
  'clipboard-write',
  'display-capture',
  'idle-detection',
  'serial',
  'bluetooth',
  'hid',
  'nfc',
];

const DEFAULT_DISABLED: Record<string, PermissionPolicyDirective> = {
  camera: 'none',
  microphone: 'none',
  geolocation: 'none',
  payment: 'self',
  usb: 'none',
  magnetometer: 'none',
  gyroscope: 'none',
  accelerometer: 'none',
  'ambient-light-sensor': 'none',
  'idle-detection': 'none',
  serial: 'none',
  bluetooth: 'none',
  hid: 'none',
  nfc: 'none',
};

/**
 * Generate a Permissions-Policy header value from a feature map.
 */
export function generatePermissionPolicyValue(
  features: Record<string, PermissionPolicyDirective | string[]>,
): string {
  return Object.entries(features)
    .map(([feature, directive]) => {
      if (Array.isArray(directive)) {
        const origins = directive.map((d) => `"${d}"`).join(' ');
        return `${feature}=(${origins})`;
      }
      if (directive === 'self') return `${feature}=(self)`;
      if (directive === 'src') return `${feature}=(src)`;
      if (directive === 'none') return `${feature}=()`;
      if (directive === '*') return `${feature}=*`;
      return `${feature}=("${directive}")`;
    })
    .join(', ');
}

/**
 * Generate Permissions-Policy header for a route.
 */
export function generatePermissionPolicy(
  route: string,
  config: PermissionPolicyConfig = {},
): string {
  if (config.allowAllRoutes?.includes(route)) {
    return '';
  }

  const defaults = { ...DEFAULT_DISABLED, ...config.defaults };
  const routeOverrides = config.routes?.[route];

  const features = routeOverrides ? { ...defaults, ...routeOverrides } : defaults;
  return generatePermissionPolicyValue(features);
}

/**
 * Generate Permissions-Policy headers object for a route.
 */
export function generatePermissionPolicyHeaders(
  route: string,
  config: PermissionPolicyConfig = {},
): Record<string, string> {
  const value = generatePermissionPolicy(route, config);
  if (!value) return {};
  return { 'Permissions-Policy': value };
}

/**
 * Middleware that applies Permissions-Policy headers.
 */
export function permissionPolicyMiddleware(config: PermissionPolicyConfig = {}) {
  return {
    applyHeaders(route: string): Record<string, string> {
      return generatePermissionPolicyHeaders(route, config);
    },
    applyToResponse(route: string, headers: Record<string, string> = {}): Record<string, string> {
      return { ...headers, ...generatePermissionPolicyHeaders(route, config) };
    },
  };
}

/**
 * Get the list of all known restricted features.
 */
export function getRestrictedFeatures(): string[] {
  return [...RESTRICTED_FEATURES];
}

/**
 * Get the default disabled features map.
 */
export function getDefaultDisabledPermissions(): Record<string, PermissionPolicyDirective> {
  return { ...DEFAULT_DISABLED };
}

/**
 * Allow a specific permission for specific origins.
 */
export function allowPermission(
  feature: string,
  origins: string | string[],
): Record<string, PermissionPolicyDirective | string[]> {
  if (typeof origins === 'string') {
    return { [feature]: origins };
  }
  return { [feature]: origins };
}
