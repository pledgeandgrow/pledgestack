import { describe, it, expect } from 'vitest';
import { generateSecurityHeaders, clickjackingHeaders, DEFAULT_SECURITY_HEADERS } from './security-headers';

describe('security-headers', () => {
  it('generates default security headers', () => {
    const headers = generateSecurityHeaders();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });

  it('includes HSTS by default', () => {
    const headers = generateSecurityHeaders();
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
    expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
    expect(headers['Strict-Transport-Security']).toContain('preload');
  });

  it('disables HSTS when option is false', () => {
    const headers = generateSecurityHeaders({ hsts: false });
    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });

  it('supports SAMEORIGIN frame options', () => {
    const headers = generateSecurityHeaders({ frameOptions: 'SAMEORIGIN' });
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
  });

  it('generates clickjacking deny headers', () => {
    const headers = clickjackingHeaders('deny');
    expect(headers['X-Frame-Options']).toBe('DENY');
  });

  it('generates clickjacking sameorigin headers', () => {
    const headers = clickjackingHeaders('sameorigin');
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
  });

  it('includes default security headers constant', () => {
    expect(DEFAULT_SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(DEFAULT_SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
  });

  it('generates permissions policy', () => {
    const headers = generateSecurityHeaders();
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['Permissions-Policy']).toContain('microphone=()');
  });
});
