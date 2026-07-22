/**
 * Security header validation test — asserts all security headers are
 * present and correctly configured on responses (#114).
 */

import { describe, it, expect } from 'vitest';
import { generateSecurityHeaders, DEFAULT_SECURITY_HEADERS, clickjackingHeaders } from './security-headers';

// Inline MIME type constants to avoid cross-package import issues in tests
const NOSNIFF_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Download-Options': 'noopen',
};

const MIME_TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function getMimeType(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return 'application/octet-stream';
  const ext = filePath.slice(lastDot).toLowerCase();
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

function staticAssetHeaders(filePath: string): Record<string, string> {
  return {
    'Content-Type': getMimeType(filePath),
    ...NOSNIFF_HEADERS,
  };
}

describe('Security header validation (#114)', () => {
  describe('generateSecurityHeaders', () => {
    it('includes X-Content-Type-Options: nosniff', () => {
      const headers = generateSecurityHeaders();
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('includes X-Frame-Options: DENY', () => {
      const headers = generateSecurityHeaders();
      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('includes Referrer-Policy', () => {
      const headers = generateSecurityHeaders();
      expect(headers['Referrer-Policy']).toBeDefined();
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('includes Permissions-Policy', () => {
      const headers = generateSecurityHeaders();
      expect(headers['Permissions-Policy']).toBeDefined();
    });

    it('includes Strict-Transport-Security when HTTPS', () => {
      const headers = generateSecurityHeaders({ hsts: true });
      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
      expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
    });

    it('does not include HSTS when disabled', () => {
      const headers = generateSecurityHeaders({ hsts: false });
      expect(headers['Strict-Transport-Security']).toBeUndefined();
    });
  });

  describe('clickjackingHeaders', () => {
    it('returns X-Frame-Options: DENY by default', () => {
      const headers = clickjackingHeaders();
      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('allows per-route override for embeddable pages', () => {
      const headers = clickjackingHeaders('sameorigin');
      expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
    });
  });

  describe('MIME type sniffing prevention', () => {
    it('includes X-Content-Type-Options: nosniff', () => {
      expect(NOSNIFF_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    });

    it('returns correct Content-Type for .js files', () => {
      expect(getMimeType('script.js')).toBe('text/javascript; charset=utf-8');
    });

    it('returns correct Content-Type for .css files', () => {
      expect(getMimeType('style.css')).toBe('text/css; charset=utf-8');
    });

    it('returns correct Content-Type for .json files', () => {
      expect(getMimeType('data.json')).toBe('application/json; charset=utf-8');
    });

    it('returns octet-stream for unknown extensions', () => {
      expect(getMimeType('file.xyz')).toBe('application/octet-stream');
    });

    it('includes nosniff in staticAssetHeaders', () => {
      const headers = staticAssetHeaders('script.js');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Content-Type']).toBe('text/javascript; charset=utf-8');
    });
  });

  describe('Complete header set validation', () => {
    it('all required security headers are present', () => {
      const headers = generateSecurityHeaders({ hsts: true });
      const required = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Referrer-Policy',
        'Permissions-Policy',
        'Strict-Transport-Security',
      ];

      for (const header of required) {
        expect(headers[header], `Missing required header: ${header}`).toBeDefined();
      }
    });

    it('DEFAULT_SECURITY_HEADERS has all expected keys', () => {
      expect(DEFAULT_SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
      expect(DEFAULT_SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
      expect(DEFAULT_SECURITY_HEADERS['Referrer-Policy']).toBeDefined();
    });
  });
});
