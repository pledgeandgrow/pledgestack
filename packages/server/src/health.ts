import type { Server } from 'node:http';

export interface HealthCheckOptions {
  /** Path for health check endpoint (default: '/health') */
  path?: string;
  /** Custom checks to run */
  checks?: Record<string, () => Promise<boolean> | boolean>;
  /** Include memory usage in response (default: true) */
  includeMemory?: boolean;
  /** Include uptime in response (default: true) */
  includeUptime?: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime?: number;
  memory?: { rss: number; heapUsed: number; heapTotal: number };
  checks: Record<string, boolean>;
}

export function createHealthCheck(options: HealthCheckOptions = {}) {
  const {
    path: _path = '/health',
    checks = {},
    includeMemory = true,
    includeUptime = true,
  } = options;

  const startTime = Date.now();

  async function check(): Promise<HealthStatus> {
    const results: Record<string, boolean> = {};

    for (const [name, fn] of Object.entries(checks)) {
      try {
        results[name] = await fn();
      } catch {
        results[name] = false;
      }
    }

    const allHealthy = Object.values(results).every((v) => v);
    const anyUnhealthy = Object.values(results).some((v) => !v);

    return {
      status: allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      ...(includeUptime && { uptime: Math.floor((Date.now() - startTime) / 1000) }),
      ...(includeMemory && process.memoryUsage && {
        memory: {
          rss: process.memoryUsage().rss,
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
        },
      }),
      checks: results,
    };
  }

  return {
    check,
    handler: async () => {
      const status = await check();
      return {
        status: status.status === 'healthy' ? 200 : status.status === 'degraded' ? 200 : 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(status, null, 2),
      };
    },
  };
}

export function attachHealthCheck(server: Server, options: HealthCheckOptions = {}) {
  const { path = '/health' } = options;
  const healthCheck = createHealthCheck(options);

  server.on('request', async (req, res) => {
    const url = req.url?.split('?')[0];
    if (url === path) {
      const result = await healthCheck.handler();
      res.writeHead(result.status, result.headers);
      res.end(result.body);
    }
  });

  return healthCheck;
}
