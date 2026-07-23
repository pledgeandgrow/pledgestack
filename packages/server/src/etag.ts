/**
 * ETag generation — weak ETags for SSR pages and 304 Not Modified handling.
 *
 * Generates weak ETags from response bodies and handles conditional
 * requests via If-None-Match header.
 */

import { createHash } from 'node:crypto';

/**
 * Generate a weak ETag from a response body.
 * Uses a fast hash of the body content.
 */
export function generateETag(body: string | Uint8Array): string {
  const data = Buffer.from(body);
  const hash = createHash('sha1').update(data).digest('hex').slice(0, 16);
  return `W/"${hash}"`;
}

/**
 * Check if a request's If-None-Match header matches the given ETag.
 * Returns true if the client's cached version is still valid (304 response).
 */
export function isETagMatch(
  ifNoneMatch: string | undefined,
  etag: string,
): boolean {
  if (!ifNoneMatch) return false;

  // Handle comma-separated list of ETags
  const tags = ifNoneMatch.split(',').map((t) => t.trim());
  if (tags.includes('*')) return true;

  return tags.includes(etag);
}

/**
 * Generate ETag header for a response and handle 304 Not Modified.
 *
 * Returns either:
 * - A 304 response (if the client's ETag matches)
 * - The original response with an ETag header added
 */
export function handleETag(
  body: string | Uint8Array,
  headers: Record<string, string>,
  ifNoneMatch?: string,
): { status: number; headers: Record<string, string>; body: string | null } {
  const etag = generateETag(body);

  if (isETagMatch(ifNoneMatch, etag)) {
    return {
      status: 304,
      headers: { ETag: etag },
      body: null,
    };
  }

  return {
    status: 200,
    headers: { ...headers, ETag: etag },
    body: typeof body === 'string' ? body : new TextDecoder().decode(body),
  };
}
