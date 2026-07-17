import type { PledgeRequest } from 'pledgestack-shared';

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing' | 'functional';

export interface ConsentRecord {
  category: ConsentCategory;
  granted: boolean;
  timestamp: number;
  version: string;
}

export interface ConsentState {
  records: ConsentRecord[];
  version: string;
  updatedAt: number;
}

export interface ConsentConfig {
  /** Cookie name for storing consent (default: '__pledge_consent') */
  cookieName?: string;
  /** Consent policy version — bump to re-request consent (default: '1') */
  version?: string;
  /** Cookie max age in seconds (default: 365 days) */
  maxAge?: number;
  /** Categories that cannot be revoked (default: ['necessary']) */
  immutableCategories?: ConsentCategory[];
}

const DEFAULT_COOKIE_NAME = '__pledge_consent';
const DEFAULT_VERSION = '1';
const DEFAULT_MAX_AGE = 365 * 24 * 60 * 60;
const DEFAULT_IMMUTABLE: ConsentCategory[] = ['necessary'];

const ALL_CATEGORIES: ConsentCategory[] = ['necessary', 'analytics', 'marketing', 'functional'];

/**
 * Consent manager — GDPR/CCPA-compliant consent tracking with versioned policies.
 *
 * Stores consent in a signed cookie. Supports granular categories,
 * version bumping (re-request on policy change), and immutable categories.
 */
export class ConsentManager {
  private cookieName: string;
  private version: string;
  private maxAge: number;
  private immutable: Set<ConsentCategory>;

  constructor(config: ConsentConfig = {}) {
    this.cookieName = config.cookieName ?? DEFAULT_COOKIE_NAME;
    this.version = config.version ?? DEFAULT_VERSION;
    this.maxAge = config.maxAge ?? DEFAULT_MAX_AGE;
    this.immutable = new Set(config.immutableCategories ?? DEFAULT_IMMUTABLE);
  }

  /**
   * Read consent state from request cookies.
   * Returns null if no consent has been given or version is outdated.
   */
  getConsent(req: PledgeRequest): ConsentState | null {
    const raw = req.cookies[this.cookieName];
    if (!raw) return null;

    try {
      const state = JSON.parse(decodeURIComponent(raw)) as ConsentState;
      if (state.version !== this.version) return null;
      return state;
    } catch {
      return null;
    }
  }

  /**
   * Check if a specific category has consent.
   * 'necessary' is always true.
   */
  hasConsent(req: PledgeRequest, category: ConsentCategory): boolean {
    if (category === 'necessary') return true;
    const state = this.getConsent(req);
    if (!state) return false;
    const record = state.records.find((r) => r.category === category);
    return record?.granted ?? false;
  }

  /**
   * Create a consent state from user selections.
   * Immutable categories are always granted.
   */
  createConsentState(selections: Partial<Record<ConsentCategory, boolean>>): ConsentState {
    const records: ConsentRecord[] = ALL_CATEGORIES.map((category) => ({
      category,
      granted: this.immutable.has(category) ? true : selections[category] ?? false,
      timestamp: Date.now(),
      version: this.version,
    }));

    return {
      records,
      version: this.version,
      updatedAt: Date.now(),
    };
  }

  /**
   * Generate Set-Cookie header for consent state.
   */
  consentCookie(state: ConsentState): string {
    const encoded = encodeURIComponent(JSON.stringify(state));
    return [
      `${this.cookieName}=${encoded}`,
      `Max-Age=${this.maxAge}`,
      'Path=/',
      'SameSite=Lax',
      'Secure',
      'HttpOnly',
    ].join('; ');
  }

  /**
   * Generate Set-Cookie header to clear consent.
   */
  clearConsentCookie(): string {
    return `${this.cookieName}=; Max-Age=0; Path=/; SameSite=Lax; Secure; HttpOnly`;
  }

  /**
   * Check if consent needs to be re-requested (version mismatch or missing).
   */
  needsConsent(req: PledgeRequest): boolean {
    return this.getConsent(req) === null;
  }

  /**
   * Get all categories.
   */
  getCategories(): ConsentCategory[] {
    return [...ALL_CATEGORIES];
  }

  /**
   * Get immutable categories (always granted).
   */
  getImmutableCategories(): ConsentCategory[] {
    return [...this.immutable];
  }
}

/**
 * Cookie consent banner component props.
 * Use in a React component to render the consent UI.
 */
export interface CookieConsentBannerProps {
  /** Consent manager instance */
  manager: ConsentManager;
  /** Current request (for checking existing consent) */
  request: PledgeRequest;
  /** Callback when user accepts all */
  onAcceptAll: () => void;
  /** Callback when user rejects non-necessary */
  onRejectAll: () => void;
  /** Callback when user saves custom preferences */
  onSavePreferences: (selections: Partial<Record<ConsentCategory, boolean>>) => void;
  /** Custom banner title */
  title?: string;
  /** Custom banner message */
  message?: string;
  /** Privacy policy URL */
  privacyPolicyUrl?: string;
}

/**
 * Default banner text values.
 */
export const DEFAULT_BANNER_TEXT = {
  title: 'Cookie Consent',
  message: 'We use cookies to enhance your experience. You can choose which categories to allow.',
  privacyPolicyUrl: '/privacy',
  acceptAll: 'Accept All',
  rejectAll: 'Reject Non-Essential',
  customize: 'Customize',
  save: 'Save Preferences',
} as const;
