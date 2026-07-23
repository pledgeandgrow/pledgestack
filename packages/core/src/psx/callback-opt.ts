/**
 * #288 — Rust→JS Callback Optimization.
 *
 * Efficient callback handling for Rust→JS callbacks (e.g., streaming
 * handlers), reduce callback overhead, batch callback invocations.
 *
 * Provides:
 * - Batched callback queue for high-frequency Rust→JS calls
 * - Microtask-based flushing for reduced overhead
 * - Callback debouncing and throttling
 * - Integration with PSXB streaming
 */

import { EventEmitter } from 'node:events';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CallbackBatchConfig {
  /** Maximum batch size before auto-flush (default: 100) */
  maxBatchSize?: number;
  /** Maximum time to wait before auto-flush in ms (default: 16ms = one frame) */
  maxBatchDelayMs?: number;
  /** Whether to use microtasks for flushing (default: true) */
  useMicrotasks?: boolean;
}

export type BatchedCallback<T> = (items: T[]) => void | Promise<void>;

// ---------------------------------------------------------------------------
// Batched Callback Queue
// ---------------------------------------------------------------------------

/**
 * Batches high-frequency Rust→JS callbacks into groups to reduce
 * NAPI boundary crossing overhead. Uses microtask-based flushing.
 */
export class BatchedCallbackQueue<T> extends EventEmitter {
  private config: Required<CallbackBatchConfig>;
  private queue: T[] = [];
  private flushScheduled = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private callback: BatchedCallback<T>;
  private totalProcessed = 0;
  private totalBatches = 0;

  constructor(callback: BatchedCallback<T>, config?: CallbackBatchConfig) {
    super();
    this.callback = callback;
    this.config = {
      maxBatchSize: config?.maxBatchSize ?? 100,
      maxBatchDelayMs: config?.maxBatchDelayMs ?? 16,
      useMicrotasks: config?.useMicrotasks ?? true,
    };
  }

  /**
   * Adds an item to the batch queue. Automatically schedules a flush.
   */
  push(item: T): void {
    this.queue.push(item);
    this.emit('queued', { queueSize: this.queue.length });

    // Auto-flush if batch is full
    if (this.queue.length >= this.config.maxBatchSize) {
      this.flush();
      return;
    }

    // Schedule flush if not already scheduled
    if (!this.flushScheduled) {
      this.scheduleFlush();
    }
  }

  /**
   * Adds multiple items to the batch queue.
   */
  pushMany(items: T[]): void {
    for (const item of items) {
      this.queue.push(item);
    }

    if (this.queue.length >= this.config.maxBatchSize) {
      this.flush();
    } else if (!this.flushScheduled) {
      this.scheduleFlush();
    }
  }

  /**
   * Schedules a flush using microtask or setTimeout.
   */
  private scheduleFlush(): void {
    this.flushScheduled = true;

    if (this.config.useMicrotasks) {
      // Use queueMicrotask for near-immediate flushing
      queueMicrotask(() => this.flush());
    } else {
      // Use setTimeout for time-based batching
      this.flushTimer = setTimeout(() => this.flush(), this.config.maxBatchDelayMs);
    }
  }

  /**
   * Flushes the current batch, invoking the callback with all queued items.
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushScheduled = false;

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0);
    this.totalBatches++;
    this.totalProcessed += batch.length;

    this.emit('flush', { batchSize: batch.length, totalBatches: this.totalBatches });

    try {
      await this.callback(batch);
      this.emit('flushed', { batchSize: batch.length });
    } catch (err) {
      this.emit('error', { error: err as Error, batch });
    }
  }

  /**
   * Returns current queue statistics.
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      totalProcessed: this.totalProcessed,
      totalBatches: this.totalBatches,
      avgBatchSize: this.totalBatches > 0 ? this.totalProcessed / this.totalBatches : 0,
    };
  }

  /**
   * Clears the queue without flushing.
   */
  clear(): void {
    this.queue = [];
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushScheduled = false;
  }
}

// ---------------------------------------------------------------------------
// Debounced Callback
// ---------------------------------------------------------------------------

/**
 * Debounces a Rust→JS callback, only invoking after a quiet period.
 */
export class DebouncedCallback<T> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastValue: T | undefined;
  private callback: (value: T) => void | Promise<void>;
  private delayMs: number;

  constructor(callback: (value: T) => void | Promise<void>, delayMs: number = 100) {
    this.callback = callback;
    this.delayMs = delayMs;
  }

  call(value: T): void {
    this.lastValue = value;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.lastValue !== undefined) {
        this.callback(this.lastValue);
      }
    }, this.delayMs);
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.lastValue !== undefined) {
      this.callback(this.lastValue);
    }
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.lastValue = undefined;
  }
}

// ---------------------------------------------------------------------------
// Throttled Callback
// ---------------------------------------------------------------------------

/**
 * Throttles a Rust→JS callback, invoking at most once per period.
 */
export class ThrottledCallback<T> {
  private lastCallTime = 0;
  private pendingValue: T | undefined;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private callback: (value: T) => void | Promise<void>;
  private periodMs: number;

  constructor(callback: (value: T) => void | Promise<void>, periodMs: number = 16) {
    this.callback = callback;
    this.periodMs = periodMs;
  }

  call(value: T): void {
    const now = Date.now();
    const elapsed = now - this.lastCallTime;

    if (elapsed >= this.periodMs) {
      this.lastCallTime = now;
      this.callback(value);
    } else {
      // Schedule trailing call
      this.pendingValue = value;
      if (!this.timer) {
        this.timer = setTimeout(() => {
          if (this.pendingValue !== undefined) {
            this.lastCallTime = Date.now();
            this.callback(this.pendingValue);
            this.pendingValue = undefined;
          }
          this.timer = null;
        }, this.periodMs - elapsed);
      }
    }
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingValue = undefined;
  }
}

// ---------------------------------------------------------------------------
// Callback Registry (for Rust→JS callbacks via NAPI)
// ---------------------------------------------------------------------------

/**
 * Registry for managing JS callbacks that can be invoked from Rust.
 * Supports batching, debouncing, and throttling.
 */
export class CallbackRegistry {
  private callbacks = new Map<string, BatchedCallbackQueue<unknown> | DebouncedCallback<unknown> | ThrottledCallback<unknown>>();

  /**
   * Registers a batched callback.
   */
  registerBatched<T>(
    name: string,
    callback: BatchedCallback<T>,
    config?: CallbackBatchConfig,
  ): BatchedCallbackQueue<T> {
    const queue = new BatchedCallbackQueue(callback, config);
    this.callbacks.set(name, queue as unknown as BatchedCallbackQueue<unknown>);
    return queue;
  }

  /**
   * Registers a debounced callback.
   */
  registerDebounced<T>(
    name: string,
    callback: (value: T) => void | Promise<void>,
    delayMs?: number,
  ): DebouncedCallback<T> {
    const debounced = new DebouncedCallback(callback, delayMs);
    this.callbacks.set(name, debounced as unknown as DebouncedCallback<unknown>);
    return debounced;
  }

  /**
   * Registers a throttled callback.
   */
  registerThrottled<T>(
    name: string,
    callback: (value: T) => void | Promise<void>,
    periodMs?: number,
  ): ThrottledCallback<T> {
    const throttled = new ThrottledCallback(callback, periodMs);
    this.callbacks.set(name, throttled as unknown as ThrottledCallback<unknown>);
    return throttled;
  }

  /**
   * Gets a registered callback by name.
   */
  get(name: string): BatchedCallbackQueue<unknown> | DebouncedCallback<unknown> | ThrottledCallback<unknown> | undefined {
    return this.callbacks.get(name);
  }

  /**
   * Flushes all batched callbacks.
   */
  async flushAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const cb of this.callbacks.values()) {
      if (cb instanceof BatchedCallbackQueue) {
        promises.push(cb.flush());
      } else if (cb instanceof DebouncedCallback) {
        cb.flush();
      }
    }
    await Promise.all(promises);
  }

  /**
   * Clears all registered callbacks.
   */
  clear(): void {
    for (const cb of this.callbacks.values()) {
      if (cb instanceof BatchedCallbackQueue) cb.clear();
      else if (cb instanceof DebouncedCallback) cb.cancel();
      else if (cb instanceof ThrottledCallback) cb.cancel();
    }
    this.callbacks.clear();
  }
}
