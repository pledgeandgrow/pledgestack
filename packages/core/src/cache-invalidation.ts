/**
 * Distributed cache invalidation — pub/sub for multi-instance cache busting.
 *
 * When running multiple server instances (e.g., behind a load balancer),
 * each instance has its own in-memory cache. When one instance invalidates
 * a cache entry, the others need to know to clear their local copy.
 *
 * This module provides a pub/sub interface for broadcasting invalidation
 * events to all instances. Supports Redis pub/sub and HTTP webhook backends.
 *
 * Usage:
 *   const bus = createInvalidationBus({ type: 'redis', url: 'redis://...' });
 *   await bus.subscribe((event) => {
 *     if (event.type === 'tag') revalidateTag(event.target);
 *     if (event.type === 'path') revalidatePath(event.target);
 *   });
 *   await bus.publish({ type: 'tag', target: 'posts' });
 */

export type InvalidationEventType = 'tag' | 'path' | 'clear';

export interface InvalidationEvent {
  type: InvalidationEventType;
  target: string;
  timestamp: number;
  origin: string;
}

export type InvalidationHandler = (event: InvalidationEvent) => void;

export interface InvalidationBusConfig {
  type: 'redis' | 'http' | 'memory';
  /** Redis URL */
  url?: string;
  /** HTTP webhook endpoint for broadcasting */
  endpoint?: string;
  /** List of peer endpoints for HTTP bus */
  peers?: string[];
  /** Channel name for pub/sub */
  channel?: string;
  /** Unique instance ID (auto-generated if not provided) */
  instanceId?: string;
}

export interface InvalidationBus {
  publish(event: InvalidationEvent): Promise<void>;
  subscribe(handler: InvalidationHandler): () => void;
  close(): Promise<void>;
}

/**
 * Creates a distributed cache invalidation bus.
 */
export function createInvalidationBus(config: InvalidationBusConfig): InvalidationBus {
  const instanceId = config.instanceId ?? `pledge-${process.pid}-${Date.now()}`;
  const channel = config.channel ?? 'pledge:cache-invalidation';

  switch (config.type) {
    case 'redis':
      return createRedisBus(config, channel, instanceId);
    case 'http':
      return createHttpBus(config, instanceId);
    case 'memory':
    default:
      return createMemoryBus(instanceId);
  }
}

// --- Memory bus (single-instance, for dev) ---

function createMemoryBus(instanceId: string): InvalidationBus {
  const handlers = new Set<InvalidationHandler>();

  return {
    async publish(event: InvalidationEvent): Promise<void> {
      const fullEvent: InvalidationEvent = { ...event, origin: instanceId, timestamp: Date.now() };
      for (const handler of handlers) {
        handler(fullEvent);
      }
    },

    subscribe(handler: InvalidationHandler): () => void {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },

    async close(): Promise<void> {
      handlers.clear();
    },
  };
}

// --- Redis pub/sub bus ---

function createRedisBus(config: InvalidationBusConfig, channel: string, instanceId: string): InvalidationBus {
  const handlers = new Set<InvalidationHandler>();
  let publisher: any = null;
  let subscriber: any = null;
  let connected = false;

  async function ensureConnected() {
    if (connected) return;
    try {
      const { createClient } = await import('redis');
      publisher = createClient({ url: config.url });
      subscriber = createClient({ url: config.url });
      await publisher.connect();
      await subscriber.connect();

      await subscriber.subscribe(channel, (message: string) => {
        try {
          const event = JSON.parse(message) as InvalidationEvent;
          // Ignore our own events
          if (event.origin === instanceId) return;
          for (const handler of handlers) {
            handler(event);
          }
        } catch {
          // Ignore malformed messages
        }
      });

      connected = true;
    } catch {
      // Redis not available — silently degrade to no-op
    }
  }

  return {
    async publish(event: InvalidationEvent): Promise<void> {
      await ensureConnected();
      if (!publisher) return;
      const fullEvent: InvalidationEvent = { ...event, origin: instanceId, timestamp: Date.now() };
      await publisher.publish(channel, JSON.stringify(fullEvent));
      // Also handle locally
      for (const handler of handlers) {
        handler(fullEvent);
      }
    },

    subscribe(handler: InvalidationHandler): () => void {
      handlers.add(handler);
      void ensureConnected();
      return () => handlers.delete(handler);
    },

    async close(): Promise<void> {
      handlers.clear();
      if (subscriber) await subscriber.unsubscribe(channel);
      if (publisher) await publisher.quit();
      if (subscriber) await subscriber.quit();
      connected = false;
    },
  };
}

// --- HTTP webhook bus ---

function createHttpBus(config: InvalidationBusConfig, instanceId: string): InvalidationBus {
  const handlers = new Set<InvalidationHandler>();
  const peers = config.peers ?? [];

  // Set up HTTP server to receive invalidation events from peers
  // (The HTTP server should be integrated with the main PledgeStack server)
  // This is a simplified implementation that broadcasts to peers via fetch

  return {
    async publish(event: InvalidationEvent): Promise<void> {
      const fullEvent: InvalidationEvent = { ...event, origin: instanceId, timestamp: Date.now() };

      // Broadcast to all peers
      const promises = peers.map(async (peer) => {
        try {
          await fetch(`${peer}/__pledge__/cache/invalidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullEvent),
          });
        } catch {
          // Peer may be down — ignore
        }
      });
      await Promise.allSettled(promises);

      // Handle locally
      for (const handler of handlers) {
        handler(fullEvent);
      }
    },

    subscribe(handler: InvalidationHandler): () => void {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },

    async close(): Promise<void> {
      handlers.clear();
    },
  };
}

/**
 * Creates a handler that applies invalidation events to the local cache.
 * Use this with the invalidation bus to keep local cache in sync.
 */
export function createLocalInvalidationHandler(
  revalidateTagFn: (tag: string) => void,
  revalidatePathFn: (path: string) => void,
  clearCacheFn: () => void,
): InvalidationHandler {
  return (event: InvalidationEvent) => {
    switch (event.type) {
      case 'tag':
        revalidateTagFn(event.target);
        break;
      case 'path':
        revalidatePathFn(event.target);
        break;
      case 'clear':
        clearCacheFn();
        break;
    }
  };
}
