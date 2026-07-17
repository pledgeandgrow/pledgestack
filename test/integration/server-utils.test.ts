/**
 * Integration tests — server utilities (cookies, headers, params).
 * Item 68 of the PledgeStack roadmap.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setRequestContext, cookies, headers, searchParams } from '../../packages/server/src/server-utils';

describe('Server utilities', () => {
  beforeEach(() => {
    setRequestContext({
      url: new URL('http://localhost:3000/blog/hello?ref=google'),
      method: 'GET',
      headers: { 'content-type': 'application/json', 'x-custom': 'value' },
      params: { slug: 'hello' },
      query: { ref: 'google' },
      cookies: { session: 'abc123', theme: 'dark' },
    });
  });

  it('reads cookies from request context', () => {
    const c = cookies();
    expect(c.session).toBe('abc123');
    expect(c.theme).toBe('dark');
  });

  it('reads headers from request context', () => {
    const h = headers();
    expect(h['content-type']).toBe('application/json');
    expect(h['x-custom']).toBe('value');
  });

  it('reads search params from request context', () => {
    const sp = searchParams();
    expect(sp.ref).toBe('google');
  });

  it('mutates response cookies', () => {
    cookies((jar) => {
      jar.set('newCookie', 'value', { httpOnly: true });
    });
    const c = cookies();
    // Original cookies are unchanged for reading
    expect(c.session).toBe('abc123');
  });

  it('mutates response headers', () => {
    headers((store) => {
      store.set('X-Response', 'custom-value');
    });
    const h = headers();
    // Original headers are unchanged for reading
    expect(h['content-type']).toBe('application/json');
  });
});
