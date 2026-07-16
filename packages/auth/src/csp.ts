export interface CspDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'frame-src'?: string[];
  'object-src'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'frame-ancestors'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'report-uri'?: string;
}

export function generateCspHeader(directives: CspDirectives): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(directives)) {
    if (key === 'upgrade-insecure-requests') {
      if (value) parts.push('upgrade-insecure-requests');
      continue;
    }
    if (key === 'report-uri') {
      if (typeof value === 'string') parts.push(`report-uri ${value}`);
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length > 0) {
        parts.push(`${key} ${value.join(' ')}`);
      }
    }
  }

  return parts.join('; ');
}

export function generateCspMetaTag(directives: CspDirectives): string {
  return `<meta http-equiv="Content-Security-Policy" content="${generateCspHeader(directives).replace(/"/g, '&quot;')}">`;
}

export const DEFAULT_CSP: CspDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", 'https:'],
  'connect-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': true,
};

export function cspMiddleware(custom?: Partial<CspDirectives>) {
  const directives = { ...DEFAULT_CSP, ...custom };
  const header = generateCspHeader(directives);

  return {
    name: 'pledgestack-csp',
    configureServer(server: { onRequest?: (headers: Record<string, string>) => void }) {
      if (server.onRequest) {
        server.onRequest({ 'Content-Security-Policy': header });
      }
    },
    getHeader(): string {
      return header;
    },
  };
}
