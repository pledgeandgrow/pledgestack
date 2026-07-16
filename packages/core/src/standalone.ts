/**
 * Standalone output mode — generates a self-contained .pledge/standalone/
 * directory with all dependencies bundled for deployment.
 *
 * The standalone output includes:
 * - Bundled server code (no node_modules needed)
 * - Static assets
 * - package.json with only runtime deps
 * - Dockerfile and .dockerignore
 * - server.js entry point
 */

import { join } from 'node:path';
import { mkdir, writeFile, copyFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export interface StandaloneOptions {
  /** Project root directory */
  rootDir: string;
  /** Build output directory (default: .pledge) */
  outDir?: string;
  /** App directory (default: app) */
  appDir?: string;
  /** Public directory (default: public) */
  publicDir?: string;
}

/**
 * Generate a standalone output directory.
 * Call after the build step has produced the build output.
 */
export async function generateStandalone(options: StandaloneOptions): Promise<string> {
  const { rootDir } = options;
  const outDir = options.outDir ?? '.pledge';
  const publicDir = options.publicDir ?? 'public';

  const standaloneDir = join(rootDir, outDir, 'standalone');

  if (existsSync(standaloneDir)) {
    await rm(standaloneDir, { recursive: true, force: true });
  }

  await mkdir(standaloneDir, { recursive: true });

  await generateServerEntry(standaloneDir);
  await generateStandalonePackageJson(standaloneDir);
  await copyBuildOutput(rootDir, outDir, standaloneDir);
  await copyPublicAssets(rootDir, publicDir, standaloneDir);
  await generateDockerfile(standaloneDir);
  await generateDockerignore(standaloneDir);

  return standaloneDir;
}

async function generateServerEntry(standaloneDir: string): Promise<void> {
  const serverCode = `#!/usr/bin/env node
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const { loadConfig } = await import('./config.js');
  const { startNodeServer } = await import('./server.js');

  const config = await loadConfig(__dirname);
  const port = parseInt(process.env.PORT ?? '3000', 10);
  const hostname = process.env.HOSTNAME ?? '0.0.0.0';

  startNodeServer({ config, port, hostname, isDev: false });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
`;

  await writeFile(join(standaloneDir, 'server.js'), serverCode, 'utf-8');
}

async function generateStandalonePackageJson(standaloneDir: string): Promise<void> {
  const pkg = {
    name: 'pledgestack-standalone',
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      start: 'node server.js',
    },
    dependencies: {
      react: '^19.0.0',
      'react-dom': '^19.0.0',
    },
  };

  await writeFile(join(standaloneDir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf-8');
}

async function copyBuildOutput(rootDir: string, outDir: string, standaloneDir: string): Promise<void> {
  const buildDir = join(rootDir, outDir);
  if (!existsSync(buildDir)) return;

  await copyDir(buildDir, standaloneDir, [join(buildDir, 'standalone')]);
}

async function copyPublicAssets(rootDir: string, publicDir: string, standaloneDir: string): Promise<void> {
  const publicPath = join(rootDir, publicDir);
  if (!existsSync(publicPath)) return;

  const targetPath = join(standaloneDir, 'public');
  await copyDir(publicPath, targetPath);
}

async function generateDockerfile(standaloneDir: string): Promise<void> {
  const dockerfile = `FROM node:20-alpine AS runner
WORKDIR /app
COPY package.json ./
COPY . .
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
`;

  await writeFile(join(standaloneDir, 'Dockerfile'), dockerfile, 'utf-8');
}

async function generateDockerignore(standaloneDir: string): Promise<void> {
  const dockerignore = `node_modules
.git
.env*
*.md
`;

  await writeFile(join(standaloneDir, '.dockerignore'), dockerignore, 'utf-8');
}

async function copyDir(src: string, dest: string, exclude: string[] = []): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    if (exclude.includes(srcPath)) continue;

    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, exclude);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}
