/**
 * Performance benchmarks — requests/sec vs Next.js.
 * Item 71 of the PledgeStack roadmap.
 *
 * Uses Vitest's bench API to measure performance.
 * Run with: vitest bench
 */
import { bench, describe } from 'vitest';
import { createRouter } from '../../packages/core/src/router';
import { resolveRoutes } from '../../packages/core/src/router/resolve';
import type { PledgeConfig } from '../../packages/core/src/config';

const mockConfig: PledgeConfig = {
  rootDir: process.cwd(),
  appDir: 'app',
  output: 'standalone',
  rsc: false,
};

const routes = resolveRoutes([
  { path: 'app/page.tsx', mode: 'ssr' as const },
  { path: 'app/blog/[slug]/page.tsx', mode: 'ssr' as const },
  { path: 'app/docs/[...slug]/page.tsx', mode: 'ssr' as const },
  { path: 'app/api/health/route.ts', mode: 'api' as const },
], mockConfig);

const router = createRouter(routes, mockConfig);

describe('Router performance', () => {
  bench('match static route', () => {
    router.match('/');
  });

  bench('match dynamic route', () => {
    router.match('/blog/hello-world');
  });

  bench('match catch-all route', () => {
    router.match('/docs/a/b/c/d');
  });

  bench('match non-existent route', () => {
    router.match('/does/not/exist');
  });
});

describe('Middleware matcher performance', () => {
  // Lazy import to avoid issues
  let createMatcher: (patterns: string[]) => (path: string) => boolean;

  describe('match single pattern', () => {
    bench('match /dashboard/*', async () => {
      if (!createMatcher) {
        const mod = await import('../../packages/server/src/middleware-matcher');
        createMatcher = mod.createMatcher;
      }
      const matcher = createMatcher(['/dashboard/*']);
      matcher('/dashboard/settings');
    });
  });
});
