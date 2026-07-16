/**
 * Font optimization for PledgeStack.
 *
 * PledgePack handles actual font subsetting and optimization in its asset pipeline.
 * This package provides the component and config interface that generates
 * the correct <link> preload tags and font-face declarations.
 */

export interface FontConfig {
  /** Font family name */
  family: string;
  /** Source path or Google Fonts name */
  src: string;
  /** Font weights to include (default: [400, 700]) */
  weights?: number[];
  /** Font styles to include (default: ['normal']) */
  styles?: ('normal' | 'italic')[];
  /** Font display strategy (default: 'swap') */
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  /** Subset list (default: ['latin']) */
  subsets?: string[];
  /** Whether to preload this font (default: true) */
  preload?: boolean;
  /** Fallback font family for CLS prevention */
  fallback?: string[];
  /** Fallback font metrics for size-adjust (optional) */
  fallbackMetrics?: {
    ascent: number;
    descent: number;
    lineGap: number;
    unitsPerEm: number;
  };
}

export interface ResolvedFont {
  /** CSS font-family declaration string */
  fontFamily: string;
  /** Preload link tags */
  preloadLinks: string[];
  /** @font-face CSS declarations */
  fontFaceCSS: string;
  /** Fallback font stack */
  fallbackStack: string;
}

const GOOGLE_FONTS_BASE = 'https://fonts.googleapis.com/css2';

/**
 * Check if a font source is a Google Font (by name).
 */
function isGoogleFont(src: string): boolean {
  return !src.startsWith('/') && !src.startsWith('.') && !src.startsWith('http');
}

/**
 * Build a Google Fonts URL for the given family and options.
 */
function buildGoogleFontsUrl(config: Required<Pick<FontConfig, 'family' | 'weights' | 'styles' | 'display' | 'subsets'>>): string {
  const params = new URLSearchParams();
  params.set('family', config.family);
  for (const weight of config.weights) {
    for (const style of config.styles) {
      if (style === 'italic') {
        params.append('ital', '1');
        params.append('wght', String(weight));
      } else {
        params.append('wght', String(weight));
      }
    }
  }
  params.set('display', config.display);
  return `${GOOGLE_FONTS_BASE}?${params}`;
}

/**
 * Resolve a font configuration into preload links and font-face CSS.
 * PledgePack's asset pipeline will download, subset, and self-host the fonts at build time.
 */
export function resolveFont(config: FontConfig): ResolvedFont {
  const weights = config.weights ?? [400, 700];
  const styles = config.styles ?? ['normal'];
  const display = config.display ?? 'swap';
  const subsets = config.subsets ?? ['latin'];
  const preload = config.preload ?? true;
  const fallback = config.fallback ?? ['system-ui', 'sans-serif'];

  const fontFamily = `'${config.family}', ${fallback.join(', ')}`;
  const fallbackStack = fallback.join(', ');

  if (isGoogleFont(config.src)) {
    const url = buildGoogleFontsUrl({
      family: config.family,
      weights,
      styles,
      display,
      subsets,
    });

    const preloadLinks = preload
      ? [`<link rel="preconnect" href="https://fonts.googleapis.com">`, `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`, `<link href="${url}" rel="stylesheet">`]
      : [`<link href="${url}" rel="stylesheet">`];

    return {
      fontFamily,
      preloadLinks,
      fontFaceCSS: '',
      fallbackStack,
    };
  }

  // Local font file — generate @font-face declarations
  const fontFaceDecls: string[] = [];
  const preloadLinks: string[] = [];

  for (const weight of weights) {
    for (const style of styles) {
      const fontPath = `/_pledge/font?f=${encodeURIComponent(config.family)}&w=${weight}&s=${style}`;
      fontFaceDecls.push(`@font-face {
  font-family: '${config.family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: ${display};
  src: url('${fontPath}') format('woff2');
}`);
      if (preload && weight === weights[0] && style === 'normal') {
        preloadLinks.push(`<link rel="preload" href="${fontPath}" as="font" type="font/woff2" crossorigin>`);
      }
    }
  }

  return {
    fontFamily,
    preloadLinks,
    fontFaceCSS: fontFaceDecls.join('\n'),
    fallbackStack,
  };
}

/**
 * Generate a CSS variable name for a font family.
 */
export function fontVarName(family: string): string {
  return `--pledge-font-${family.toLowerCase().replace(/\s+/g, '-')}`;
}
