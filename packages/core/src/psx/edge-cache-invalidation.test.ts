import { describe, it, expect, beforeEach } from 'vitest';
import { CacheInvalidationManager, generateInvalidationConfig } from './edge-cache-invalidation';

describe('Edge Cache Invalidation (#277)', () => {
  let manager: CacheInvalidationManager;

  beforeEach(() => {
    manager = new CacheInvalidationManager({
      platform: 'cloudflare',
      regions: ['us-east', 'eu-west'],
    });
  });

  describe('invalidateKeys', () => {
    it('invalidates keys across regions', async () => {
      const result = await manager.invalidateKeys(['key1', 'key2']);
      expect(result.invalidated).toBe(2);
      expect(result.regions).toContain('us-east');
      expect(result.regions).toContain('eu-west');
    });

    it('generates event ID', async () => {
      const result = await manager.invalidateKeys(['key1']);
      expect(result.eventId).toBeTruthy();
      expect(result.eventId).toContain('inv_');
    });
  });

  describe('tag-based invalidation', () => {
    it('invalidates by tags', async () => {
      manager.tagKey('key1', ['posts']);
      manager.tagKey('key2', ['posts']);
      manager.tagKey('key3', ['users']);
      const result = await manager.invalidateTags(['posts']);
      expect(result.invalidated).toBe(2);
    });
  });

  describe('invalidateAll', () => {
    it('invalidates all entries', async () => {
      const result = await manager.invalidateAll();
      expect(result.invalidated).toBe(1);
    });
  });

  describe('event tracking', () => {
    it('tracks event status', async () => {
      const result = await manager.invalidateKeys(['key1']);
      const status = manager.getEventStatus(result.eventId);
      expect(status?.status).toBe('complete');
    });

    it('lists recent events', async () => {
      await manager.invalidateKeys(['key1']);
      await manager.invalidateKeys(['key2']);
      const events = manager.listEvents();
      expect(events.length).toBe(2);
    });
  });

  describe('generateInvalidationConfig', () => {
    it('generates config file content', () => {
      const config = generateInvalidationConfig({
        platform: 'cloudflare',
        regions: ['us-east'],
      });
      expect(config).toContain('cloudflare');
      expect(config).toContain('us-east');
    });
  });
});
