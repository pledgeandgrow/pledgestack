import { describe, it, expect, beforeEach } from 'vitest';
import { createKvAdapter, detectKvPlatform, type KvAdapter } from './edge-kv';

describe('Edge KV Integration (#272)', () => {
  let kv: KvAdapter;

  beforeEach(() => {
    kv = createKvAdapter({ platform: 'memory', namespace: 'test' });
  });

  describe('basic operations', () => {
    it('puts and gets a value', async () => {
      await kv.put('key1', 'value1');
      const value = await kv.get('key1');
      expect(value).toBe('value1');
    });

    it('returns null for missing key', async () => {
      const value = await kv.get('nonexistent');
      expect(value).toBeNull();
    });

    it('deletes a key', async () => {
      await kv.put('key1', 'value1');
      await kv.delete('key1');
      const value = await kv.get('key1');
      expect(value).toBeNull();
    });
  });

  describe('JSON operations', () => {
    it('puts and gets JSON values', async () => {
      await kv.putJson('user', { name: 'Alice', age: 30 });
      const result = await kv.getJson<{ name: string; age: number }>('user');
      expect(result?.name).toBe('Alice');
      expect(result?.age).toBe(30);
    });

    it('returns null for missing JSON key', async () => {
      const result = await kv.getJson('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('TTL support', () => {
    it('expires keys with TTL', async () => {
      await kv.put('temp', 'value', { expirationTtl: 1 });
      const value = await kv.get('temp');
      expect(value).toBe('value');
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      const expired = await kv.get('temp', { forceFresh: true });
      expect(expired).toBeNull();
    });
  });

  describe('batch operations', () => {
    it('gets multiple keys', async () => {
      await kv.put('a', '1');
      await kv.put('b', '2');
      await kv.put('c', '3');
      const results = await kv.getMany(['a', 'b', 'c', 'd']);
      expect(results).toEqual(['1', '2', '3', null]);
    });

    it('puts multiple entries', async () => {
      await kv.putMany([
        { key: 'x', value: '10' },
        { key: 'y', value: '20' },
      ]);
      expect(await kv.get('x')).toBe('10');
      expect(await kv.get('y')).toBe('20');
    });

    it('deletes multiple keys', async () => {
      await kv.putMany([
        { key: 'x', value: '10' },
        { key: 'y', value: '20' },
      ]);
      await kv.deleteMany(['x', 'y']);
      expect(await kv.get('x')).toBeNull();
      expect(await kv.get('y')).toBeNull();
    });
  });

  describe('list operations', () => {
    it('lists keys with prefix', async () => {
      await kv.put('user:1', 'a');
      await kv.put('user:2', 'b');
      await kv.put('post:1', 'c');
      const result = await kv.list({ prefix: 'user' });
      expect(result.keys.length).toBe(2);
      expect(result.list_complete).toBe(true);
    });
  });

  describe('L1 cache', () => {
    it('caches values in L1', async () => {
      await kv.put('cached', 'value');
      // First get loads from store + caches in L1
      await kv.get('cached');
      // Second get should hit L1
      const value = await kv.get('cached');
      expect(value).toBe('value');
    });
  });

  describe('namespace support', () => {
    it('uses namespace prefix', async () => {
      const namespaced = createKvAdapter({ platform: 'memory', namespace: 'ns' });
      await namespaced.put('key', 'value');
      const result = await namespaced.get('key');
      expect(result).toBe('value');
    });
  });

  describe('detectKvPlatform', () => {
    it('returns a platform', () => {
      const platform = detectKvPlatform();
      expect(typeof platform).toBe('string');
    });
  });
});
