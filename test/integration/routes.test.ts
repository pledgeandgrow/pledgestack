/**
 * Integration tests — route matching, SSR, API routes, middleware.
 * Item 68 of the PledgeStack roadmap.
 */
import { describe, it, expect } from 'vitest';
import { createRouter } from '../../packages/core/src/router';
import { resolveRoutes } from '../../packages/core/src/router/resolve';
import type { PledgeConfig } from '../../packages/core/src/config';

const mockConfig: PledgeConfig = {
  rootDir: process.cwd(),
  appDir: 'app',
  output: 'standalone',
  rsc: false,
};

describe('Route matching', () => {
  it('matches static routes', () => {
    const files = [
      { path: 'app/page.tsx', mode: 'ssr' as const },
      { path: 'app/about/page.tsx', mode: 'ssr' as const },
    ];
    const routes = resolveRoutes(files, mockConfig);
    const router = createRouter(routes, mockConfig);

    expect(router.match('/')).toBeTruthy();
    expect(router.match('/about')).toBeTruthy();
    expect(router.match('/nonexistent')).toBeNull();
  });

  it('matches dynamic routes', () => {
    const files = [
      { path: 'app/blog/[slug]/page.tsx', mode: 'ssr' as const },
    ];
    const routes = resolveRoutes(files, mockConfig);
    const router = createRouter(routes, mockConfig);

    const match = router.match('/blog/hello-world');
    expect(match).toBeTruthy();
    expect(match?.params.slug).toBe('hello-world');
  });

  it('matches catch-all routes', () => {
    const files = [
      { path: 'app/docs/[...slug]/page.tsx', mode: 'ssr' as const },
    ];
    const routes = resolveRoutes(files, mockConfig);
    const router = createRouter(routes, mockConfig);

    const match = router.match('/docs/getting-started/install');
    expect(match).toBeTruthy();
    expect(match?.params.slug).toEqual(['getting-started', 'install']);
  });

  it('matches route groups without affecting path', () => {
    const files = [
      { path: 'app/(marketing)/page.tsx', mode: 'ssr' as const },
      { path: 'app/(marketing)/about/page.tsx', mode: 'ssr' as const },
    ];
    const routes = resolveRoutes(files, mockConfig);
    const router = createRouter(routes, mockConfig);

    expect(router.match('/')).toBeTruthy();
    expect(router.match('/about')).toBeTruthy();
  });
});

describe('API routes', () => {
  it('resolves API route files', () => {
    const files = [
      { path: 'app/api/health/route.ts', mode: 'api' as const },
    ];
    const routes = resolveRoutes(files, mockConfig);
    expect(routes).toHaveLength(1);
    expect(routes[0].mode).toBe('api');
  });
});

describe('Middleware', () => {
  it('middleware matcher compiles patterns', async () => {
    const { createMatcher } = await import('../../packages/server/src/middleware-matcher');
    const matcher = createMatcher(['/dashboard/*', '/api/*']);

    expect(matcher('/dashboard')).toBe(true);
    expect(matcher('/dashboard/settings')).toBe(true);
    expect(matcher('/api/users')).toBe(true);
    expect(matcher('/home')).toBe(false);
  });

  it('middleware matcher handles negation', async () => {
    const { createMatcher } = await import('../../packages/server/src/middleware-matcher');
    const matcher = createMatcher(['/((?!api|_next).*)']);

    expect(matcher('/home')).toBe(true);
    expect(matcher('/api/users')).toBe(false);
  });
});
