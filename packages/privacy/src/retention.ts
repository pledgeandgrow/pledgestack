export interface RetentionPolicy {
  /** Source name (e.g. 'sessions', 'audit-log', 'cache') */
  source: string;
  /** Time-to-live in seconds (0 = no expiry) */
  ttl: number;
  /** Whether to automatically purge expired records */
  autoPurge: boolean;
  /** Purge interval in seconds (default: 3600 = 1 hour) */
  purgeInterval?: number;
}

export interface PurgeResult {
  source: string;
  purgedCount: number;
  purgedAt: number;
}

export interface RetentionConfig {
  /** Retention policies per data source */
  policies: RetentionPolicy[];
  /** Purge callback — called for each expired record */
  purgeFn?: (source: string, keys: string[]) => Promise<number>;
  /** Key list provider — returns all keys for a source with timestamps */
  keyProvider?: (source: string) => Promise<Array<{ key: string; createdAt: number }>>;
}

const DEFAULT_POLICIES: RetentionPolicy[] = [
  { source: 'sessions', ttl: 7 * 24 * 60 * 60, autoPurge: true, purgeInterval: 3600 },
  { source: 'audit-log', ttl: 90 * 24 * 60 * 60, autoPurge: true, purgeInterval: 86400 },
  { source: 'cache', ttl: 300, autoPurge: true, purgeInterval: 60 },
];

/**
 * Data retention manager — configurable TTL per data source with automatic purge.
 *
 * Register policies for each data source, then call purgeExpired() periodically
 * (e.g. via a cron job) to clean up expired records.
 */
export class RetentionManager {
  private policies: Map<string, RetentionPolicy> = new Map();
  private purgeFn?: (source: string, keys: string[]) => Promise<number>;
  private keyProvider?: (source: string) => Promise<Array<{ key: string; createdAt: number }>>;
  private lastPurge: Map<string, number> = new Map();

  constructor(config: RetentionConfig) {
    for (const policy of config.policies) {
      this.policies.set(policy.source, policy);
    }
    this.purgeFn = config.purgeFn;
    this.keyProvider = config.keyProvider;
  }

  /**
   * Create a RetentionManager with default policies.
   */
  static withDefaults(config?: Partial<RetentionConfig>): RetentionManager {
    return new RetentionManager({
      policies: DEFAULT_POLICIES,
      ...config,
    });
  }

  /**
   * Register or update a retention policy.
   */
  setPolicy(policy: RetentionPolicy): void {
    this.policies.set(policy.source, policy);
  }

  /**
   * Get the retention policy for a source.
   */
  getPolicy(source: string): RetentionPolicy | undefined {
    return this.policies.get(source);
  }

  /**
   * Check if a record has expired.
   */
  isExpired(source: string, createdAt: number): boolean {
    const policy = this.policies.get(source);
    if (!policy || policy.ttl === 0) return false;
    return Date.now() - createdAt > policy.ttl * 1000;
  }

  /**
   * Get the expiry timestamp for a record.
   */
  getExpiry(source: string, createdAt: number): number | null {
    const policy = this.policies.get(source);
    if (!policy || policy.ttl === 0) return null;
    return createdAt + policy.ttl * 1000;
  }

  /**
   * Purge expired records from all sources with autoPurge enabled.
   * Call this from a cron job or periodic timer.
   */
  async purgeExpired(): Promise<PurgeResult[]> {
    if (!this.purgeFn || !this.keyProvider) return [];

    const results: PurgeResult[] = [];
    const now = Date.now();

    for (const [source, policy] of this.policies) {
      if (!policy.autoPurge) continue;

      const lastRun = this.lastPurge.get(source) ?? 0;
      const purgeInterval = (policy.purgeInterval ?? 3600) * 1000;
      if (now - lastRun < purgeInterval) continue;

      try {
        const keys = await this.keyProvider(source);
        const expiredKeys = keys
          .filter((k) => this.isExpired(source, k.createdAt))
          .map((k) => k.key);

        if (expiredKeys.length > 0) {
          const purgedCount = await this.purgeFn(source, expiredKeys);
          results.push({ source, purgedCount, purgedAt: now });
        }

        this.lastPurge.set(source, now);
      } catch (err) {
        console.error(`[pledgestack] Retention purge failed for "${source}":`, err);
      }
    }

    return results;
  }

  /**
   * Get all configured policies.
   */
  getAllPolicies(): RetentionPolicy[] {
    return [...this.policies.values()];
  }
}
