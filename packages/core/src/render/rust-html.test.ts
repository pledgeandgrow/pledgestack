import { describe, it, expect } from 'vitest';
import { isRustHtmlEngineAvailable, renderHead, renderHtmlShell, escapeHtml } from './rust-html';
import type { HeadMetadata } from '../router/types';

describe('rust-html', () => {
  describe('isRustHtmlEngineAvailable', () => {
    it('returns a boolean without throwing', () => {
      expect(typeof isRustHtmlEngineAvailable()).toBe('boolean');
    });

    it('returns false when native addon is not compiled', () => {
      expect(isRustHtmlEngineAvailable()).toBe(false);
    });
  });

  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('escapes ampersands', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('passes through safe content unchanged', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('escapes single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#x27;s');
    });
  });

  describe('renderHead', () => {
    it('renders basic head with title', () => {
      const metadata: HeadMetadata = { title: 'Test Page', description: 'A test page' };
      const result = renderHead(metadata);
      expect(result.html).toContain('<title>Test Page</title>');
      expect(result.html).toContain('name="description"');
      expect(result.html).toContain('A test page');
      expect(result.usedRustEngine).toBe(false);
    });

    it('renders Open Graph tags', () => {
      const metadata: HeadMetadata = {
        title: 'Test',
        openGraph: {
          title: 'OG Title',
          description: 'OG Desc',
          type: 'website',
          url: 'https://example.com',
          images: ['https://example.com/img1.jpg'],
        },
      };
      const result = renderHead(metadata);
      expect(result.html).toContain('og:title');
      expect(result.html).toContain('OG Title');
      expect(result.html).toContain('og:image');
      expect(result.html).toContain('https://example.com/img1.jpg');
    });

    it('renders Twitter Card tags', () => {
      const metadata: HeadMetadata = {
        title: 'Test',
        twitter: {
          card: 'summary_large_image',
          title: 'Twitter Title',
          description: 'Twitter Desc',
        },
      };
      const result = renderHead(metadata);
      expect(result.html).toContain('twitter:card');
      expect(result.html).toContain('summary_large_image');
      expect(result.html).toContain('twitter:title');
    });

    it('escapes HTML in title', () => {
      const metadata: HeadMetadata = { title: '<script>alert(1)</script>' };
      const result = renderHead(metadata);
      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).not.toContain('<script>alert');
    });

    it('renders canonical link', () => {
      const metadata: HeadMetadata = {
        title: 'Test',
        alternates: { canonical: 'https://example.com/page' },
      };
      const result = renderHead(metadata);
      expect(result.html).toContain('rel="canonical"');
      expect(result.html).toContain('https://example.com/page');
    });

    it('renders keywords', () => {
      const metadata: HeadMetadata = {
        title: 'Test',
        keywords: ['react', 'ssr', 'rust'],
      };
      const result = renderHead(metadata);
      expect(result.html).toContain('name="keywords"');
      expect(result.html).toContain('react');
      expect(result.html).toContain('rust');
    });
  });

  describe('renderHtmlShell', () => {
    it('renders complete HTML document', () => {
      const result = renderHtmlShell({
        content: '<div>Hello</div>',
        route: { filePath: '/', segments: [''] } as never,
        metadata: { title: 'Test' },
        lang: 'en',
      });
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html lang="en">');
      expect(result.html).toContain('<title>Test</title>');
      expect(result.html).toContain('<div id="__pledge_root__">');
      expect(result.html).toContain('Hello');
      expect(result.html).toContain('</body>');
      expect(result.html).toContain('</html>');
      expect(result.usedRustEngine).toBe(false);
    });

    it('includes CSS and JS resources', () => {
      const result = renderHtmlShell({
        content: '',
        route: { filePath: '/', segments: [''] } as never,
        cssFiles: ['/static/main.css'],
        jsModules: ['/static/client.js'],
      });
      expect(result.html).toContain('/static/main.css');
      expect(result.html).toContain('/static/client.js');
    });

    it('defaults to en when no lang specified', () => {
      const result = renderHtmlShell({
        content: '',
        route: { filePath: '/', segments: [''] } as never,
      });
      expect(result.html).toContain('lang="en"');
    });
  });
});
