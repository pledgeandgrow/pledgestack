import { describe, it, expect, beforeEach } from 'vitest';
import { PsxMemoryProfiler, getMemoryProfiler, formatMemoryReport } from './memory-profile';

describe('PSX Memory Profiling', () => {
  let profiler: PsxMemoryProfiler;

  beforeEach(() => {
    profiler = new PsxMemoryProfiler();
    profiler.start();
  });

  describe('recordAllocation', () => {
    it('tracks allocations per module', () => {
      profiler.recordAllocation('module1', 1024);
      profiler.recordAllocation('module1', 2048);
      const info = profiler.getModuleMemory('module1');
      expect(info?.allocatedBytes).toBe(3072);
      expect(info?.allocationCount).toBe(2);
    });

    it('tracks deallocations', () => {
      profiler.recordAllocation('module1', 1024);
      profiler.recordDeallocation('module1', 512);
      const info = profiler.getModuleMemory('module1');
      expect(info?.netBytes).toBe(512);
      expect(info?.deallocatedBytes).toBe(512);
    });

    it('tracks peak bytes', () => {
      profiler.recordAllocation('module1', 1024);
      profiler.recordAllocation('module1', 2048);
      profiler.recordDeallocation('module1', 1024);
      const info = profiler.getModuleMemory('module1');
      expect(info?.peakBytes).toBe(3072);
    });
  });

  describe('detectLeaks', () => {
    it('detects growing memory as potential leak', () => {
      // Simulate steady growth — need >1MB growth between first/last 10 samples
      for (let i = 0; i < 20; i++) {
        profiler.recordAllocation('leaky', 200_000);
      }
      const leaks = profiler.detectLeaks();
      const leakyModule = leaks.find(l => l.module === 'leaky');
      expect(leakyModule).toBeDefined();
      expect(leakyModule?.isLeaking).toBe(true);
    });

    it('reports stable memory as no leak', () => {
      profiler.recordAllocation('stable', 1024);
      profiler.recordDeallocation('stable', 1024);
      const leaks = profiler.detectLeaks();
      const stableModule = leaks.find(l => l.module === 'stable');
      // Not enough samples to detect
      expect(stableModule).toBeUndefined();
    });
  });

  describe('generateReport', () => {
    it('generates a report with all modules', () => {
      profiler.recordAllocation('mod1', 100);
      profiler.recordAllocation('mod2', 200);
      const report = profiler.generateReport();
      expect(report.modules.length).toBe(2);
      expect(report.totalAllocatedBytes).toBe(300);
    });
  });

  describe('formatMemoryReport', () => {
    it('formats report as string', () => {
      profiler.recordAllocation('mod1', 1024);
      const report = profiler.generateReport();
      const formatted = formatMemoryReport(report);
      expect(formatted).toContain('PSX Memory Profile');
      expect(formatted).toContain('mod1');
    });
  });
});
