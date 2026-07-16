import { mkdir, writeFile, copyFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { PledgeConfig } from 'pledgestack-shared';
import { scanAppDir, resolveRoutes, generateStaticPages } from 'pledgestack-core';
import { createModuleLoader, loadEnv } from 'pledgestack-server';
import { processTailwind, ensureTailwindConfig } from '../tailwind';
import { runPledgepack } from 'pledgepack';

/**
 * Builds the project for production.
 *
 * 1. Runs PledgePack's Rust bundler (`pledge build`) to produce optimized JS output
 *    with Oxc transforms, tree shaking, code splitting, and compression.
 * 2. Scans routes and loads bundled modules (from .pledge/ output).
 * 3. Generates static pages (SSG) using the pre-bundled modules.
 * 4. Copies public assets.
 */
export async function buildCommand(): Promise<void> {
  const { loadConfig } = await import('../config-loader');
  const config = await loadConfig();

  loadEnv(config.rootDir, 'production');

  console.log('\n  PledgeStack — Building for production...\n');

  // 1. Run PledgePack Rust bundler (Oxc transforms + tree shaking + code splitting)
  console.log('  → Running PledgePack Rust bundler...');
  await runPledgepack(['build', '--out-dir', config.outDir]);
  console.log('  ✓ Bundle complete\n');

  // 2. Scan routes
  const appDir = join(config.rootDir, config.appDir);
  const files = await scanAppDir(appDir);
  const routes = resolveRoutes(files, config);

  console.log(`  Found ${routes.length} routes`);

  // 3. Create output directory
  const outDir = join(config.rootDir, config.outDir);
  await mkdir(outDir, { recursive: true });

  // 4. Process Tailwind CSS
  if (config.tailwind) {
    await ensureTailwindConfig(config.rootDir);
    await processTailwind({ config });
  }

  // 5. Load all bundled modules for SSG (reads from .pledge/ output, not esbuild)
  const moduleLoader = createModuleLoader(config, false);
  const modules = await moduleLoader.loadAll(routes);

  // 6. Generate static pages
  const staticPages = await generateStaticPages({
    config,
    routes,
    modules: modules as Map<string, import('pledgestack-core').PageModule>,
  });

  for (const [path, html] of staticPages) {
    const filePath = join(outDir, path === '/' ? 'index.html' : `${path}.html`);
    await mkdir(join(filePath, '..'), { recursive: true });
    await writeFile(filePath, html);
    console.log(`  ✓ Generated: ${path}`);
  }

  // 7. Copy public directory
  await copyPublicDir(config);

  console.log('\n  Build complete!\n');
}

async function copyPublicDir(config: PledgeConfig): Promise<void> {
  const publicDir = join(config.rootDir, config.publicDir);
  const outPublic = join(config.rootDir, config.outDir, 'public');

  try {
    const entries = await readdir(publicDir);
    await mkdir(outPublic, { recursive: true });
    for (const entry of entries) {
      await copyFile(join(publicDir, entry), join(outPublic, entry));
    }
    console.log(`  ✓ Copied ${entries.length} public assets`);
  } catch {
    // No public directory — skip
  }
}
