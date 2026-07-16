import type { I18nConfig } from '@pledgestack/shared';

/**
 * i18n routing — locale-prefixed routes with automatic detection.
 *
 * Supports two strategies:
 * - 'always': All locales are prefixed (e.g. /en/about, /fr/about)
 * - 'as-needed': Default locale has no prefix (e.g. /about, /fr/about)
 */

export interface I18nRouteMatch {
  locale: string;
  pathname: string;
  params: Record<string, string>;
}

/**
 * Extracts the locale from a pathname.
 * Returns the locale and the pathname with the locale prefix removed.
 */
export function extractLocale(pathname: string, config: I18nConfig): { locale: string; pathWithoutLocale: string } | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return { locale: config.defaultLocale, pathWithoutLocale: '/' };
  }

  const firstSegment = segments[0];
  if (config.locales.includes(firstSegment)) {
    const rest = '/' + segments.slice(1).join('/');
    return { locale: firstSegment, pathWithoutLocale: rest || '/' };
  }

  // No locale prefix — use default
  if (config.localePrefix === 'as-needed' || !config.localePrefix) {
    return { locale: config.defaultLocale, pathWithoutLocale: pathname };
  }

  return null;
}

/**
 * Adds a locale prefix to a pathname.
 */
export function addLocalePrefix(pathname: string, locale: string, config: I18nConfig): string {
  if (config.localePrefix === 'as-needed' && locale === config.defaultLocale) {
    return pathname;
  }
  if (pathname === '/') {
    return `/${locale}`;
  }
  return `/${locale}${pathname}`;
}

/**
 * Generates all locale-prefixed patterns for a route.
 */
export function getI18nPatterns(pattern: string, config: I18nConfig): string[] {
  return config.locales.map((locale) => {
    if (config.localePrefix === 'as-needed' && locale === config.defaultLocale) {
      return pattern;
    }
    if (pattern === '/') {
      return `/${locale}`;
    }
    return `/${locale}${pattern}`;
  });
}

/**
 * Detects the preferred locale from the Accept-Language header.
 */
export function detectLocale(acceptLanguage: string, config: I18nConfig): string {
  const parsed = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=');
      return { lang: lang.trim(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of parsed) {
    const normalized = lang.toLowerCase().split('-')[0];
    if (config.locales.includes(normalized)) {
      return normalized;
    }
  }

  return config.defaultLocale;
}

/**
 * Creates a locale redirect response if the pathname doesn't include
 * the correct locale prefix.
 */
export function maybeRedirectLocale(
  pathname: string,
  acceptLanguage: string,
  config: I18nConfig,
): string | null {
  const extracted = extractLocale(pathname, config);
  if (extracted) {
    return null; // Already has a valid locale
  }

  const preferred = detectLocale(acceptLanguage, config);
  return addLocalePrefix(pathname, preferred, config);
}

/**
 * Loads translation messages for a locale.
 */
export async function loadMessages(
  locale: string,
  messagesDir: string,
): Promise<Record<string, string>> {
  try {
    const mod = await import(`${messagesDir}/${locale}.json`);
    return mod.default ?? mod;
  } catch {
    return {};
  }
}

/**
 * Creates a translation function for a given message catalog.
 */
export function createTranslator(messages: Record<string, string>): (key: string, params?: Record<string, string>) => string {
  return (key: string, params?: Record<string, string>) => {
    let message = messages[key] ?? key;
    if (params) {
      for (const [param, value] of Object.entries(params)) {
        message = message.replace(new RegExp(`\\{${param}\\}`, 'g'), value);
      }
    }
    return message;
  };
}
