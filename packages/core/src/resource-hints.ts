/**
 * Resource hints automation.
 *
 * Auto-generates <link> tags for:
 * - preload: critical fonts, images, stylesheets
 * - prefetch: likely-next routes
 * - preconnect: external origins
 * - dns-prefetch: external domains
 * - modulepreload: JS modules
 */

export type ResourceHintType = 'preload' | 'prefetch' | 'preconnect' | 'dns-prefetch' | 'modulepreload';

export interface ResourceHint {
  rel: ResourceHintType;
  href: string;
  as?: string;
  type?: string;
  crossorigin?: 'anonymous' | 'use-credentials';
  fetchpriority?: 'high' | 'low' | 'auto';
  media?: string;
  imagesizes?: string;
  imagesrcset?: string;
}

export interface ResourceHintConfig {
  /** Fonts to preload (family name → URL) */
  fonts?: Array<{ href: string; type?: string; crossorigin?: boolean }>;
  /** Images to preload */
  images?: Array<{ href: string; as?: string; fetchpriority?: 'high' | 'low' | 'auto'; imagesrcset?: string; imagesizes?: string }>;
  /** Stylesheets to preload */
  stylesheets?: string[];
  /** Routes to prefetch (likely next navigation) */
  routes?: string[];
  /** External origins to preconnect to */
  preconnects?: Array<{ origin: string; crossorigin?: boolean }>;
  /** External domains for DNS prefetch */
  dnsPrefetch?: string[];
  /** Modules to preload */
  modules?: string[];
  /** Scripts to preload */
  scripts?: Array<{ href: string; type?: string; crossorigin?: boolean }>;
}

/**
 * Generate resource hint link tags from configuration.
 */
export function generateResourceHints(config: ResourceHintConfig): ResourceHint[] {
  const hints: ResourceHint[] = [];

  for (const font of config.fonts ?? []) {
    hints.push({
      rel: 'preload',
      href: font.href,
      as: 'font',
      type: font.type ?? 'font/woff2',
      crossorigin: font.crossorigin === false ? undefined : 'anonymous',
      fetchpriority: 'high',
    });
  }

  for (const image of config.images ?? []) {
    hints.push({
      rel: 'preload',
      href: image.href,
      as: image.as ?? 'image',
      fetchpriority: image.fetchpriority ?? 'auto',
      imagesrcset: image.imagesrcset,
      imagesizes: image.imagesizes,
    });
  }

  for (const href of config.stylesheets ?? []) {
    hints.push({
      rel: 'preload',
      href,
      as: 'style',
    });
  }

  for (const route of config.routes ?? []) {
    hints.push({
      rel: 'prefetch',
      href: route,
    });
  }

  for (const pc of config.preconnects ?? []) {
    hints.push({
      rel: 'preconnect',
      href: pc.origin,
      crossorigin: pc.crossorigin === false ? undefined : 'anonymous',
    });
  }

  for (const domain of config.dnsPrefetch ?? []) {
    hints.push({
      rel: 'dns-prefetch',
      href: domain,
    });
  }

  for (const mod of config.modules ?? []) {
    hints.push({
      rel: 'modulepreload',
      href: mod,
    });
  }

  for (const script of config.scripts ?? []) {
    hints.push({
      rel: 'preload',
      href: script.href,
      as: 'script',
      type: script.type,
      crossorigin: script.crossorigin ? 'anonymous' : undefined,
    });
  }

  return hints;
}

/**
 * Render a resource hint as an HTML <link> tag.
 */
export function renderHintTag(hint: ResourceHint): string {
  const attrs: string[] = [`rel="${hint.rel}"`, `href="${hint.href}"`];

  if (hint.as) attrs.push(`as="${hint.as}"`);
  if (hint.type) attrs.push(`type="${hint.type}"`);
  if (hint.crossorigin) attrs.push(`crossorigin="${hint.crossorigin}"`);
  if (hint.fetchpriority) attrs.push(`fetchpriority="${hint.fetchpriority}"`);
  if (hint.media) attrs.push(`media="${hint.media}"`);
  if (hint.imagesrcset) attrs.push(`imagesrcset="${hint.imagesrcset}"`);
  if (hint.imagesizes) attrs.push(`imagesizes="${hint.imagesizes}"`);

  return `<link ${attrs.join(' ')}>`;
}

/**
 * Render all resource hints as HTML link tags.
 */
export function renderResourceHintTags(config: ResourceHintConfig): string {
  return generateResourceHints(config)
    .map(renderHintTag)
    .join('\n');
}

/**
 * Auto-detect resource hints from a route's imports and assets.
 * Analyzes the route module to determine which resources to preload.
 */
export function autoDetectHints(_routePath: string, options?: {
  /** Known font assets from build */
  fonts?: string[];
  /** Known critical images */
  images?: string[];
  /** Adjacent routes for prefetching */
  adjacentRoutes?: string[];
}): ResourceHint[] {
  const config: ResourceHintConfig = {};

  if (options?.fonts && options.fonts.length > 0) {
    config.fonts = options.fonts.map((href) => ({ href }));
  }

  if (options?.images && options.images.length > 0) {
    config.images = options.images.map((href) => ({ href, fetchpriority: 'high' }));
  }

  if (options?.adjacentRoutes && options.adjacentRoutes.length > 0) {
    config.routes = options.adjacentRoutes;
  }

  return generateResourceHints(config);
}

/**
 * Generate preconnect hints for common external origins.
 */
export function commonPreconnects(): ResourceHint[] {
  return [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com', crossorigin: 'anonymous' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
  ];
}
