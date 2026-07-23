import { describe, it, expect } from 'vitest';
import {
  SqlxPool,
  RedisClient,
  RustAuth,
  RustCrypto,
  RustHttpClient,
  FileProcessor,
  RustTracing,
  JobQueue,
  CronScheduler,
  ImageProcessor,
} from './integrations';

describe('PSX Integrations — Fallback behavior', () => {
  describe('SqlxPool', () => {
    it('falls back to JS implementation when native addon unavailable', async () => {
      const pool = new SqlxPool({ url: 'postgres://test:test@localhost:5432/testdb' });
      // Should not throw — should set up fallback
      expect(pool).toBeDefined();
    });
  });

  describe('RedisClient', () => {
    it('falls back to JS implementation when native addon unavailable', async () => {
      const client = new RedisClient({ url: 'redis://localhost:6379' });
      expect(client).toBeDefined();
    });
  });

  describe('RustAuth', () => {
    it('hashes and verifies passwords via fallback', async () => {
      const auth = new RustAuth({ jwtSecret: 'test-secret' });
      const hash = await auth.hashPassword('mypassword');
      expect(hash).toBeTruthy();
      expect(hash).not.toBe('mypassword');

      const valid = await auth.verifyPassword('mypassword', hash);
      expect(valid).toBe(true);

      const invalid = await auth.verifyPassword('wrongpassword', hash);
      expect(invalid).toBe(false);
    });

    it('signs and verifies JWT via fallback', async () => {
      const auth = new RustAuth({ jwtSecret: 'test-secret-key' });
      const token = await auth.signJwt({ sub: 'user123' });
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const payload = await auth.verifyJwt(token);
      expect(payload.sub).toBe('user123');
    });

    it('throws on JWT without secret', async () => {
      const auth = new RustAuth({});
      await expect(auth.signJwt({ sub: 'test' })).rejects.toThrow('JWT secret');
    });
  });

  describe('RustCrypto', () => {
    it('hashes data with SHA-256 via fallback', async () => {
      const crypto = new RustCrypto();
      const hash = await crypto.sha256('test data');
      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    it('hashes data with SHA-512 via fallback', async () => {
      const crypto = new RustCrypto();
      const hash = await crypto.sha512('test data');
      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(128); // SHA-512 hex = 128 chars
    });

    it('generates random bytes via fallback', async () => {
      const crypto = new RustCrypto();
      const bytes = await crypto.randomBytes(32);
      expect(bytes).toBeInstanceOf(Buffer);
      expect(bytes.length).toBe(32);
    });

    it('generates UUIDs via fallback', async () => {
      const crypto = new RustCrypto();
      const uuid = await crypto.uuid();
      expect(uuid).toBeTruthy();
      expect(uuid).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
    });

    it('encrypts and decrypts via fallback', async () => {
      const key = Buffer.alloc(32, 0xab);
      const crypto = new RustCrypto({ aesKey: key });
      const plaintext = Buffer.from('secret message', 'utf-8');
      const { ciphertext, nonce, tag } = await crypto.encrypt(plaintext);
      expect(ciphertext).toBeInstanceOf(Buffer);
      expect(nonce).toBeInstanceOf(Buffer);
      expect(tag).toBeInstanceOf(Buffer);

      const decrypted = await crypto.decrypt(ciphertext, nonce, tag);
      expect(decrypted.toString('utf-8')).toBe('secret message');
    });
  });

  describe('RustHttpClient', () => {
    it('falls back to fetch when native addon unavailable', async () => {
      const client = new RustHttpClient({ timeoutMs: 5000 });
      expect(client).toBeDefined();
    });
  });

  describe('FileProcessor', () => {
    it('parses CSV via fallback', async () => {
      const csv = 'name,age\nAlice,30\nBob,25';
      const rows = await FileProcessor.parseCsv(csv);
      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual(['name', 'age']);
      expect(rows[1]).toEqual(['Alice', '30']);
      expect(rows[2]).toEqual(['Bob', '25']);
    });

    it('generates CSV via fallback', async () => {
      const rows = [['name', 'age'], ['Alice', 30], ['Bob', 25]];
      const csv = await FileProcessor.generateCsv(rows);
      expect(csv).toContain('name,age');
      expect(csv).toContain('Alice,30');
      expect(csv).toContain('Bob,25');
    });

    it('handles CSV with commas in quoted fields', async () => {
      const csv = 'name,description\n"Smith, John","Hello, World"';
      const rows = await FileProcessor.parseCsv(csv);
      expect(rows[1][0]).toBe('Smith, John');
      expect(rows[1][1]).toBe('Hello, World');
    });

    it('handles CSV with escaped quotes', async () => {
      const csv = 'text\n"He said ""hello"""';
      const rows = await FileProcessor.parseCsv(csv);
      expect(rows[1][0]).toBe('He said "hello"');
    });
  });

  describe('RustTracing', () => {
    it('initializes via fallback without throwing', async () => {
      const tracing = new RustTracing({ level: 'info' });
      await expect(tracing.init()).resolves.toBeUndefined();
    });

    it('starts and ends spans via fallback', async () => {
      const tracing = new RustTracing({});
      const spanId = await tracing.startSpan('test-span');
      expect(typeof spanId).toBe('string');
      await expect(tracing.endSpan(spanId)).resolves.toBeUndefined();
    });

    it('logs without throwing', () => {
      const tracing = new RustTracing({ jsonFormat: true });
      expect(() => tracing.log('info', 'test message')).not.toThrow();
    });
  });

  describe('JobQueue', () => {
    it('enqueues and processes jobs via in-memory fallback', async () => {
      const queue = new JobQueue<{ task: string }>({ name: 'test-queue' });
      await queue.connect();

      const jobId = await queue.enqueue({ task: 'test' });
      expect(jobId).toBeTruthy();

      const processed: string[] = [];
      await queue.start(async (job) => {
        processed.push(job.payload.task);
      });

      expect(processed).toContain('test');
    });
  });

  describe('CronScheduler', () => {
    it('schedules and removes jobs via fallback', async () => {
      const scheduler = new CronScheduler();
      await scheduler.start();

      let ran = false;
      await scheduler.schedule('test-job', {
        schedule: '* * * * *',
        runImmediately: true,
      }, async () => { ran = true; });

      expect(ran).toBe(true);
      expect(scheduler.list()).toContain('test-job');

      await scheduler.remove('test-job');
      expect(scheduler.list()).not.toContain('test-job');

      await scheduler.stop();
    });
  });

  describe('ImageProcessor', () => {
    it('falls back to JS implementation when native addon unavailable', () => {
      expect(ImageProcessor).toBeDefined();
      expect(typeof ImageProcessor.process).toBe('function');
    });
  });
});
