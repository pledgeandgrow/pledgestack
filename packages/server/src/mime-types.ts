/**
 * MIME type sniffing prevention — ensures correct Content-Type headers
 * on all responses and static assets.
 *
 * Sets X-Content-Type-Options: nosniff on all responses and provides
 * a mapping of file extensions to their correct MIME types.
 */

/** MIME type map for common static asset extensions */
export const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.map': 'application/json',
};

/** Default MIME type for unknown extensions */
export const DEFAULT_MIME_TYPE = 'application/octet-stream';

/**
 * Get the correct MIME type for a file path.
 */
export function getMimeType(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return DEFAULT_MIME_TYPE;
  const ext = filePath.slice(lastDot).toLowerCase();
  return MIME_TYPES[ext] ?? DEFAULT_MIME_TYPE;
}

/**
 * MIME type sniffing prevention headers.
 * These should be applied to all responses.
 */
export const NOSNIFF_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Download-Options': 'noopen',
};

/**
 * Get headers for a static asset, including correct Content-Type and nosniff.
 */
export function staticAssetHeaders(filePath: string): Record<string, string> {
  return {
    'Content-Type': getMimeType(filePath),
    ...NOSNIFF_HEADERS,
  };
}

/**
 * Middleware to add nosniff headers to all responses.
 */
export function mimeTypeMiddleware() {
  return {
    name: 'pledgestack-mime-type',
    onResponse(headers: Record<string, string>): Record<string, string> {
      return {
        ...headers,
        ...NOSNIFF_HEADERS,
      };
    },
  };
}
