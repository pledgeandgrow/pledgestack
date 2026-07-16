import { build } from 'esbuild';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src');
const outDir = join(__dirname, '..', 'dist');

const entryPoints = [
  { in: join(srcDir, 'bin.ts'), out: 'bin' },
  { in: join(srcDir, 'index.ts'), out: 'index' },
  { in: join(srcDir, 'server.ts'), out: 'server' },
  { in: join(srcDir, 'client.ts'), out: 'client' },
  { in: join(srcDir, 'auth.ts'), out: 'auth' },
  { in: join(srcDir, 'state.ts'), out: 'state' },
  { in: join(srcDir, 'api.ts'), out: 'api' },
  { in: join(srcDir, 'a11y.ts'), out: 'a11y' },
  { in: join(srcDir, 'overlay.ts'), out: 'overlay' },
  { in: join(srcDir, 'seo.ts'), out: 'seo' },
];

const commonOptions = {
  bundle: true,
  format: 'esm',
  target: 'node20',
  platform: 'node',
  sourcemap: true,
  jsx: 'automatic',
  jsxImportSource: 'react',
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react-dom/client',
    'react-server-dom-webpack',
    'esbuild',
    'jiti',
    'tailwindcss',
    '@tailwindcss/postcss',
    'postcss',
    'autoprefixer',
    'pledgepack',
    // Optional database adapters (dynamically imported)
    'drizzle-orm/node-postgres',
    'drizzle-orm/mysql2',
    'drizzle-orm/better-sqlite3',
    'pg',
    'mysql2/promise',
    'better-sqlite3',
    'kysely',
  ],
  alias: {
    'pledgestack-shared': join(__dirname, '..', '..', 'shared', 'src', 'index.ts'),
    'pledgestack-core': join(__dirname, '..', '..', 'core', 'src', 'index.ts'),
    'pledgestack-server': join(__dirname, '..', '..', 'server', 'src', 'index.ts'),
    'pledgestack-client': join(__dirname, '..', '..', 'client', 'src', 'index.ts'),
    'pledgestack-auth': join(__dirname, '..', '..', 'auth', 'src', 'index.ts'),
    'pledgestack-state': join(__dirname, '..', '..', 'state', 'src', 'index.ts'),
    'pledgestack-api': join(__dirname, '..', '..', 'api', 'src', 'index.ts'),
    'pledgestack-a11y': join(__dirname, '..', '..', 'a11y', 'src', 'index.ts'),
    'pledgestack-overlay': join(__dirname, '..', '..', 'overlay', 'src', 'index.ts'),
    'pledgestack-seo': join(__dirname, '..', '..', 'seo', 'src', 'index.ts'),
  },
};

async function main() {
  // Clean dist
  await rm(outDir, { recursive: true, force: true });

  const { execSync } = await import('node:child_process');
  const packagesRoot = join(__dirname, '..', '..');

  // Build sub-packages (best-effort — esbuild bundles from source anyway)
  try {
    execSync('pnpm --filter pledgestack-shared --filter pledgestack-core --filter pledgestack-server --filter pledgestack-client --filter pledgestack-auth --filter pledgestack-state --filter pledgestack-api --filter pledgestack-a11y --filter pledgestack-overlay --filter pledgestack-seo run build', {
      cwd: packagesRoot,
      stdio: 'inherit',
    });
  } catch {
    console.warn('Sub-package tsc build had errors — continuing with esbuild bundle (uses source aliases).');
  }

  // Bundle JS with esbuild (bundles from source via aliases)
  await build({
    ...commonOptions,
    entryPoints: entryPoints.map((e) => e.in),
    outdir: outDir,
    entryNames: '[name]',
  });

  // Generate type declarations (best-effort)
  try {
    execSync('tsc -p tsconfig.emit.json', {
      cwd: join(__dirname, '..'),
      stdio: 'inherit',
    });
  } catch {
    console.warn('Type declaration generation had errors — dist JS is still valid.');
  }

  console.log('Build complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
