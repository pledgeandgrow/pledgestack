import { describe, it, expect } from 'vitest';
import {
  generateDurableObject,
  generateWranglerConfig,
  DurableObjectManager,
} from './edge-durable-objects';

describe('Edge Durable Objects (#273)', () => {
  describe('generateDurableObject', () => {
    it('generates DO class with WebSocket support', () => {
      const source = generateDurableObject({
        className: 'ChatRoom',
        enableWebsockets: true,
      });
      expect(source).toContain('class ChatRoom');
      expect(source).toContain('WebSocketPair');
      expect(source).toContain('broadcast');
    });

    it('generates DO class with presence tracking', () => {
      const source = generateDurableObject({
        className: 'Presence',
        enableWebsockets: true,
        enablePresence: true,
      });
      expect(source).toContain('updatePresence');
      expect(source).toContain('getPresence');
      expect(source).toContain('removePresence');
    });

    it('generates DO class with distributed locks', () => {
      const source = generateDurableObject({
        className: 'LockManager',
        enableLocks: true,
      });
      expect(source).toContain('acquireLock');
      expect(source).toContain('releaseLock');
      expect(source).toContain('renewLock');
    });

    it('generates basic DO without features', () => {
      const source = generateDurableObject({
        className: 'Simple',
        enableWebsockets: false,
      });
      expect(source).toContain('class Simple');
      expect(source).not.toContain('WebSocketPair');
    });
  });

  describe('generateWranglerConfig', () => {
    it('generates wrangler.toml with DO bindings', () => {
      const config = generateWranglerConfig([
        { name: 'CHAT', className: 'ChatRoom' },
      ]);
      expect(config).toContain('durable_objects_bindings');
      expect(config).toContain('ChatRoom');
      expect(config).toContain('migrations');
    });
  });

  describe('DurableObjectManager', () => {
    it('manages presence entries', () => {
      const manager = new DurableObjectManager({
        className: 'Test',
        enablePresence: true,
      });
      manager.updatePresence('user1', { name: 'Alice' });
      manager.updatePresence('user2', { name: 'Bob' });
      const presence = manager.getPresence();
      expect(presence.length).toBe(2);
    });

    it('removes presence entries', () => {
      const manager = new DurableObjectManager({
        className: 'Test',
        enablePresence: true,
      });
      manager.updatePresence('user1', { name: 'Alice' });
      manager.removePresence('user1');
      const presence = manager.getPresence();
      expect(presence.length).toBe(0);
    });

    it('acquires and releases locks', () => {
      const manager = new DurableObjectManager({
        className: 'Test',
        enableLocks: true,
      });
      expect(manager.acquireLock('resource1', 'holder1')).toBe(true);
      expect(manager.acquireLock('resource1', 'holder2')).toBe(false);
      expect(manager.releaseLock('resource1', 'holder1')).toBe(true);
      expect(manager.acquireLock('resource1', 'holder2')).toBe(true);
    });

    it('renews locks', () => {
      const manager = new DurableObjectManager({
        className: 'Test',
        enableLocks: true,
      });
      manager.acquireLock('resource1', 'holder1');
      expect(manager.renewLock('resource1', 'holder1')).toBe(true);
      expect(manager.renewLock('resource1', 'holder2')).toBe(false);
    });

    it('lists active locks', () => {
      const manager = new DurableObjectManager({
        className: 'Test',
        enableLocks: true,
      });
      manager.acquireLock('r1', 'h1');
      manager.acquireLock('r2', 'h2');
      const locks = manager.getLocks();
      expect(locks.length).toBe(2);
    });
  });
});
