import { describe, it, expect } from 'vitest';
import { geo, detectPsxLocale, geoAbTest, getLocalizationConfig } from './edge-geo';

describe('Edge Geo-Personalization (#278)', () => {
  describe('geo', () => {
    it('extracts geo data from Cloudflare headers', () => {
      const data = geo({
        'cf-ipcountry': 'US',
        'cf-ipcity': 'San Francisco',
        'cf-ipregion': 'CA',
        'cf-timezone': 'America/Los_Angeles',
      });
      expect(data.country).toBe('US');
      expect(data.city).toBe('San Francisco');
      expect(data.timezone).toBe('America/Los_Angeles');
    });

    it('extracts geo data from Vercel headers', () => {
      const data = geo({
        'x-vercel-ip-country': 'DE',
        'x-vercel-ip-city': 'Berlin',
      });
      expect(data.country).toBe('DE');
      expect(data.city).toBe('Berlin');
    });

    it('returns nulls for missing headers', () => {
      const data = geo({});
      expect(data.country).toBeNull();
      expect(data.city).toBeNull();
    });

    it('detects continent from country code', () => {
      const data = geo({ 'cf-ipcountry': 'JP' });
      expect(data.continent).toBe('AS');
    });
  });

  describe('detectPsxLocale', () => {
    it('detects locale from Accept-Language', () => {
      const locale = detectPsxLocale({ 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' });
      expect(locale.language).toBe('fr');
      expect(locale.region).toBe('FR');
      expect(locale.locale).toBe('fr-FR');
    });

    it('uses geo data as fallback for region', () => {
      const locale = detectPsxLocale(
        { 'accept-language': 'en;q=0.9' },
        { country: 'GB', countryCode: 'GB' } as never,
      );
      expect(locale.language).toBe('en');
      expect(locale.region).toBe('GB');
    });

    it('detects RTL languages', () => {
      const locale = detectPsxLocale({ 'accept-language': 'ar-SA' });
      expect(locale.direction).toBe('rtl');
    });

    it('defaults to LTR for non-RTL', () => {
      const locale = detectPsxLocale({ 'accept-language': 'en-US' });
      expect(locale.direction).toBe('ltr');
    });
  });

  describe('geoAbTest', () => {
    it('returns country-specific variant', () => {
      const result = geoAbTest(
        {
          testName: 'layout',
          variants: { US: 'variant-a' },
          defaultVariant: 'variant-b',
        },
        { countryCode: 'US' } as never,
      );
      expect(result.variant).toBe('variant-a');
      expect(result.reason).toBe('country-match');
    });

    it('returns default variant for unlisted countries', () => {
      const result = geoAbTest(
        {
          testName: 'layout',
          variants: { US: 'variant-a' },
          defaultVariant: 'variant-b',
        },
        { countryCode: 'DE' } as never,
      );
      expect(result.variant).toBe('variant-b');
      expect(result.reason).toBe('default');
    });
  });

  describe('getLocalizationConfig', () => {
    it('returns config for en-US', () => {
      const config = getLocalizationConfig('en-US');
      expect(config.currency).toBe('USD');
      expect(config.dateFormat).toBe('MM/DD/YYYY');
    });

    it('returns config for ja-JP', () => {
      const config = getLocalizationConfig('ja-JP');
      expect(config.currency).toBe('JPY');
    });

    it('falls back to en-US for unknown locale', () => {
      const config = getLocalizationConfig('xx-XX');
      expect(config.currency).toBe('USD');
    });
  });
});
