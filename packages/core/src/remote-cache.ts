/**
 * Remote build cache — shared cache server for CI/teams.
 *
 * Stores build artifacts (compiled bundles, transformed modules, static pages)
 * in a remote cache backend (Redis, S3, or custom HTTP) so that subsequent
 * builds can skip redundant work.
 *
 * Cache keys are content-hashed: if the input files haven't changed, the
 * cached output is reused without recompiling.
 *
 * Usage:
 *   const cache = createRemoteBuildCache({ type: 'redis', url: 'redis://...' });
 *   await cache.set('route:blog/[slug]', compiledBundle);
 *   const cached = await cache.get('route:blog/[slug]');
 */

export interface RemoteCacheEntry {
  key: string;
  data: Buffer;
  timestamp: number;
  hash: string;
  tags?: string[];
}

export interface RemoteCacheConfig {
  type: 'redis' | 's3' | 'http';
  /** Redis URL (e.g. redis://localhost:6379) */
  url?: string;
  /** S3 bucket name */
  bucket?: string;
  /** S3 region */
  region?: string;
  /** S3 access key ID */
  accessKeyId?: string;
  /** S3 secret access key */
  secretAccessKey?: string;
  /** HTTP cache endpoint (e.g. https://cache.example.com) */
  endpoint?: string;
  /** Cache key prefix for namespacing */
  prefix?: string;
  /** TTL in seconds (0 = no expiry) */
  ttl?: number;
}

export interface RemoteBuildCache {
  get(key: string): Promise<RemoteCacheEntry | null>;
  set(key: string, data: Buffer, tags?: string[]): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

/**
 * Creates a remote build cache backed by the configured provider.
 */
export function createRemoteBuildCache(config: RemoteCacheConfig): RemoteBuildCache {
  const prefix = config.prefix ?? 'pledge:build:';
  const ttl = config.ttl ?? 0;

  switch (config.type) {
    case 'redis':
      return createRedisCache(config, prefix, ttl);
    case 's3':
      return createS3Cache(config, prefix, ttl);
    case 'http':
      return createHttpCache(config, prefix, ttl);
    default:
      throw new Error(`Unknown remote cache type: ${config.type}`);
  }
}

// --- Redis backend ---

function createRedisCache(config: RemoteCacheConfig, prefix: string, ttl: number): RemoteBuildCache {
  // Lazy import — only loaded if Redis is used
  let client: any = null;

  async function getClient() {
    if (client) return client;
    try {
      const { createClient } = await import('redis');
      client = createClient({ url: config.url });
      await client.connect();
      return client;
    } catch {
      throw new Error('Redis client not available. Install `redis` package: npm install redis');
    }
  }

  return {
    async get(key: string): Promise<RemoteCacheEntry | null> {
      const redis = await getClient();
      const data = await redis.get(prefix + key);
      if (!data) return null;
      const parsed = JSON.parse(data) as RemoteCacheEntry;
      return { ...parsed, data: Buffer.from(parsed.data as unknown as string, 'base64') };
    },

    async set(key: string, data: Buffer, tags?: string[]): Promise<void> {
      const redis = await getClient();
      const entry: RemoteCacheEntry = {
        key,
        data: data as unknown as Buffer,
        timestamp: Date.now(),
        hash: createHash(data),
        tags,
      };
      const serialized = JSON.stringify({
        ...entry,
        data: data.toString('base64'),
      });
      if (ttl > 0) {
        await redis.set(prefix + key, serialized, { EX: ttl });
      } else {
        await redis.set(prefix + key, serialized);
      }
    },

    async delete(key: string): Promise<void> {
      const redis = await getClient();
      await redis.del(prefix + key);
    },

    async has(key: string): Promise<boolean> {
      const redis = await getClient();
      const exists = await redis.exists(prefix + key);
      return exists === 1;
    },

    async clear(): Promise<void> {
      const redis = await getClient();
      const keys = await redis.keys(prefix + '*');
      if (keys.length > 0) {
        await redis.del(keys);
      }
    },

    async keys(): Promise<string[]> {
      const redis = await getClient();
      const keys = await redis.keys(prefix + '*');
      return keys.map((k: string) => k.slice(prefix.length));
    },
  };
}

// --- S3 backend ---

function createS3Cache(config: RemoteCacheConfig, prefix: string, _ttl: number): RemoteBuildCache {
  let s3Client: any = null;

  async function getS3() {
    if (s3Client) return s3Client;
    try {
      const { S3Client } = await import('@aws-sdk/client-s3');
      s3Client = new S3Client({
        region: config.region,
        credentials: config.accessKeyId ? {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        } : undefined,
      });
      return s3Client;
    } catch {
      throw new Error('AWS S3 client not available. Install @aws-sdk/client-s3');
    }
  }

  return {
    async get(key: string): Promise<RemoteCacheEntry | null> {
      const s3 = await getS3();
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      try {
        const response = await s3.send(new GetObjectCommand({
          Bucket: config.bucket,
          Key: prefix + key,
        }));
        if (!response.Body) return null;
        const data = Buffer.from(await response.Body.transformToByteArray() as unknown as ArrayBuffer);
        return { key, data, timestamp: Date.now(), hash: createHash(data) };
      } catch {
        return null;
      }
    },

    async set(key: string, data: Buffer, tags?: string[]): Promise<void> {
      const s3 = await getS3();
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      await s3.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: prefix + key,
        Body: data,
        Metadata: {
          timestamp: String(Date.now()),
          hash: createHash(data),
          tags: tags?.join(',') ?? '',
        },
      }));
    },

    async delete(key: string): Promise<void> {
      const s3 = await getS3();
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      await s3.send(new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: prefix + key,
      }));
    },

    async has(key: string): Promise<boolean> {
      const s3 = await getS3();
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      try {
        await s3.send(new HeadObjectCommand({
          Bucket: config.bucket,
          Key: prefix + key,
        }));
        return true;
      } catch {
        return false;
      }
    },

    async clear(): Promise<void> {
      const s3 = await getS3();
      const { ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
      const list = await s3.send(new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
      }));
      if (!list.Contents || list.Contents.length === 0) return;
      await s3.send(new DeleteObjectsCommand({
        Bucket: config.bucket,
        Delete: {
          Objects: list.Contents.map((obj: any) => ({ Key: obj.Key })),
        },
      }));
    },

    async keys(): Promise<string[]> {
      const s3 = await getS3();
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      const list = await s3.send(new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
      }));
      return (list.Contents ?? []).map((obj: any) => (obj.Key as string).slice(prefix.length));
    },
  };
}

// --- HTTP backend ---

function createHttpCache(config: RemoteCacheConfig, prefix: string, _ttl: number): RemoteBuildCache {
  const endpoint = config.endpoint ?? 'http://localhost:6379';

  return {
    async get(key: string): Promise<RemoteCacheEntry | null> {
      try {
        const res = await fetch(`${endpoint}/${encodeURIComponent(prefix + key)}`);
        if (!res.ok) return null;
        const data = Buffer.from(await res.arrayBuffer());
        return { key, data, timestamp: Date.now(), hash: createHash(data) };
      } catch {
        return null;
      }
    },

    async set(key: string, data: Buffer, _tags?: string[]): Promise<void> {
      await fetch(`${endpoint}/${encodeURIComponent(prefix + key)}`, {
        method: 'PUT',
        body: new Uint8Array(data) as unknown as BodyInit,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
    },

    async delete(key: string): Promise<void> {
      await fetch(`${endpoint}/${encodeURIComponent(prefix + key)}`, { method: 'DELETE' });
    },

    async has(key: string): Promise<boolean> {
      const res = await fetch(`${endpoint}/${encodeURIComponent(prefix + key)}`, { method: 'HEAD' });
      return res.ok;
    },

    async clear(): Promise<void> {
      await fetch(`${endpoint}/${encodeURIComponent(prefix)}`, { method: 'DELETE' });
    },

    async keys(): Promise<string[]> {
      const res = await fetch(`${endpoint}/?prefix=${encodeURIComponent(prefix)}`);
      if (!res.ok) return [];
      const data = await res.json() as string[];
      return data.map((k) => k.slice(prefix.length));
    },
  };
}

function createHash(data: Buffer): string {
  const { createHash: nodeCreateHash } = require('node:crypto');
  return nodeCreateHash('sha256').update(data).digest('hex');
}
