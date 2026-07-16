import type { MiddlewareResult } from 'pledgestack';

export default function middleware(req: Request): MiddlewareResult {
  const url = new URL(req.url);

  // Example: Redirect /old-home to /
  if (url.pathname === '/old-home') {
    return {
      redirect: { destination: '/', permanent: true },
    };
  }

  // Example: Add security headers to all responses
  return {
    next: true,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  };
}
