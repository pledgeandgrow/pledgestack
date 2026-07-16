/**
 * DNS rebinding protection — validates Host header against an allowlist
 * to prevent DNS rebinding attacks in development.
 *
 * In dev mode, binds to 127.0.0.1 by default and validates that the
 * Host header matches the expected hostname.
 */

export interface DnsRebindingOptions {
  /** Allowed hosts (default: ['localhost', '127.0.0.1']) */
  allowedHosts?: string[];
  /** Whether to block requests with non-allowed hosts (default: true in dev) */
  blockDisallowed?: boolean;
}

const DEFAULT_ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0'];

/**
 * Validate the Host header against an allowlist.
 * Returns true if the host is allowed, false otherwise.
 */
export function validateHost(
  hostHeader: string | undefined,
  options: DnsRebindingOptions = {},
): boolean {
  const allowedHosts = options.allowedHosts ?? DEFAULT_ALLOWED_HOSTS;
  const blockDisallowed = options.blockDisallowed ?? true;

  if (!blockDisallowed) return true;

  if (!hostHeader) return false;

  // Strip port from host header
  const host = hostHeader.split(':')[0].toLowerCase();

  return allowedHosts.includes(host);
}

/**
 * DNS rebinding protection middleware.
 * Blocks requests with disallowed Host headers.
 */
export function dnsRebindingMiddleware(options: DnsRebindingOptions = {}) {
  const allowedHosts = options.allowedHosts ?? DEFAULT_ALLOWED_HOSTS;
  const blockDisallowed = options.blockDisallowed ?? true;

  return {
    name: 'pledgestack-dns-rebinding',
    onRequest(req: { headers: Record<string, string> }): { blocked: boolean; reason?: string } {
      if (!blockDisallowed) return { blocked: false };

      const host = req.headers['host'];
      if (!host) {
        return { blocked: true, reason: 'Missing Host header' };
      }

      const hostName = host.split(':')[0].toLowerCase();
      if (!allowedHosts.includes(hostName)) {
        return { blocked: true, reason: `Disallowed host: ${hostName}` };
      }

      return { blocked: false };
    },
  };
}

/**
 * Get the recommended bind address for dev mode.
 * Uses 127.0.0.1 to prevent external access by default.
 */
export function getDevBindAddress(): { hostname: string; port: number } {
  return {
    hostname: '127.0.0.1',
    port: 3000,
  };
}
