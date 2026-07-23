import { describe, it, expect } from 'vitest';
import { EdgeSsrRenderer, PprCache, measureTtfb } from './edge-streaming-ssr';

describe('Edge Streaming SSR (#274)', () => {
  describe('EdgeSsrRenderer', () => {
    it('renders static shell with dynamic holes', async () => {
      const renderer = new EdgeSsrRenderer();
      const result = await renderer.render(
        '<div><!--HOLE_USER--></div>',
        [{
          id: 'user',
          placeholder: '<!--HOLE_USER-->',
          fetcher: async () => '<span>Alice</span>',
        }],
      );
      expect(result.html).toContain('Alice');
      expect(result.holes).toBe(1);
      expect(result.ttfbMs).toBeGreaterThanOrEqual(0);
    });

    it('uses fallback on fetch error', async () => {
      const renderer = new EdgeSsrRenderer();
      const result = await renderer.render(
        '<div><!--HOLE--></div>',
        [{
          id: 'err',
          placeholder: '<!--HOLE-->',
          fetcher: async () => { throw new Error('fail'); },
          fallback: '<span>Loading...</span>',
        }],
      );
      expect(result.html).toContain('Loading...');
    });

    it('respects maxDynamicHoles limit', async () => {
      const renderer = new EdgeSsrRenderer({ maxDynamicHoles: 2 });
      const result = await renderer.render(
        '<div><!--A--><!--B--><!--C--></div>',
        [
          { id: 'a', placeholder: '<!--A-->', fetcher: async () => 'A' },
          { id: 'b', placeholder: '<!--B-->', fetcher: async () => 'B' },
          { id: 'c', placeholder: '<!--C-->', fetcher: async () => 'C' },
        ],
      );
      expect(result.holes).toBe(2);
    });
  });

  describe('PprCache', () => {
    it('caches and retrieves entries', () => {
      const cache = new PprCache(60);
      cache.set('key1', '<html>cached</html>');
      const entry = cache.get('key1');
      expect(entry?.html).toBe('<html>cached</html>');
    });

    it('returns null for missing entries', () => {
      const cache = new PprCache();
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('invalidates entries', () => {
      const cache = new PprCache();
      cache.set('key1', 'html');
      cache.invalidate('key1');
      expect(cache.get('key1')).toBeNull();
    });

    it('respects TTL', async () => {
      const cache = new PprCache(1);
      cache.set('key1', 'html', undefined, 1);
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(cache.get('key1')).toBeNull();
    });

    it('tracks cache size', () => {
      const cache = new PprCache();
      cache.set('a', '1');
      cache.set('b', '2');
      expect(cache.size()).toBe(2);
    });
  });

  describe('measureTtfb', () => {
    it('measures time since start', () => {
      const start = Date.now();
      const ttfb = measureTtfb(start);
      expect(ttfb).toBeGreaterThanOrEqual(0);
    });
  });
});
