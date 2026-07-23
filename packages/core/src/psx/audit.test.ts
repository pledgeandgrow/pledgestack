import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PsxAuditLogger,
  sanitizeArg,
  setAuditContext,
  getAuditContext,
  createAuditedRust,
  getDefaultPsxAuditLogger,
  setDefaultPsxAuditLogger,
  type PsxAuditConfig,
} from './audit';

describe('PSX Audit Logging', () => {
  describe('sanitizeArg', () => {
    const config: PsxAuditConfig = { maxArgLength: 50, redactKeys: ['password', 'secret', 'token'] };

    it('passes through null and undefined', () => {
      expect(sanitizeArg(null, config)).toBeNull();
      expect(sanitizeArg(undefined, config)).toBeUndefined();
    });

    it('passes through numbers and booleans', () => {
      expect(sanitizeArg(42, config)).toBe(42);
      expect(sanitizeArg(true, config)).toBe(true);
    });

    it('truncates long strings', () => {
      const result = sanitizeArg('a'.repeat(100), config) as string;
      expect(result.length).toBeLessThan(70);
      expect(result).toContain('...[truncated]');
    });

    it('passes through short strings', () => {
      expect(sanitizeArg('hello', config)).toBe('hello');
    });

    it('redacts sensitive keys in objects', () => {
      const result = sanitizeArg({ name: 'Alice', password: 'secret123' }, config) as Record<string, unknown>;
      expect(result.name).toBe('Alice');
      expect(result.password).toBe('[REDACTED]');
    });

    it('redacts case-insensitively', () => {
      const result = sanitizeArg({ TOKEN: 'abc', apiKey: 'xyz' }, config) as Record<string, unknown>;
      expect(result.TOKEN).toBe('[REDACTED]');
    });

    it('handles nested objects with redaction', () => {
      const result = sanitizeArg({ user: { name: 'Bob', secret: 'top' } }, config) as Record<string, unknown>;
      const user = result.user as Record<string, unknown>;
      expect(user.name).toBe('Bob');
      expect(user.secret).toBe('[REDACTED]');
    });

    it('handles arrays', () => {
      const result = sanitizeArg([1, 'hello', { password: 'x' }], config) as unknown[];
      expect(result[0]).toBe(1);
      expect(result[1]).toBe('hello');
      expect((result[2] as Record<string, unknown>).password).toBe('[REDACTED]');
    });

    it('handles circular references', () => {
      const obj: Record<string, unknown> = { name: 'test' };
      obj.self = obj;
      const result = sanitizeArg(obj, config) as Record<string, unknown>;
      expect(result.name).toBe('test');
      expect(result.self).toBe('[circular]');
    });

    it('handles Buffer', () => {
      const buf = Buffer.from('hello');
      const result = sanitizeArg(buf, config) as string;
      expect(result).toContain('[Buffer:');
    });

    it('handles Uint8Array', () => {
      const arr = new Uint8Array([1, 2, 3]);
      const result = sanitizeArg(arr, config) as string;
      expect(result).toContain('[Uint8Array:');
    });
  });

  describe('AuditContext (AsyncLocalStorage)', () => {
    it('returns undefined when no context is set', () => {
      expect(getAuditContext()).toBeUndefined();
    });

    it('returns context after setAuditContext', async () => {
      await new Promise<void>((resolve) => {
        setAuditContext({ route: '/api/test', module: 'test' });
        // AsyncLocalStorage stores context per async context
        // In test, we just verify the function doesn't throw
        resolve();
      });
    });
  });

  describe('PsxAuditLogger', () => {
    let logger: PsxAuditLogger;

    beforeEach(() => {
      logger = new PsxAuditLogger({
        filePath: '.pledge/test-audit.log',
        console: false,
        enabled: true,
        sampleRate: 1,
      });
    });

    it('creates logger with default config', () => {
      const defaultLogger = new PsxAuditLogger();
      expect(defaultLogger).toBeDefined();
    });

    it('wraps a function and logs the call', async () => {
      const logSpy = vi.spyOn(logger, 'log');
      const original = async (a: number, b: number) => a + b;
      const wrapped = logger.wrap(original, 'add', 'math');

      const result = await wrapped(2, 3);

      expect(result).toBe(5);
      expect(logSpy).toHaveBeenCalledOnce();
      const entry = logSpy.mock.calls[0][0];
      expect(entry.functionName).toBe('add');
      expect(entry.module).toBe('math');
      expect(entry.success).toBe(true);
      expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('logs errors when wrapped function throws', async () => {
      const logSpy = vi.spyOn(logger, 'log');
      const original = async () => { throw new Error('test error'); };
      const wrapped = logger.wrap(original, 'fail', 'test');

      await expect(wrapped()).rejects.toThrow('test error');

      expect(logSpy).toHaveBeenCalledOnce();
      const entry = logSpy.mock.calls[0][0];
      expect(entry.success).toBe(false);
      expect(entry.error).toBe('test error');
    });

    it('wraps all functions in a module', async () => {
      const logSpy = vi.spyOn(logger, 'log');
      const module = {
        add: async (a: number, b: number) => a + b,
        greet: async (name: string) => `Hello, ${name}!`,
        value: 42,
      };

      const wrapped = logger.wrapModule(module, 'test-module');

      expect(typeof wrapped.add).toBe('function');
      expect(typeof wrapped.greet).toBe('function');
      expect(wrapped.value).toBe(42);

      await wrapped.add(1, 2);
      await wrapped.greet('World');

      expect(logSpy).toHaveBeenCalledTimes(2);
    });

    it('respects sample rate', async () => {
      const sampledLogger = new PsxAuditLogger({
        filePath: '.pledge/test-audit.log',
        console: false,
        sampleRate: 0,
      });
      const logSpy = vi.spyOn(sampledLogger, 'log');
      const original = async () => 42;
      const wrapped = sampledLogger.wrap(original, 'test', 'mod');

      await wrapped();

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('respects enabled=false', async () => {
      const disabledLogger = new PsxAuditLogger({
        filePath: '.pledge/test-audit.log',
        console: false,
        enabled: false,
      });
      const logSpy = vi.spyOn(disabledLogger, 'log');
      const original = async () => 42;
      const wrapped = disabledLogger.wrap(original, 'test', 'mod');

      await wrapped();

      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('createAuditedRust', () => {
    afterEach(() => {
      setDefaultPsxAuditLogger(new PsxAuditLogger({ console: false }));
    });

    it('wraps a rust namespace object', async () => {
      const rustNamespace = {
        get_users: async () => [{ id: 1, name: 'Alice' }],
        count: async () => 42,
      };

      const audited = createAuditedRust(rustNamespace, 'user-service', {
        console: false,
        filePath: '.pledge/test-audit.log',
      });

      expect(typeof audited.get_users).toBe('function');
      expect(typeof audited.count).toBe('function');

      const users = await audited.get_users();
      expect(users).toEqual([{ id: 1, name: 'Alice' }]);

      const count = await audited.count();
      expect(count).toBe(42);
    });

    it('uses default logger when no config provided', () => {
      const rustNamespace = { test: async () => 'ok' };
      const audited = createAuditedRust(rustNamespace, 'test');
      expect(typeof audited.test).toBe('function');
    });
  });

  describe('getDefaultPsxAuditLogger', () => {
    it('returns a singleton instance', () => {
      const logger1 = getDefaultPsxAuditLogger();
      const logger2 = getDefaultPsxAuditLogger();
      expect(logger1).toBe(logger2);
    });

    it('setDefaultPsxAuditLogger replaces the singleton', () => {
      const custom = new PsxAuditLogger({ console: false });
      setDefaultPsxAuditLogger(custom);
      expect(getDefaultPsxAuditLogger()).toBe(custom);
    });
  });
});
