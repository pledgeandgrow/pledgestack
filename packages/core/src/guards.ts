import type { PledgeRequest, PledgeResponse } from 'pledgestack-shared';

export type RouteGuard = (
  req: PledgeRequest,
) => Promise<PledgeResponse | null> | PledgeResponse | null;

export interface GuardOptions {
  /** Redirect URL if guard fails */
  redirectTo?: string;
  /** Error status code (default: 403) */
  status?: number;
  /** Error message */
  message?: string;
}

export function defineRouteGuard(
  guard: RouteGuard,
  options: GuardOptions = {},
): RouteGuard {
  const { redirectTo, status = 403, message = 'Forbidden' } = options;

  return async (req: PledgeRequest) => {
    const result = await guard(req);

    if (result === null) return null;

    if (redirectTo) {
      return {
        status: 302,
        headers: { Location: redirectTo },
        body: '',
      } as PledgeResponse;
    }

    return result ?? {
      status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: message }),
    } as PledgeResponse;
  };
}

export function requireAuthGuard(
  getSession: (req: PledgeRequest) => Promise<{ userId: string } | null>,
  options?: GuardOptions,
): RouteGuard {
  return defineRouteGuard(
    async (req) => {
      const session = await getSession(req);
      return session ? null : { status: 401, headers: {}, body: '' } as unknown as PledgeResponse;
    },
    { ...options, message: 'Authentication required', status: 401 },
  );
}

export function requireRoleGuard(
  getSession: (req: PledgeRequest) => Promise<{ role: string } | null>,
  role: string,
  options?: GuardOptions,
): RouteGuard {
  return defineRouteGuard(
    async (req) => {
      const session = await getSession(req);
      if (!session) return { status: 401, headers: {}, body: '' } as unknown as PledgeResponse;
      if (session.role !== role) return { status: 403, headers: {}, body: '' } as unknown as PledgeResponse;
      return null;
    },
    options,
  );
}

export function composeGuards(...guards: RouteGuard[]): RouteGuard {
  return async (req: PledgeRequest) => {
    for (const guard of guards) {
      const result = await guard(req);
      if (result !== null) return result;
    }
    return null;
  };
}

export function rateLimitGuard(
  options: { windowMs: number; max: number; keyFn?: (req: PledgeRequest) => string },
): RouteGuard {
  const { windowMs, max, keyFn = (req) => req.headers?.['x-forwarded-for'] ?? 'anonymous' } = options;
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return async (req: PledgeRequest) => {
    const key = keyFn(req);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return null;
    }

    bucket.count++;
    if (bucket.count > max) {
      return {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((bucket.resetAt - now) / 1000)) },
        body: JSON.stringify({ error: 'Too many requests' }),
      } as PledgeResponse;
    }

    return null;
  };
}
