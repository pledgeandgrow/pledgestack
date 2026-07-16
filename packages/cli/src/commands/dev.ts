import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import type { PledgeConfig } from '@pledgestack/shared';
import { startNodeServer, loadEnv } from '@pledgestack/server';
import { processTailwind } from '../tailwind';
import { resolveBinary } from 'pledgepack';

const PLEDGEPACK_DEV_PORT = 3001;

/**
 * Starts the development server.
 *
 * PledgePack's Rust dev server (axum + Oxc) handles:
 *   - Module transformation (TSX→JS via Oxc, not esbuild)
 *   - HMR via WebSocket with error overlay
 *   - CSS HMR with Lightning CSS
 *   - Import maps for bare specifiers
 *   - CJS→ESM interop for node_modules
 *   - File watching and incremental rebuilds
 *
 * PledgeStack's Node.js server handles:
 *   - SSR (React renderToString)
 *   - API routes
 *   - Middleware execution
 *   - Server actions
 *
 * Module/asset/HMR requests are proxied to PledgePack.
 */
export async function devCommand(options: { port?: number; hostname?: string } = {}): Promise<void> {
  const { loadConfig } = await import('../config-loader');
  const config = await loadConfig();

  loadEnv(config.rootDir, 'development');

  const port = options.port ?? 3000;
  const hostname = options.hostname ?? 'localhost';

  console.log('\n  PledgeStack — Starting dev server...\n');

  if (config.tailwind) {
    await processTailwind({ config });
  }

  const binary = resolveBinary();
  if (!binary) {
    console.error('  PledgePack binary not found. Building from source...');
    console.error('  Run "cargo build --release" in the pledgepack package.');
    process.exit(1);
  }

  console.log(`  → PledgePack Rust compiler: http://${hostname}:${PLEDGEPACK_DEV_PORT}`);
  console.log(`  → PledgeStack SSR server:   http://${hostname}:${port}\n`);

  const pledgepackProc = spawn(binary, [
    'dev',
    '--port', String(PLEDGEPACK_DEV_PORT),
    '--host', hostname,
  ], {
    stdio: 'inherit',
    cwd: config.rootDir,
  });

  pledgepackProc.on('error', (err) => {
    console.error('[pledgestack] Failed to start PledgePack dev server:', err);
    process.exit(1);
  });

  await waitForServer(hostname, PLEDGEPACK_DEV_PORT, 5000);

  startNodeServer({
    config,
    port,
    hostname,
    isDev: true,
    pledgepackPort: PLEDGEPACK_DEV_PORT,
  });
}

function waitForServer(hostname: string, port: number, timeoutMs: number): Promise<void> {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    function attempt() {
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error(`PledgePack dev server did not start within ${timeoutMs}ms`));
        return;
      }
      const req = httpRequest(`http://${hostname}:${port}/__pledge_router`, { method: 'GET', timeout: 1000 }, (res: import('node:http').IncomingMessage) => {
        res.destroy();
        resolve();
      });
      req.on('error', () => setTimeout(attempt, 200));
      req.on('timeout', () => { req.destroy(); setTimeout(attempt, 200); });
      req.end();
    }
    attempt();
  });
}

export type { PledgeConfig };
