import { describe, it, expect } from 'vitest';
import { isRustProfilerAvailable, startProfiling, stopProfiling, recordRenderStart, recordRenderEnd, type SSRProfileResult } from './rust-ssr-profiler';

describe('rust-ssr-profiler', () => {
  describe('isRustProfilerAvailable', () => {
    it('returns a boolean without throwing', () => {
      expect(typeof isRustProfilerAvailable()).toBe('boolean');
    });
  });

  describe('profiling lifecycle', () => {
    it('starts and stops profiling without throwing', () => {
      startProfiling();
      const result = stopProfiling();
      expect(result).toBeDefined();
      expect(result.totalTimeUs).toBeGreaterThanOrEqual(0);
    });

    it('records component render timings', () => {
      startProfiling();
      recordRenderStart('MyComponent', 'rust', '{count: 5}');
      for (let i = 0; i < 1000; i++) { /* busy wait */ }
      recordRenderEnd();
      const result = stopProfiling();
      expect(result.frames).toHaveLength(1);
      expect(result.frames[0].name).toBe('MyComponent');
      expect(result.frames[0].durationUs).toBeGreaterThan(0);
      expect(result.frames[0].renderer).toBe('rust');
    });

    it('nests child components under parents', () => {
      startProfiling();
      recordRenderStart('Parent', 'rust');
      recordRenderStart('Child', 'react');
      recordRenderEnd();
      recordRenderEnd();
      const result = stopProfiling();
      expect(result.frames).toHaveLength(1);
      expect(result.frames[0].name).toBe('Parent');
      expect(result.frames[0].children).toHaveLength(1);
      expect(result.frames[0].children[0].name).toBe('Child');
    });

    it('aggregates component timings', () => {
      startProfiling();
      recordRenderStart('Component', 'rust');
      recordRenderEnd();
      recordRenderStart('Component', 'rust');
      recordRenderEnd();
      const result = stopProfiling();
      const timing = result.aggregated.find(t => t.name === 'Component');
      expect(timing).toBeDefined();
      expect(timing!.renderCount).toBe(2);
    });
  });
});
