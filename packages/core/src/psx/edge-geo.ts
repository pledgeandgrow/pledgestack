/**
 * #278 — Edge Geo-Personalization.
 *
 * geo() server utility for country/region/city from edge headers,
 * automatic locale detection, geo-based A/B testing, content localization.
 *
 * Provides:
 * - geo() utility for extracting geo data from request headers
 * - Locale detection from Accept-Language + geo
 * - Geo-based A/B testing
 * - Content localization config
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeoData {
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  continent: string | null;
  postalCode: string | null;
  colo: string | null;
}

export interface LocaleData {
  language: string;
  region: string | null;
  locale: string;
  direction: 'ltr' | 'rtl';
}

export interface GeoAbTestConfig {
  /** Test name */
  testName: string;
  /** Variants keyed by country code */
  variants: Record<string, string>;
  /** Default variant */
  defaultVariant: string;
  /** Percentage split for default (0-100) */
  defaultSplit?: number;
}

export interface GeoAbTestResult {
  testName: string;
  variant: string;
  reason: 'country-match' | 'default' | 'split';
  country: string | null;
}

// ---------------------------------------------------------------------------
// geo() Utility
// ---------------------------------------------------------------------------

/**
 * Extracts geographic data from edge request headers.
 * Works with Cloudflare, Vercel, and custom CDN headers.
 */
export function geo(headers: Record<string, string>): GeoData {
  // Cloudflare CF-* headers
  const cfCountry = headers['cf-ipcountry'] ?? null;
  const cfCity = headers['cf-ipcity'] ?? null;
  const cfRegion = headers['cf-ipregion'] ?? null;
  const cfPostalCode = headers['cf-postal-code'] ?? null;
  const cfTimezone = headers['cf-timezone'] ?? null;
  const cfColo = headers['cf-ray']?.split('-')[1] ?? null;
  const cfLatitude = headers['cf-iplatitude'] ? parseFloat(headers['cf-iplatitude']) : null;
  const cfLongitude = headers['cf-iplongitude'] ? parseFloat(headers['cf-iplongitude']) : null;

  // Vercel headers
  const vercelCountry = headers['x-vercel-ip-country'] ?? cfCountry;
  const vercelCity = headers['x-vercel-ip-city'] ?? cfCity;
  const vercelRegion = headers['x-vercel-ip-country-region'] ?? cfRegion;
  const vercelLatitude = headers['x-vercel-ip-latitude'] ? parseFloat(headers['x-vercel-ip-latitude']) : cfLatitude;
  const vercelLongitude = headers['x-vercel-ip-longitude'] ? parseFloat(headers['x-vercel-ip-longitude']) : cfLongitude;

  const country = vercelCountry ?? null;
  const countryCode = country;

  return {
    country,
    countryCode,
    region: vercelRegion ?? null,
    city: vercelCity ?? null,
    timezone: cfTimezone ?? null,
    latitude: vercelLatitude,
    longitude: vercelLongitude,
    continent: country ? countryToContinent(country) : null,
    postalCode: cfPostalCode ?? null,
    colo: cfColo ?? null,
  };
}

/**
 * Detects locale from Accept-Language header and geo data.
 */
export function detectPsxLocale(headers: Record<string, string>, geoData?: GeoData): LocaleData {
  const acceptLang = headers['accept-language'] ?? '';
  const languages = parseAcceptLanguage(acceptLang);

  let language = 'en';
  let region: string | null = null;

  if (languages.length > 0) {
    const first = languages[0];
    language = first.language;
    region = first.region ?? null;
  }

  // Fall back to geo country if no region from Accept-Language
  if (!region && geoData?.countryCode) {
    region = geoData.countryCode;
  }

  const locale = region ? `${language}-${region}` : language;
  const direction = isRtl(language) ? 'rtl' : 'ltr';

  return { language, region, locale, direction };
}

/**
 * Determines A/B test variant based on geo data.
 */
export function geoAbTest(config: GeoAbTestConfig, geoData: GeoData): GeoAbTestResult {
  // Check for country-specific variant
  if (geoData.countryCode && config.variants[geoData.countryCode]) {
    return {
      testName: config.testName,
      variant: config.variants[geoData.countryCode],
      reason: 'country-match',
      country: geoData.countryCode,
    };
  }

  // Fall back to default with optional split
  const split = config.defaultSplit ?? 100;
  if (split >= 100 || Math.random() * 100 < split) {
    return {
      testName: config.testName,
      variant: config.defaultVariant,
      reason: 'default',
      country: geoData.countryCode,
    };
  }

  return {
    testName: config.testName,
    variant: config.defaultVariant,
    reason: 'split',
    country: geoData.countryCode,
  };
}

/**
 * Generates localization configuration for a given locale.
 */
export function getLocalizationConfig(locale: string): {
  locale: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  firstDayOfWeek: number;
} {
  const [lang, region] = locale.split('-');

  // Common locale configurations
  const configs: Record<string, { currency: string; dateFormat: string; timeFormat: string; firstDayOfWeek: number }> = {
    'en-US': { currency: 'USD', dateFormat: 'MM/DD/YYYY', timeFormat: 'h:mm A', firstDayOfWeek: 0 },
    'en-GB': { currency: 'GBP', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', firstDayOfWeek: 1 },
    'de-DE': { currency: 'EUR', dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm', firstDayOfWeek: 1 },
    'fr-FR': { currency: 'EUR', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', firstDayOfWeek: 1 },
    'ja-JP': { currency: 'JPY', dateFormat: 'YYYY/MM/DD', timeFormat: 'HH:mm', firstDayOfWeek: 0 },
    'zh-CN': { currency: 'CNY', dateFormat: 'YYYY/MM/DD', timeFormat: 'HH:mm', firstDayOfWeek: 0 },
    'ko-KR': { currency: 'KRW', dateFormat: 'YYYY.MM.DD', timeFormat: 'HH:mm', firstDayOfWeek: 0 },
    'es-ES': { currency: 'EUR', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', firstDayOfWeek: 1 },
    'pt-BR': { currency: 'BRL', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', firstDayOfWeek: 0 },
    'ar-SA': { currency: 'SAR', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', firstDayOfWeek: 6 },
    'hi-IN': { currency: 'INR', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', firstDayOfWeek: 0 },
  };

  const config = configs[locale] ?? configs[`${lang}-${region}`] ?? configs['en-US'];

  return {
    locale,
    ...config,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseAcceptLanguage(header: string): Array<{ language: string; region: string | null; quality: number }> {
  if (!header) return [];
  return header
    .split(',')
    .map(part => {
      const [langPart, qPart] = part.trim().split(';q=');
      const [language, region] = langPart.split('-');
      return {
        language: language.toLowerCase(),
        region: region ? region.toUpperCase() : null,
        quality: qPart ? parseFloat(qPart) : 1,
      };
    })
    .sort((a, b) => b.quality - a.quality);
}

function isRtl(language: string): boolean {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi', 'ps', 'sd'];
  return rtlLanguages.includes(language);
}

function countryToContinent(countryCode: string): string {
  const continentMap: Record<string, string> = {
    US: 'NA', CA: 'NA', MX: 'NA',
    GB: 'EU', DE: 'EU', FR: 'EU', ES: 'EU', IT: 'EU', NL: 'EU', BE: 'EU', PT: 'EU', SE: 'EU', NO: 'EU', FI: 'EU', DK: 'EU', IE: 'EU', AT: 'EU', CH: 'EU', PL: 'EU', CZ: 'EU', GR: 'EU', RO: 'EU', HU: 'EU',
    JP: 'AS', CN: 'AS', KR: 'AS', IN: 'AS', SG: 'AS', HK: 'AS', TH: 'AS', VN: 'AS', MY: 'AS', ID: 'AS', PH: 'AS', TW: 'AS',
    AU: 'OC', NZ: 'OC',
    BR: 'SA', AR: 'SA', CL: 'SA', CO: 'SA', PE: 'SA', VE: 'SA',
    ZA: 'AF', NG: 'AF', KE: 'AF', EG: 'AF', MA: 'AF',
    SA: 'AS', AE: 'AS', IL: 'AS', TR: 'AS', IR: 'AS', IQ: 'AS',
  };
  return continentMap[countryCode.toUpperCase()] ?? 'UNKNOWN';
}
