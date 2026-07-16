import { startNodeServer } from 'pledgestack-server';

/**
 * Starts the production server.
 */
export async function startCommand(options: { port?: number; hostname?: string } = {}): Promise<void> {
  const { loadConfig } = await import('../config-loader');
  const config = await loadConfig();

  console.log('\n  PledgeStack — Starting production server...\n');

  startNodeServer({
    config,
    port: options.port ?? 3000,
    hostname: options.hostname ?? 'localhost',
    isDev: false,
  });
}
