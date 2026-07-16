/**
 * Open redirect prevention — validates redirect URLs against an allowlist.
 *
 * Blocks absolute URLs to external hosts, prevents javascript: and data:
 * schemes, and enforces relative paths or same-origin redirects only.
 */

/** Schemes that are always blocked in redirects */
const BLOCKED_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:'];

export interface RedirectValidationOptions {
  /** Allowed external hosts (empty = no external redirects allowed) */
  allowedHosts?: string[];
  /** Whether to allow same-origin absolute URLs (default: true) */
  allowSameOrigin?: boolean;
  /** The current request's origin for same-origin checks */
  origin?: string;
}

/**
 * Validate a redirect URL to prevent open redirect attacks.
 *
 * Returns the sanitized URL if safe, or null if the URL is dangerous.
 *
 * @example
 * const safe = validateRedirect(req.query.redirect, { origin: req.url.origin });
 * if (!safe) return new Response('Invalid redirect', { status: 400 });
 */
export function validateRedirect(
  url: string,
  options: RedirectValidationOptions = {},
): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Block dangerous schemes
  const lower = trimmed.toLowerCase();
  for (const scheme of BLOCKED_SCHEMES) {
    if (lower.startsWith(scheme)) return null;
  }

  // Relative paths are safe (start with / but not //)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    // Prevent path traversal in redirects
    if (trimmed.includes('..')) return null;
    return trimmed;
  }

  // Protocol-relative URLs (//example.com) — treat as absolute
  if (trimmed.startsWith('//')) {
    const host = trimmed.slice(2).split('/')[0];
    if (!isHostAllowed(host, options)) return null;
    return trimmed;
  }

  // Absolute URLs — check host against allowlist
  try {
    const parsed = new URL(trimmed);
    if (!isHostAllowed(parsed.host, options)) return null;
    return trimmed;
  } catch {
    // Not a valid URL — could be a relative path without leading /
    if (!trimmed.includes('://') && !trimmed.startsWith('//')) {
      return '/' + trimmed;
    }
    return null;
  }
}

/**
 * Check if a host is allowed for redirects.
 */
function isHostAllowed(host: string, options: RedirectValidationOptions): boolean {
  const { allowedHosts = [], allowSameOrigin = true, origin } = options;

  if (allowSameOrigin && origin) {
    try {
      const originParsed = new URL(origin);
      if (host === originParsed.host) return true;
    } catch {
      // Invalid origin, skip same-origin check
    }
  }

  return allowedHosts.includes(host);
}

/**
 * Middleware helper to safely redirect.
 * Returns a Response with the redirect, or 400 if the URL is invalid.
 */
export function safeRedirect(
  url: string,
  status: number = 307,
  options?: RedirectValidationOptions,
): Response {
  const safe = validateRedirect(url, options);
  if (!safe) {
    return new Response('Invalid redirect URL', { status: 400 });
  }
  return new Response(null, {
    status,
    headers: { Location: safe },
  });
}
