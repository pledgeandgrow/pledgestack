import type { Server } from 'node:http';

export interface GracefulShutdownOptions {
  /** Timeout before forcing shutdown (default: 10000ms) */
  timeout?: number;
  /** Callbacks to run during shutdown */
  onShutdown?: Array<() => Promise<void> | void>;
  /** Logger function (default: console.log) */
  logger?: (msg: string) => void;
  /** Server instances to close */
  servers?: Server[];
}

export function setupGracefulShutdown(options: GracefulShutdownOptions = {}) {
  const {
    timeout = 10000,
    onShutdown = [],
    logger = (msg) => console.log(`[pledgestack] ${msg}`),
    servers = [],
  } = options;

  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;

    logger(`Received ${signal}, starting graceful shutdown...`);

    const forceTimer = setTimeout(() => {
      logger('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, timeout);

    for (const server of servers) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }

    for (const fn of onShutdown) {
      try {
        await fn();
      } catch (err) {
        logger(`Shutdown hook failed: ${err}`);
      }
    }

    clearTimeout(forceTimer);
    logger('Graceful shutdown complete');
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return { shutdown, isShuttingDown: () => shuttingDown };
}
