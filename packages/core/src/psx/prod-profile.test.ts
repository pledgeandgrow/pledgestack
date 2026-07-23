import { describe, it, expect, beforeEach } from 'vitest';
import { PsxProductionProfiler, formatProfileReport } from './prod-profile';

describe('PSX Production Profiling', () => {
  let profiler: PsxProductionProfiler;

  beforeEach(() => {
    profiler = new PsxProductionProfiler({ enabled: true });
    profiler.start();
  });

  describe('recordCall', () => {
    it('tracks function calls', () => {
      profiler.recordCall('add', 'math', 0.5);
      profiler.recordCall('add', 'math', 0.3);
      const profile = profiler.getFunctionProfile('math', 'add');
      expect(profile?.callCount).toBe(2);
      expect(profile?.avgExecutionTimeMs).toBeCloseTo(0.4, 1);
    });

    it('tracks errors', () => {
      profiler.recordCall('failing', 'module', 1.0, { error: true });
      const profile = profiler.getFunctionProfile('module', 'failing');
      expect(profile?.errorCount).toBe(1);
      expect(profile?.errorRate).toBe(1);
    });

    it('tracks memory allocations', () => {
      profiler.recordCall('alloc', 'module', 0.1, { allocatedBytes: 1024 });
      profiler.recordCall('alloc', 'module', 0.1, { deallocatedBytes: 512 });
      const profile = profiler.getFunctionProfile('module', 'alloc');
      expect(profile?.allocatedBytes).toBe(1024);
      expect(profile?.deallocatedBytes).toBe(512);
      expect(profile?.netBytes).toBe(512);
    });

    it('marks slow functions', () => {
      profiler.recordCall('slow', 'module', 150);
      const profile = profiler.getFunctionProfile('module', 'slow');
      expect(profile?.isSlow).toBe(true);
    });

    it('respects sampling rate', () => {
      const sampled = new PsxProductionProfiler({ enabled: true, sampleRate: 0 });
      sampled.start();
      sampled.recordCall('test', 'mod', 1);
      expect(sampled.getFunctionProfile('mod', 'test')).toBeUndefined();
    });
  });

  describe('profile wrapper', () => {
    it('wraps a function with profiling', async () => {
      const fn = profiler.profile(() => 42, 'test', 'mod');
      const result = await fn();
      expect(result).toBe(42);
      const profile = profiler.getFunctionProfile('mod', 'test');
      expect(profile?.callCount).toBe(1);
    });
  });

  describe('generateReport', () => {
    it('generates a report', () => {
      profiler.recordCall('fn1', 'mod1', 1);
      profiler.recordCall('fn2', 'mod2', 2);
      const report = profiler.generateReport();
      expect(report.functions.length).toBe(2);
      expect(report.totalCalls).toBe(2);
    });
  });

  describe('formatProfileReport', () => {
    it('formats report', () => {
      profiler.recordCall('fn1', 'mod1', 1);
      const report = profiler.generateReport();
      const formatted = formatProfileReport(report);
      expect(formatted).toContain('PSX Production Profile');
      expect(formatted).toContain('mod1.fn1');
    });
  });
});
