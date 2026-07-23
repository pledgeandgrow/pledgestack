import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import React from 'react';
import {
  isRustDomRendererAvailable,
  renderRustDomToString,
  canRenderInRust,
  renderSimpleHtml,
  markRustSafe,
  chunksToReadableStream,
} from './rust-dom-renderer';

describe('rust-dom-renderer', () => {
  describe('isRustDomRendererAvailable', () => {
    it('returns a boolean without throwing', () => {
      expect(typeof isRustDomRendererAvailable()).toBe('boolean');
    });

    it('returns false when native addon is not compiled', () => {
      expect(isRustDomRendererAvailable()).toBe(false);
    });
  });

  describe('canRenderInRust', () => {
    it('returns true for null/undefined', () => {
      expect(canRenderInRust(null)).toBe(true);
      expect(canRenderInRust(undefined)).toBe(true);
    });

    it('returns true for strings and numbers', () => {
      expect(canRenderInRust('hello')).toBe(true);
      expect(canRenderInRust(42)).toBe(true);
    });

    it('returns true for booleans', () => {
      expect(canRenderInRust(true)).toBe(true);
      expect(canRenderInRust(false)).toBe(true);
    });

    it('returns true for simple element objects', () => {
      const el = React.createElement('div', null, 'Hello') as unknown as ReactNode;
      expect(canRenderInRust(el)).toBe(true);
    });
  });

  describe('markRustSafe', () => {
    it('marks a component as rust-safe', () => {
      const Component = () => null;
      const marked = markRustSafe(Component);
      expect((marked as unknown as { __pledge_rust_safe: boolean }).__pledge_rust_safe).toBe(true);
    });
  });

  describe('renderSimpleHtml', () => {
    it('renders null as empty string', () => {
      expect(renderSimpleHtml(null)).toBe('');
    });

    it('renders strings with escaping', () => {
      expect(renderSimpleHtml('Hello & World')).toBe('Hello &amp; World');
    });

    it('renders numbers', () => {
      expect(renderSimpleHtml(42)).toBe('42');
    });

    it('renders simple div with text child', () => {
      const el = React.createElement('div', null, 'Hello');
      const html = renderSimpleHtml(el);
      expect(html).toContain('<div');
      expect(html).toContain('Hello');
      expect(html).toContain('</div>');
    });

    it('renders void elements without closing tag', () => {
      const el = React.createElement('br');
      const html = renderSimpleHtml(el);
      expect(html).toContain('<br');
      expect(html).not.toContain('</br>');
    });

    it('renders nested elements', () => {
      const el = React.createElement('ul', null,
        React.createElement('li', null, 'Item 1'),
        React.createElement('li', null, 'Item 2'),
      );
      const html = renderSimpleHtml(el);
      expect(html).toContain('<ul>');
      expect(html).toContain('Item 1');
      expect(html).toContain('Item 2');
      expect(html).toContain('</ul>');
    });
  });

  describe('renderRustDomToString', () => {
    it('renders a simple element and reports JS fallback', () => {
      const el = React.createElement('div', null, 'Test');
      const result = renderRustDomToString(el);
      expect(result.html).toContain('<div');
      expect(result.html).toContain('Test');
      expect(result.usedRust).toBe(false);
      expect(result.renderTimeUs).toBeGreaterThan(0);
    });
  });

  describe('chunksToReadableStream', () => {
    it('creates a readable stream from chunks', () => {
      const stream = chunksToReadableStream(['<div>', 'Hello', '</div>']);
      expect(stream).toBeInstanceOf(ReadableStream);
    });
  });
});
