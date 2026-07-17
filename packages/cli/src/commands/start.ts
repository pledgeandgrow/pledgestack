import { resolveBinary, runPledgepack } from 'pledgepack';
import { startNodeServer } from 'pledgestack-server';

/**
 * Starts the production server.
 *
 * Tries PledgePack's Rust production server (`pledge serve`) first —
 * it's an Axum/Hyper-based HTTP server with high throughput, gzip/brotli
 * compression, and static file serving.
 *
 * Falls back to PledgeStack's Node.js server if the PledgePack binary
 * is not available (e.g. during development without a built binary).
 */
export async function startCommand(options: { port?: number; hostname?: string } = {}): Promise<void> {
  const { loadConfig } = await import('../config-loader');
  const config = await loadConfig();

  const port = options.port ?? 3000;
  const hostname = options.hostname ?? 'localhost';

  console.log('\n  PledgeStack — Starting production server...\n');

  const binary = resolveBinary();
  if (binary) {
    console.log('  → Using PledgePack Rust production server (axum/hyper)\n');
    await runPledgepack([
      'serve',
      '--port', String(port),
      '--host', hostname,
      '--out-dir', config.outDir,
    ]);
  } else {
    console.warn('  ⚠ PledgePack binary not found — falling back to Node.js server');
    console.warn('  For best performance, install pledgepack: npm install pledgepack\n');
    startNodeServer({
      config,
      port,
      hostname,
      isDev: false,
    });
  }
}
