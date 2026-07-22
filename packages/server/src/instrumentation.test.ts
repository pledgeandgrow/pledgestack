import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerInstrumentation,
  runInstrumentation,
  clearInstrumentation,
  getRegisteredInstrumentations,
  type InstrumentationContext,
} from './instrumentation';

describe('instrumentation', () => {
  beforeEach(() => {
    clearInstrumentation();
  });

  it('registers and lists instrumentation functions', () => {
    const fn = vi.fn();
    registerInstrumentation('test-hook', fn);

    expect(getRegisteredInstrumentations()).toEqual(['test-hook']);
  });

  it('runs registered instrumentation functions with context', async () => {
    const fn = vi.fn();
    registerInstrumentation('test-hook', fn);

    const ctx: InstrumentationContext = {
      config: { rootDir: '/app', appDir: 'app' } as InstrumentationContext['config'],
      server: {},
      isDev: false,
    };

    await runInstrumentation(ctx);

    expect(fn).toHaveBeenCalledWith(ctx);
  });

  it('runs multiple instrumentation functions in registration order', async () => {
    const order: string[] = [];
    registerInstrumentation('first', async () => {
      order.push('first');
    });
    registerInstrumentation('second', async () => {
      order.push('second');
    });

    await runInstrumentation({} as InstrumentationContext);

    expect(order).toEqual(['first', 'second']);
  });

  it('throws when an instrumentation function fails', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('boom'));
    registerInstrumentation('failing', failingFn);

    await expect(runInstrumentation({} as InstrumentationContext)).rejects.toThrow('boom');
  });

  it('clears all registered instrumentations', () => {
    registerInstrumentation('a', vi.fn());
    registerInstrumentation('b', vi.fn());

    clearInstrumentation();

    expect(getRegisteredInstrumentations()).toEqual([]);
  });

  it('supports async instrumentation functions', async () => {
    let resolved = false;
    registerInstrumentation('async-hook', async () => {
      await new Promise((r) => setTimeout(r, 10));
      resolved = true;
    });

    await runInstrumentation({} as InstrumentationContext);

    expect(resolved).toBe(true);
  });

  it('does not run anything when no instrumentations are registered', async () => {
    await expect(runInstrumentation({} as InstrumentationContext)).resolves.toBeUndefined();
  });
});
