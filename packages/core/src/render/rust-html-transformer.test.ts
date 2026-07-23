import { describe, it, expect } from 'vitest';
import { isRustHtmlTransformerAvailable, transformHtml } from './rust-html-transformer';

describe('rust-html-transformer', () => {
  describe('isRustHtmlTransformerAvailable', () => {
    it('returns a boolean without throwing', () => {
      expect(typeof isRustHtmlTransformerAvailable()).toBe('boolean');
    });

    it('returns false when native addon is not compiled', () => {
      expect(isRustHtmlTransformerAvailable()).toBe(false);
    });
  });

  describe('transformHtml', () => {
    it('injects head content before </head>', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>';
      const result = transformHtml(html, {
        headInjections: '<meta name="injected" content="yes">',
      });
      expect(result).toContain('<meta name="injected" content="yes">');
      expect(result).toContain('</head>');
      // Injection should be before </head>
      const injectIdx = result.indexOf('injected');
      const headCloseIdx = result.indexOf('</head>');
      expect(injectIdx).toBeLessThan(headCloseIdx);
    });

    it('injects RSC bootstrap before </body>', () => {
      const html = '<html><head></head><body><div id="root"></div></body></html>';
      const result = transformHtml(html, {
        rscBootstrapData: '<script>window.__RSC_DATA__={}</script>',
      });
      expect(result).toContain('__RSC_DATA__');
      const dataIdx = result.indexOf('__RSC_DATA__');
      const bodyCloseIdx = result.indexOf('</body>');
      expect(dataIdx).toBeLessThan(bodyCloseIdx);
    });

    it('injects CSS links', () => {
      const html = '<html><head></head><body></body></html>';
      const result = transformHtml(html, {
        cssInjections: ['<link rel="stylesheet" href="/style.css">'],
      });
      expect(result).toContain('/style.css');
    });

    it('injects preload hints', () => {
      const html = '<html><head></head><body></body></html>';
      const result = transformHtml(html, {
        preloadInjections: ['<link rel="preload" href="/font.woff2" as="font">'],
      });
      expect(result).toContain('preload');
      expect(result).toContain('/font.woff2');
    });

    it('passes through content without injections unchanged', () => {
      const html = '<html><head><title>Test</title></head><body><p>Hello</p></body></html>';
      const result = transformHtml(html, {});
      expect(result).toContain('<title>Test</title>');
      expect(result).toContain('<p>Hello</p>');
    });

    it('handles missing head tag gracefully', () => {
      const html = '<html><body><p>No head</p></body></html>';
      const result = transformHtml(html, {
        headInjections: '<meta name="test" content="yes">',
      });
      // Should not throw, should still contain the body
      expect(result).toContain('No head');
    });
  });
});
