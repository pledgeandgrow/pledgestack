import { describe, it, expect } from 'vitest';
import { isRustHydrationGeneratorAvailable, generateHydrationScript, generateInlineHydrationScript } from './rust-hydration';

const mockRoute = { filePath: '/', segments: [''] } as never;
const mockManifest = { pledges: [] } as never;

describe('rust-hydration', () => {
  describe('isRustHydrationGeneratorAvailable', () => {
    it('returns a boolean without throwing', () => {
      expect(typeof isRustHydrationGeneratorAvailable()).toBe('boolean');
    });

    it('returns false when native addon is not compiled', () => {
      expect(isRustHydrationGeneratorAvailable()).toBe(false);
    });
  });

  describe('generateHydrationScript', () => {
    it('generates a full hydration script', () => {
      const result = generateHydrationScript({
        html: '<div id="__pledge_root__"><p>Hello</p></div>',
        route: mockRoute,
        manifest: mockManifest,
        mode: 'full',
      });
      expect(result.script).toBeTruthy();
      expect(result.usedRustGenerator).toBe(false);
      expect(result.sizeBytes).toBeGreaterThan(0);
    });

    it('generates a minimal hydration script', () => {
      const result = generateHydrationScript({
        html: '<div data-pledge-component="Counter"><button>Click</button></div>',
        route: mockRoute,
        manifest: mockManifest,
        mode: 'minimal',
      });
      expect(result.script).toBeTruthy();
      expect(result.script).toContain('addEventListener');
    });

    it('generates a progressive hydration script', () => {
      const result = generateHydrationScript({
        html: '<div id="__pledge_root__"><div data-pledge-component="Counter">0</div></div>',
        route: mockRoute,
        manifest: mockManifest,
        mode: 'progressive',
      });
      expect(result.script).toBeTruthy();
    });

    it('finds hydration points in HTML', () => {
      const result = generateHydrationScript({
        html: '<div data-pledge-component="Counter"><button>Click</button></div>',
        route: mockRoute,
        manifest: mockManifest,
        mode: 'full',
      });
      expect(result.hydrationPoints).toBeGreaterThan(0);
    });

    it('finds required chunks', () => {
      const result = generateHydrationScript({
        html: '<div data-pledge-chunk="/chunks/counter.js">Counter</div>',
        route: mockRoute,
        manifest: mockManifest,
        mode: 'full',
      });
      expect(result.requiredChunks).toContain('/chunks/counter.js');
    });
  });

  describe('generateInlineHydrationScript', () => {
    it('wraps script in a script tag', () => {
      const html = generateInlineHydrationScript({
        html: '<div id="__pledge_root__"></div>',
        route: mockRoute,
        manifest: mockManifest,
        mode: 'full',
      });
      expect(html).toContain('<script');
      expect(html).toContain('</script>');
    });
  });
});
