import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.d.ts', 'packages/pledgepack/**'],
    },
    timeout: 10000,
  },
  resolve: {
    alias: {
      '@pledgestack/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
      '@pledgestack/core': resolve(__dirname, 'packages/core/src/index.ts'),
      '@pledgestack/server': resolve(__dirname, 'packages/server/src/index.ts'),
      '@pledgestack/client': resolve(__dirname, 'packages/client/src/index.ts'),
      '@pledgestack/auth': resolve(__dirname, 'packages/auth/src/index.ts'),
      '@pledgestack/state': resolve(__dirname, 'packages/state/src/index.ts'),
      '@pledgestack/api': resolve(__dirname, 'packages/api/src/index.ts'),
      '@pledgestack/a11y': resolve(__dirname, 'packages/a11y/src/index.ts'),
      '@pledgestack/overlay': resolve(__dirname, 'packages/overlay/src/index.ts'),
      '@pledgestack/seo': resolve(__dirname, 'packages/seo/src/index.ts'),
    },
  },
});
