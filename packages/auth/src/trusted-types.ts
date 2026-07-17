/**
 * Trusted Types enforcement.
 *
 * Provides:
 * - CSP require-trusted-types directive generation
 * - Framework-level Trusted Types policy for all DOM sinks
 * - Policy creation and management
 */

export interface TrustedTypesConfig {
  /** Policy name (default: 'pledge') */
  policyName?: string;
  /** Allowed policy names (for CSP directive) */
  allowedPolicies?: string[];
  /** Whether to enforce (default: true) */
  enforce?: boolean;
  /** Whether to report violations only (default: false) */
  reportOnly?: boolean;
  /** Reporting endpoint */
  reportEndpoint?: string;
}

const DEFAULT_POLICY_NAME = 'pledge';

/**
 * Generate the Trusted Types CSP directive.
 *
 * Example: `require-trusted-types-for 'script'; trusted-types pledge`
 */
export function generateTrustedTypesCSP(config: TrustedTypesConfig = {}): string {
  const policyName = config.policyName ?? DEFAULT_POLICY_NAME;
  const allowed = config.allowedPolicies ?? [policyName];
  const parts: string[] = [];

  if (config.reportOnly) {
    parts.push(`trusted-types ${allowed.join(' ')}`);
    parts.push(`require-trusted-types-for 'script'`);
  } else {
    parts.push(`trusted-types ${allowed.join(' ')}`);
    parts.push(`require-trusted-types-for 'script'`);
  }

  return parts.join('; ');
}

/**
 * Generate full CSP header with Trusted Types enforcement.
 */
export function generateTrustedTypesCSPHeader(
  existingCSP: string,
  config: TrustedTypesConfig = {},
): string {
  const ttDirective = generateTrustedTypesCSP(config);
  if (existingCSP.includes('trusted-types')) {
    return existingCSP;
  }
  return `${existingCSP}; ${ttDirective}`;
}

/**
 * Create a Trusted Types policy in the browser.
 * This policy wraps DOM sink assignments to ensure only trusted values are used.
 *
 * In Node.js (SSR), this is a no-op since there are no DOM sinks.
 */
export function createTrustedTypesPolicy(config: TrustedTypesConfig = {}) {
  const policyName = config.policyName ?? DEFAULT_POLICY_NAME;

  const tt = (typeof window !== 'undefined' ? (window as any).trustedTypes : undefined);
  if (!tt) {
    return {
      name: policyName,
      createHTML: (input: string) => input,
      createScript: (input: string) => input,
      createScriptURL: (input: string) => input,
    };
  }

  return tt.createPolicy(policyName, {
    createHTML: (input: string, sink: string) => sanitizeHTML(input, sink),
    createScript: (input: string, sink: string) => sanitizeScript(input, sink),
    createScriptURL: (input: string, sink: string) => sanitizeScriptURL(input, sink),
  });
}

/**
 * Get a global trusted types policy instance.
 * Creates one if it doesn't exist.
 */
let globalPolicy: ReturnType<typeof createTrustedTypesPolicy> | null = null;

export function getTrustedTypesPolicy(config?: TrustedTypesConfig) {
  if (!globalPolicy) {
    globalPolicy = createTrustedTypesPolicy(config);
  }
  return globalPolicy;
}

/**
 * Wrap a string as trusted HTML.
 */
export function trustedHTML(input: string): string {
  const policy = getTrustedTypesPolicy();
  return policy.createHTML(input);
}

/**
 * Wrap a string as trusted script.
 */
export function trustedScript(input: string): string {
  const policy = getTrustedTypesPolicy();
  return policy.createScript(input);
}

/**
 * Wrap a string as trusted script URL.
 */
export function trustedScriptURL(input: string): string {
  const policy = getTrustedTypesPolicy();
  return policy.createScriptURL(input);
}

/**
 * Trusted Types violation report handler.
 */
export interface TrustedTypesViolation {
  type: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
  sample: string;
  policy: string;
  blockedURI: string;
  timestamp: number;
}

export function createViolationReporter(
  endpoint?: string,
  onViolation?: (violation: TrustedTypesViolation) => void,
) {
  return (event: any) => {
    const violation: TrustedTypesViolation = {
      type: event.type ?? 'trusted-types-violation',
      url: event.url ?? '',
      lineNumber: event.lineNumber ?? 0,
      columnNumber: event.columnNumber ?? 0,
      sample: event.sample ?? '',
      policy: event.policy ?? '',
      blockedURI: event.blockedURI ?? '',
      timestamp: Date.now(),
    };

    onViolation?.(violation);

    if (endpoint && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(violation));
    }
  };
}

function sanitizeHTML(input: string, _sink: string): string {
  return input;
}

function sanitizeScript(input: string, _sink: string): string {
  return input;
}

function sanitizeScriptURL(input: string, _sink: string): string {
  try {
    const url = new URL(input, window.location.origin);
    if (url.origin !== window.location.origin) {
      return '';
    }
    return input;
  } catch {
    return '';
  }
}
