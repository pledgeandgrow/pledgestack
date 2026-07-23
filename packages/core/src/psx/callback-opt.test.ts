import { describe, it, expect } from 'vitest';
import { BatchedCallbackQueue, DebouncedCallback, ThrottledCallback, CallbackRegistry } from './callback-opt';

describe('Callback Optimization', () => {
  describe('BatchedCallbackQueue', () => {
    it('batches items and flushes', async () => {
      const received: number[] = [];
      const queue = new BatchedCallbackQueue<number>((items) => {
        received.push(...items);
      }, { maxBatchSize: 10, maxBatchDelayMs: 50, useMicrotasks: false });

      queue.push(1);
      queue.push(2);
      queue.push(3);
      await queue.flush();

      expect(received).toEqual([1, 2, 3]);
    });

    it('auto-flushes when batch is full', async () => {
      const received: number[] = [];
      const queue = new BatchedCallbackQueue<number>((items) => {
        received.push(...items);
      }, { maxBatchSize: 3, maxBatchDelayMs: 1000, useMicrotasks: false });

      queue.push(1);
      queue.push(2);
      queue.push(3); // triggers auto-flush

      await new Promise(r => setTimeout(r, 50));
      expect(received).toEqual([1, 2, 3]);
    });

    it('tracks stats', async () => {
      const queue = new BatchedCallbackQueue<number>(() => {}, { maxBatchSize: 100, useMicrotasks: false });
      queue.push(1);
      queue.push(2);
      await queue.flush();

      const stats = queue.getStats();
      expect(stats.totalProcessed).toBe(2);
      expect(stats.totalBatches).toBe(1);
    });
  });

  describe('DebouncedCallback', () => {
    it('debounces calls', async () => {
      let value = 0;
      const debounced = new DebouncedCallback<number>((v) => { value = v; }, 50);

      debounced.call(1);
      debounced.call(2);
      debounced.call(3);

      await new Promise(r => setTimeout(r, 100));
      expect(value).toBe(3);
    });
  });

  describe('ThrottledCallback', () => {
    it('throttles calls', async () => {
      let callCount = 0;
      const throttled = new ThrottledCallback<number>(() => { callCount++; }, 50);

      throttled.call(1);
      throttled.call(2);
      throttled.call(3);

      expect(callCount).toBe(1); // Only first call goes through immediately
    });
  });

  describe('CallbackRegistry', () => {
    it('registers and retrieves callbacks', () => {
      const registry = new CallbackRegistry();
      const queue = registry.registerBatched<number>('test', () => {});
      expect(registry.get('test')).toBe(queue);
    });
  });
});
