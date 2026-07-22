/**
 * Client-side mutation and revalidation API.
 *
 * Provides functions for client components to trigger server-side cache
 * revalidation and data mutations. These call dedicated PledgeStack
 * server endpoints that handle cache invalidation.
 *
 * Usage:
 *   import { revalidate, revalidateTag, revalidatePath, mutate } from 'pledgestack/client';
 *
 *   // After a form submission
 *   await revalidateTag('posts');
 *   await revalidatePath('/blog');
 *
 *   // Direct mutation with automatic revalidation
 *   const result = await mutate('/api/posts', { method: 'POST', body: JSON.stringify(data) });
 */

export interface RevalidateOptions {
  /** Whether to also revalidate on other server instances (distributed) */
  distributed?: boolean;
}

export interface MutateOptions extends RequestInit {
  /** Tags to revalidate after successful mutation */
  revalidateTags?: string[];
  /** Paths to revalidate after successful mutation */
  revalidatePaths?: string[];
}

/**
 * Revalidates all cache entries with the given tag on the server.
 */
export async function revalidateTag(tag: string, options: RevalidateOptions = {}): Promise<void> {
  await fetch('/__pledge__/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'tag', target: tag, distributed: options.distributed ?? true }),
  });
}

/**
 * Revalidates cache entries for a specific path on the server.
 */
export async function revalidatePath(path: string, options: RevalidateOptions = {}): Promise<void> {
  await fetch('/__pledge__/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'path', target: path, distributed: options.distributed ?? true }),
  });
}

/**
 * Combined revalidation — invalidates both tags and paths in one call.
 */
export async function revalidate(
  targets: { tags?: string[]; paths?: string[] },
  options: RevalidateOptions = {},
): Promise<void> {
  await fetch('/__pledge__/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'batch',
      tags: targets.tags ?? [],
      paths: targets.paths ?? [],
      distributed: options.distributed ?? true,
    }),
  });
}

/**
 * Performs a mutation (POST/PUT/DELETE) and automatically triggers
 * cache revalidation for specified tags and paths.
 *
 * Usage:
 *   const result = await mutate('/api/posts', {
 *     method: 'POST',
 *     body: JSON.stringify({ title: 'New Post' }),
 *     revalidateTags: ['posts'],
 *     revalidatePaths: ['/blog'],
 *   });
 */
export async function mutate<T = unknown>(url: string, options: MutateOptions = {}): Promise<T> {
  const { revalidateTags, revalidatePaths, ...fetchOptions } = options;

  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    throw new Error(`Mutation failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as T;

  // Trigger revalidation after successful mutation
  if (revalidateTags || revalidatePaths) {
    await revalidate({
      tags: revalidateTags,
      paths: revalidatePaths,
    });
  }

  return data;
}

/**
 * Prefetches and caches a URL on the client.
 * Useful for preloading data before navigation.
 */
export async function prefetch(url: string): Promise<void> {
  await fetch(url, {
    headers: { 'X-Pledge-Prefetch': '1' },
  });
}
