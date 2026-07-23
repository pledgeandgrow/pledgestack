import { describe, it, expect } from 'vitest';
import { PsxWorkerPool } from './worker-pool';

describe('PSX Worker Pool', () => {
  describe('PsxWorkerPool', () => {
    it('creates with default config', () => {
      const pool = new PsxWorkerPool();
      expect(pool).toBeDefined();
    });

    it('creates with custom config', () => {
      const pool = new PsxWorkerPool({ workerCount: 2, maxQueueSize: 50 });
      expect(pool).toBeDefined();
    });

    it('returns stats', () => {
      const pool = new PsxWorkerPool({ workerCount: 1 });
      const stats = pool.getStats();
      expect(stats.workerCount).toBe(0); // Not started yet
      expect(stats.queueSize).toBe(0);
    });

    it('rejects tasks when shutting down', async () => {
      const pool = new PsxWorkerPool({ workerCount: 1 });
      await pool.shutdown();
      await expect(pool.submit('mod', 'fn')).rejects.toThrow('shutting down');
    });
  });
});
