import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConnectionPoolRegistry, calculateOptimalPoolSize, getPool, closeAllPools } from './pool';

describe('Connection Pool', () => {
  afterEach(async () => {
    await closeAllPools();
  });

  describe('calculateOptimalPoolSize', () => {
    it('calculates pool size based on CPU cores', () => {
      const result = calculateOptimalPoolSize({ cpuCores: 4 });
      expect(result.min).toBeGreaterThanOrEqual(2);
      expect(result.max).toBe(16); // 4 * 4
    });

    it('respects custom max connections', () => {
      const result = calculateOptimalPoolSize({ cpuCores: 8, maxConnections: 10 });
      expect(result.max).toBe(10);
    });
  });

  describe('ConnectionPoolRegistry', () => {
    it('returns same pool for same name', () => {
      const registry = ConnectionPoolRegistry.getInstance();
      const pool1 = registry.getOrCreate('test', { url: 'postgres://localhost' });
      const pool2 = registry.getOrCreate('test', { url: 'postgres://localhost' });
      expect(pool1).toBe(pool2);
    });

    it('creates different pools for different names', () => {
      const registry = ConnectionPoolRegistry.getInstance();
      const pool1 = registry.getOrCreate('db1', { url: 'postgres://localhost' });
      const pool2 = registry.getOrCreate('db2', { url: 'postgres://localhost' });
      expect(pool1).not.toBe(pool2);
    });

    it('tracks pool stats', async () => {
      const pool = getPool('stats-test', { url: 'postgres://localhost' });
      const conn = await pool.acquire();
      pool.release(conn);

      const stats = pool.stats();
      expect(stats.totalAcquired).toBe(1);
      expect(stats.totalReleased).toBe(1);
    });
  });
});
