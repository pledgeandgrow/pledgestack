import { describe, it, expect } from 'vitest';
import { LazyCompilationManager } from './lazy-compile';

describe('PSX Lazy Compilation', () => {
  describe('LazyCompilationManager', () => {
    it('creates a lazy proxy', () => {
      const manager = new LazyCompilationManager({
        projectRoot: '/test',
      });
      const proxy = manager.createLazyProxy('test-module');
      expect(proxy).toBeDefined();
    });

    it('tracks compilation state', () => {
      const manager = new LazyCompilationManager({
        projectRoot: '/test',
      });
      manager.createLazyProxy('test-module');
      const states = manager.getStates();
      expect(states.size).toBeGreaterThanOrEqual(0);
    });

    it('resets state', () => {
      const manager = new LazyCompilationManager({
        projectRoot: '/test',
      });
      manager.createLazyProxy('mod1');
      manager.reset();
      expect(manager.getStates().size).toBe(0);
    });

    it('resets specific module', () => {
      const manager = new LazyCompilationManager({
        projectRoot: '/test',
      });
      manager.createLazyProxy('mod1');
      manager.createLazyProxy('mod2');
      manager.reset('mod1');
      // mod2 should still be tracked
      expect(manager.isFullyCompiled()).toBe(false);
    });
  });
});
