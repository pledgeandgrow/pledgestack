/**
 * #272 — Edge KV Integration.
 *
 * Unified KV API for Cloudflare KV, Vercel KV, Deno KV.
 * pledgestack/edge-kv with consistent interface, automatic caching, TTL support.
 *
 * Provides:
 * - Unified KV interface across edge platforms
 * - Automatic platform detection and adapter selection
 * - TTL support with automatic expiration
 * - Batch operations (getMany, putMany)
 * - L1 in-memory cache for hot keys
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KvEntry {
  key: string;
  value: string;
  expirationTtl?: number;
  metadata?: Record<string, unknown>;
}

export interface KvGetOptions {
  /** Cache type to use (default: 'l1') */
  cacheType?: 'l1' | 'none';
  /** Force fresh fetch, bypassing cache */
  forceFresh?: boolean;
}

export interface KvPutOptions {
  /** TTL in seconds */
  expirationTtl?: number;
  /** Metadata to associate with the key */
  metadata?: Record<string, unknown>;
}

export interface KvListOptions {
  /** Prefix to filter keys */
  prefix?: string;
  /** Maximum number of keys to return */
  limit?: number;
  /** Cursor for pagination */
  cursor?: string;
}

export interface KvListResult {
  keys: Array<{ name: string; expiration?: number; metadata?: Record<string, unknown> }>;
  list_complete: boolean;
  cursor?: string;
}

export interface KvAdapter {
  get(key: string, options?: KvGetOptions): Promise<string | null>;
  getJson<T>(key: string, options?: KvGetOptions): Promise<T | null>;
  put(key: string, value: string, options?: KvPutOptions): Promise<void>;
  putJson<T>(key: string, value: T, options?: KvPutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KvListOptions): Promise<KvListResult>;
  getMany(keys: string[]): Promise<Array<string | null>>;
  putMany(entries: KvEntry[]): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
}

export type KvPlatform = 'cloudflare' | 'vercel' | 'deno' | 'memory';

export interface EdgeKvConfig {
  platform: KvPlatform;
  /** Namespace or prefix for keys */
  namespace?: string;
  /** L1 cache max entries (default: 1000) */
  l1CacheSize?: number;
  /** L1 cache TTL in seconds (default: 60) */
  l1CacheTtl?: number;
  /** Platform-specific binding */
  binding?: unknown;
}

// ---------------------------------------------------------------------------
// L1 In-Memory Cache
// ---------------------------------------------------------------------------

interface CacheEntry {
  value: string;
  expiresAt: number;
}

class L1Cache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize: number, ttlSeconds: number) {
    this.maxSize = maxSize;
    this.ttlMs = ttlSeconds * 1000;
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ---------------------------------------------------------------------------
// Platform Adapters
// ---------------------------------------------------------------------------

class CloudflareKvAdapter implements KvAdapter {
  private kv: { get(key: string): Promise<string | null>; put(key: string, value: string, opts?: Record<string, unknown>): Promise<void>; delete(key: string): Promise<void>; list(opts?: Record<string, unknown>): Promise<{ keys: Array<{ name: string; expiration?: number; metadata?: Record<string, unknown> }>; list_complete: boolean; cursor?: string }> };
  private l1: L1Cache;
  private namespace: string;

  constructor(binding: unknown, namespace: string, l1: L1Cache) {
    this.kv = binding as typeof this.kv;
    this.namespace = namespace;
    this.l1 = l1;
  }

  private namespacedKey(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key;
  }

  async get(key: string, options?: KvGetOptions): Promise<string | null> {
    const nk = this.namespacedKey(key);
    if (options?.cacheType !== 'none' && !options?.forceFresh) {
      const cached = this.l1.get(nk);
      if (cached !== null) return cached;
    }
    const value = await this.kv.get(nk);
    if (value !== null) this.l1.set(nk, value);
    return value;
  }

  async getJson<T>(key: string, options?: KvGetOptions): Promise<T | null> {
    const raw = await this.get(key, options);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async put(key: string, value: string, options?: KvPutOptions): Promise<void> {
    const nk = this.namespacedKey(key);
    const opts: Record<string, unknown> = {};
    if (options?.expirationTtl) opts.expirationTtl = options.expirationTtl;
    if (options?.metadata) opts.metadata = options.metadata;
    await this.kv.put(nk, value, opts);
    this.l1.set(nk, value);
  }

  async putJson<T>(key: string, value: T, options?: KvPutOptions): Promise<void> {
    await this.put(key, JSON.stringify(value), options);
  }

  async delete(key: string): Promise<void> {
    const nk = this.namespacedKey(key);
    await this.kv.delete(nk);
    this.l1.delete(nk);
  }

  async list(options?: KvListOptions): Promise<KvListResult> {
    const opts: Record<string, unknown> = {};
    if (options?.prefix) opts.prefix = this.namespacedKey(options.prefix);
    if (options?.limit) opts.limit = options.limit;
    if (options?.cursor) opts.cursor = options.cursor;
    return this.kv.list(opts);
  }

  async getMany(keys: string[]): Promise<Array<string | null>> {
    return Promise.all(keys.map(k => this.get(k)));
  }

  async putMany(entries: KvEntry[]): Promise<void> {
    await Promise.all(entries.map(e => this.put(e.key, e.value, { expirationTtl: e.expirationTtl, metadata: e.metadata })));
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map(k => this.delete(k)));
  }
}

class VercelKvAdapter implements KvAdapter {
  private kv: { get(key: string): Promise<string | null>; set(key: string, value: string, opts?: Record<string, unknown>): Promise<void>; del(key: string): Promise<void>; keys(pattern: string, opts?: Record<string, unknown>): Promise<string[]> };
  private l1: L1Cache;
  private namespace: string;

  constructor(binding: unknown, namespace: string, l1: L1Cache) {
    this.kv = binding as typeof this.kv;
    this.namespace = namespace;
    this.l1 = l1;
  }

  private nk(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key;
  }

  async get(key: string, options?: KvGetOptions): Promise<string | null> {
    const nk = this.nk(key);
    if (options?.cacheType !== 'none' && !options?.forceFresh) {
      const cached = this.l1.get(nk);
      if (cached !== null) return cached;
    }
    const value = await this.kv.get(nk);
    if (value !== null) this.l1.set(nk, value);
    return value;
  }

  async getJson<T>(key: string, options?: KvGetOptions): Promise<T | null> {
    const raw = await this.get(key, options);
    if (raw === null) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }

  async put(key: string, value: string, options?: KvPutOptions): Promise<void> {
    const nk = this.nk(key);
    const opts: Record<string, unknown> = {};
    if (options?.expirationTtl) opts.ex = options.expirationTtl;
    await this.kv.set(nk, value, opts);
    this.l1.set(nk, value);
  }

  async putJson<T>(key: string, value: T, options?: KvPutOptions): Promise<void> {
    await this.put(key, JSON.stringify(value), options);
  }

  async delete(key: string): Promise<void> {
    const nk = this.nk(key);
    await this.kv.del(nk);
    this.l1.delete(nk);
  }

  async list(options?: KvListOptions): Promise<KvListResult> {
    const pattern = options?.prefix ? `${this.nk(options.prefix)}*` : '*';
    const keys = await this.kv.keys(pattern, { limit: options?.limit, cursor: options?.cursor });
    return {
      keys: keys.map(name => ({ name })),
      list_complete: true,
    };
  }

  async getMany(keys: string[]): Promise<Array<string | null>> {
    return Promise.all(keys.map(k => this.get(k)));
  }

  async putMany(entries: KvEntry[]): Promise<void> {
    await Promise.all(entries.map(e => this.put(e.key, e.value, { expirationTtl: e.expirationTtl, metadata: e.metadata })));
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map(k => this.delete(k)));
  }
}

class DenoKvAdapter implements KvAdapter {
  private kv: { get(key: string[]): Promise<{ value: unknown; versionstamp: string } | null>; set(key: string[], value: unknown, opts?: Record<string, unknown>): Promise<void>; delete(key: string[]): Promise<void>; list(opts: Record<string, unknown>): AsyncIterable<Array<{ key: string[]; value: unknown }>> };
  private l1: L1Cache;
  private namespace: string;

  constructor(binding: unknown, namespace: string, l1: L1Cache) {
    this.kv = binding as typeof this.kv;
    this.namespace = namespace;
    this.l1 = l1;
  }

  private nk(key: string): string[] {
    return this.namespace ? [this.namespace, key] : [key];
  }

  async get(key: string, options?: KvGetOptions): Promise<string | null> {
    const nk = this.nk(key);
    const nkStr = nk.join(':');
    if (options?.cacheType !== 'none' && !options?.forceFresh) {
      const cached = this.l1.get(nkStr);
      if (cached !== null) return cached;
    }
    const result = await this.kv.get(nk);
    const value = result ? String(result.value) : null;
    if (value !== null) this.l1.set(nkStr, value);
    return value;
  }

  async getJson<T>(key: string, options?: KvGetOptions): Promise<T | null> {
    const raw = await this.get(key, options);
    if (raw === null) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }

  async put(key: string, value: string, options?: KvPutOptions): Promise<void> {
    const nk = this.nk(key);
    const opts: Record<string, unknown> = {};
    if (options?.expirationTtl) opts.expireIn = options.expirationTtl * 1000;
    await this.kv.set(nk, value, opts);
    this.l1.set(nk.join(':'), value);
  }

  async putJson<T>(key: string, value: T, options?: KvPutOptions): Promise<void> {
    await this.put(key, JSON.stringify(value), options);
  }

  async delete(key: string): Promise<void> {
    const nk = this.nk(key);
    await this.kv.delete(nk);
    this.l1.delete(nk.join(':'));
  }

  async list(options?: KvListOptions): Promise<KvListResult> {
    const prefix = options?.prefix ? this.nk(options.prefix) : this.namespace ? [this.namespace] : [];
    const entries: Array<{ name: string }> = [];
    for await (const batch of this.kv.list({ prefix })) {
      for (const entry of batch) {
        entries.push({ name: entry.key.join(':') });
        if (options?.limit && entries.length >= options.limit) break;
      }
      if (options?.limit && entries.length >= options.limit) break;
    }
    return { keys: entries, list_complete: true };
  }

  async getMany(keys: string[]): Promise<Array<string | null>> {
    return Promise.all(keys.map(k => this.get(k)));
  }

  async putMany(entries: KvEntry[]): Promise<void> {
    await Promise.all(entries.map(e => this.put(e.key, e.value, { expirationTtl: e.expirationTtl, metadata: e.metadata })));
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map(k => this.delete(k)));
  }
}

class MemoryKvAdapter implements KvAdapter {
  private store = new Map<string, { value: string; expiresAt?: number; metadata?: Record<string, unknown> }>();
  private l1: L1Cache;
  private namespace: string;

  constructor(_binding: unknown, namespace: string, l1: L1Cache) {
    this.namespace = namespace;
    this.l1 = l1;
  }

  private nk(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key;
  }

  private isExpired(entry: { expiresAt?: number }): boolean {
    return entry.expiresAt !== undefined && Date.now() > entry.expiresAt;
  }

  async get(key: string, options?: KvGetOptions): Promise<string | null> {
    const nk = this.nk(key);
    if (!options?.forceFresh) {
      const cached = this.l1.get(nk);
      if (cached !== null) return cached;
    }
    const entry = this.store.get(nk);
    if (!entry || this.isExpired(entry)) {
      if (entry) this.store.delete(nk);
      this.l1.delete(nk);
      return null;
    }
    if (!options?.forceFresh) {
      this.l1.set(nk, entry.value);
    }
    return entry.value;
  }

  async getJson<T>(key: string, options?: KvGetOptions): Promise<T | null> {
    const raw = await this.get(key, options);
    if (raw === null) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }

  async put(key: string, value: string, options?: KvPutOptions): Promise<void> {
    const nk = this.nk(key);
    const entry: { value: string; expiresAt?: number; metadata?: Record<string, unknown> } = { value };
    if (options?.expirationTtl) entry.expiresAt = Date.now() + options.expirationTtl * 1000;
    if (options?.metadata) entry.metadata = options.metadata;
    this.store.set(nk, entry);
    this.l1.set(nk, value);
  }

  async putJson<T>(key: string, value: T, options?: KvPutOptions): Promise<void> {
    await this.put(key, JSON.stringify(value), options);
  }

  async delete(key: string): Promise<void> {
    const nk = this.nk(key);
    this.store.delete(nk);
    this.l1.delete(nk);
  }

  async list(options?: KvListOptions): Promise<KvListResult> {
    const prefix = options?.prefix ? this.nk(options.prefix) : this.namespace ? `${this.namespace}:` : '';
    const keys: Array<{ name: string; expiration?: number; metadata?: Record<string, unknown> }> = [];
    for (const [nk, entry] of this.store) {
      if (this.isExpired(entry)) {
        this.store.delete(nk);
        continue;
      }
      if (!prefix || nk.startsWith(prefix)) {
        keys.push({
          name: nk,
          expiration: entry.expiresAt,
          metadata: entry.metadata,
        });
      }
      if (options?.limit && keys.length >= options.limit) break;
    }
    return { keys, list_complete: true };
  }

  async getMany(keys: string[]): Promise<Array<string | null>> {
    return Promise.all(keys.map(k => this.get(k)));
  }

  async putMany(entries: KvEntry[]): Promise<void> {
    await Promise.all(entries.map(e => this.put(e.key, e.value, { expirationTtl: e.expirationTtl, metadata: e.metadata })));
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map(k => this.delete(k)));
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a KV adapter for the specified platform.
 */
export function createKvAdapter(config: EdgeKvConfig): KvAdapter {
  const l1 = new L1Cache(config.l1CacheSize ?? 1000, config.l1CacheTtl ?? 60);
  const namespace = config.namespace ?? '';

  switch (config.platform) {
    case 'cloudflare':
      return new CloudflareKvAdapter(config.binding, namespace, l1);
    case 'vercel':
      return new VercelKvAdapter(config.binding, namespace, l1);
    case 'deno':
      return new DenoKvAdapter(config.binding, namespace, l1);
    case 'memory':
      return new MemoryKvAdapter(null, namespace, l1);
    default:
      throw new Error(`Unsupported KV platform: ${config.platform as string}`);
  }
}

/**
 * Detects the KV platform from environment.
 */
export function detectKvPlatform(): KvPlatform {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.CF_PAGES || process.env.CLOUDFLARE_ACCOUNT_ID) return 'cloudflare';
    if (process.env.VERCEL) return 'vercel';
    if (process.env.DENO_DEPLOYMENT_ID) return 'deno';
  }
  return 'memory';
}
