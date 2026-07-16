import { describe, it, expect, beforeEach } from 'vitest';
import { cachedFetch, revalidateTag, revalidatePath, clearCache, getCacheStats, unstable_cache } from '../fetch-cache';

describe('fetch-cache', () => {
  beforeEach(() => {
    clearCache();
  });

  it('caches responses with TTL', async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = (async () => {
      callCount++;
      return new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof globalThis.fetch;

    const opts = { next: { revalidate: 60 } } as RequestInit & { next: { revalidate: number } };
    await cachedFetch('https://api.example.com/data', opts);
    await cachedFetch('https://api.example.com/data', opts);
    expect(callCount).toBe(1);

    globalThis.fetch = originalFetch;
  });

  it('bypasses cache when revalidate is 0', async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = (async () => {
      callCount++;
      return new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof globalThis.fetch;

    const opts = { next: { revalidate: 0 } } as RequestInit & { next: { revalidate: number } };
    await cachedFetch('https://api.example.com/data', opts);
    await cachedFetch('https://api.example.com/data', opts);
    expect(callCount).toBe(2);

    globalThis.fetch = originalFetch;
  });

  it('revalidateTag clears entries by tag', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof globalThis.fetch;

    const opts = { next: { revalidate: 60, tags: ['posts'] } } as RequestInit & { next: { revalidate: number; tags: string[] } };
    await cachedFetch('https://api.example.com/posts', opts);
    revalidateTag('posts');
    const stats = getCacheStats();
    expect(stats.size).toBe(0);

    globalThis.fetch = originalFetch;
  });

  it('revalidatePath clears specific path', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof globalThis.fetch;

    const opts = { next: { revalidate: 60 } } as RequestInit & { next: { revalidate: number } };
    await cachedFetch('https://api.example.com/data', opts);
    revalidatePath('https://api.example.com/data');
    const stats = getCacheStats();
    expect(stats.size).toBe(0);

    globalThis.fetch = originalFetch;
  });

  it('unstable_cache deduplicates calls', async () => {
    let callCount = 0;
    const fn = unstable_cache(
      async (id: string) => {
        callCount++;
        return { id, data: 'test' };
      },
      ['getItem'],
      { revalidate: 60 },
    );

    await fn('123');
    await fn('123');
    expect(callCount).toBe(1);
  });
});
