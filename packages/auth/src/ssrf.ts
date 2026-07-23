import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function isLoopback(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('127.');
}

function isPrivate(ip: string): boolean {
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('172.')) {
    const second = parseInt(ip.split('.')[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith('169.254.')) return true;
  if (ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd')) return true;
  return false;
}

function isLinkLocal(ip: string): boolean {
  return ip.startsWith('169.254.') || ip.startsWith('fe80:');
}

export interface SsrfCheckOptions {
  /** Allow loopback addresses (127.x.x.x) — default: false */
  allowLoopback?: boolean;
  /** Allow private network addresses (10.x, 192.168.x, etc) — default: false */
  allowPrivate?: boolean;
  /** Allow link-local addresses (169.254.x) — default: false */
  allowLinkLocal?: boolean;
  /** Blocklist of domains */
  blocklist?: string[];
  /** Allowlist of domains (if set, only these are allowed) */
  allowlist?: string[];
  /** Timeout for DNS resolution in ms (default: 5000) */
  dnsTimeout?: number;
}

export async function isSafeUrl(
  url: string,
  options: SsrfCheckOptions = {},
): Promise<{ safe: boolean; reason?: string }> {
  const {
    allowLoopback = false,
    allowPrivate = false,
    allowLinkLocal = false,
    blocklist = [],
    allowlist,
    dnsTimeout = 5000,
  } = options;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { safe: false, reason: 'Invalid URL' };
  }

  const hostname = parsed.hostname;

  if (allowlist && !allowlist.includes(hostname)) {
    return { safe: false, reason: `Hostname ${hostname} not in allowlist` };
  }

  if (blocklist.includes(hostname)) {
    return { safe: false, reason: `Hostname ${hostname} is blocklisted` };
  }

  if (isIP(hostname)) {
    const check = checkIp(hostname, { allowLoopback, allowPrivate, allowLinkLocal });
    if (!check.safe) return check;
  } else {
    try {
      const addresses = await withTimeout(lookup(hostname, { all: true }), dnsTimeout);
      for (const addr of addresses) {
        const check = checkIp(addr.address, { allowLoopback, allowPrivate, allowLinkLocal });
        if (!check.safe) return check;
      }
    } catch {
      return { safe: false, reason: 'DNS resolution failed' };
    }
  }

  const protocol = parsed.protocol;
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { safe: false, reason: `Protocol ${protocol} not allowed` };
  }

  return { safe: true };
}

function checkIp(
  ip: string,
  opts: { allowLoopback: boolean; allowPrivate: boolean; allowLinkLocal: boolean },
): { safe: boolean; reason?: string } {
  if (isLoopback(ip) && !opts.allowLoopback) {
    return { safe: false, reason: 'Loopback address blocked' };
  }
  if (isPrivate(ip) && !opts.allowPrivate) {
    return { safe: false, reason: 'Private network address blocked' };
  }
  if (isLinkLocal(ip) && !opts.allowLinkLocal) {
    return { safe: false, reason: 'Link-local address blocked' };
  }
  return { safe: true };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error('DNS timeout')), ms);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function createSafeFetch(options: SsrfCheckOptions = {}): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const check = await isSafeUrl(url, options);
    if (!check.safe) {
      throw new Error(`SSRF blocked: ${check.reason}`);
    }
    return fetch(input, init);
  };
}
