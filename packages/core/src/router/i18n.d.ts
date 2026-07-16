import type { I18nConfig } from 'pledgestack-shared';
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
export declare function extractLocale(pathname: string, config: I18nConfig): {
    locale: string;
    pathWithoutLocale: string;
} | null;
/**
 * Adds a locale prefix to a pathname.
 */
export declare function addLocalePrefix(pathname: string, locale: string, config: I18nConfig): string;
/**
 * Generates all locale-prefixed patterns for a route.
 */
export declare function getI18nPatterns(pattern: string, config: I18nConfig): string[];
/**
 * Detects the preferred locale from the Accept-Language header.
 */
export declare function detectLocale(acceptLanguage: string, config: I18nConfig): string;
/**
 * Creates a locale redirect response if the pathname doesn't include
 * the correct locale prefix.
 */
export declare function maybeRedirectLocale(pathname: string, acceptLanguage: string, config: I18nConfig): string | null;
/**
 * Loads translation messages for a locale.
 */
export declare function loadMessages(locale: string, messagesDir: string): Promise<Record<string, string>>;
/**
 * Creates a translation function for a given message catalog.
 */
export declare function createTranslator(messages: Record<string, string>): (key: string, params?: Record<string, string>) => string;
//# sourceMappingURL=i18n.d.ts.map