import { describe, it, expect } from 'vitest';
import { benchmarkFn, compareRustVsTs, formatBenchResult } from './bench';

describe('PSX Bench', () => {
  describe('benchmarkFn', () => {
    it('benchmarks a sync function', async () => {
      const result = await benchmarkFn('test', () => 42, { iterations: 100, warmupIterations: 10 });
      expect(result.name).toBe('test');
      expect(result.iterations).toBe(100);
      expect(result.avgTimeMs).toBeGreaterThan(0);
      expect(result.opsPerSec).toBeGreaterThan(0);
    });

    it('benchmarks an async function', async () => {
      const result = await benchmarkFn('async-test', async () => {
        await new Promise(r => setTimeout(r, 0));
        return 42;
      }, { iterations: 50, warmupIterations: 5 });
      expect(result.iterations).toBe(50);
      expect(result.avgTimeMs).toBeGreaterThan(0);
    });

    it('calculates percentiles', async () => {
      const result = await benchmarkFn('pct-test', () => Math.random(), { iterations: 1000, warmupIterations: 100 });
      expect(result.p95TimeMs).toBeGreaterThan(0);
      expect(result.p99TimeMs).toBeGreaterThanOrEqual(result.p95TimeMs);
      expect(result.medianTimeMs).toBeGreaterThan(0);
    });
  });

  describe('compareRustVsTs', () => {
    it('compares two functions', async () => {
      const result = await compareRustVsTs(
        'add',
        () => 1 + 2,
        () => 1 + 2,
        { iterations: 100, warmupIterations: 10 },
      );
      expect(result.rust.avgTimeMs).toBeGreaterThan(0);
      expect(result.typescript.avgTimeMs).toBeGreaterThan(0);
      expect(result.speedup).toBeGreaterThan(0);
      expect(['rust', 'typescript', 'tie']).toContain(result.winner);
    });
  });

  describe('formatBenchResult', () => {
    it('formats result as table row', () => {
      const result = {
        name: 'test.fn',
        iterations: 1000,
        totalTimeMs: 10,
        avgTimeMs: 0.01,
        minTimeMs: 0.005,
        maxTimeMs: 0.02,
        medianTimeMs: 0.01,
        p95TimeMs: 0.015,
        p99TimeMs: 0.02,
        opsPerSec: 100000,
        stdDevMs: 0.001,
      };
      const formatted = formatBenchResult(result);
      expect(formatted).toContain('test.fn');
      expect(formatted).toContain('ops/s');
    });
  });
});
