import { describe, it, expect } from 'vitest';
import { sanitizeObject, safeJsonStringify, safeJsonParse } from '../sanitize';

describe('sanitize', () => {
  it('removes __proto__ from objects', () => {
    const input = { name: 'test', __proto__: { admin: true } };
    const result = sanitizeObject(input);
    expect(result).not.toHaveProperty('__proto__');
    expect(result.name).toBe('test');
  });

  it('removes constructor from objects', () => {
    const input = { data: 'ok', constructor: { prototype: { admin: true } } };
    const result = sanitizeObject(input);
    expect(result).not.toHaveProperty('constructor');
    expect(result.data).toBe('ok');
  });

  it('handles nested objects', () => {
    const input = { level1: { level2: { __proto__: { hacked: true }, data: 'ok' } } };
    const result = sanitizeObject(input);
    expect(result.level1.level2).not.toHaveProperty('__proto__');
    expect(result.level1.level2.data).toBe('ok');
  });

  it('handles arrays', () => {
    const input = [{ __proto__: { x: 1 } }, { data: 'ok' }];
    const result = sanitizeObject(input);
    expect(result[0]).not.toHaveProperty('__proto__');
    expect(result[1].data).toBe('ok');
  });

  it('safeJsonStringify removes dangerous keys', () => {
    const input = { name: 'test', __proto__: { admin: true } };
    const json = safeJsonStringify(input);
    expect(json).not.toContain('__proto__');
    expect(json).toContain('"name":"test"');
  });

  it('safeJsonParse removes dangerous keys', () => {
    const json = '{"name":"test","__proto__":{"admin":true}}';
    const result = safeJsonParse<{ name: string; admin?: boolean }>(json);
    expect(result.name).toBe('test');
    expect(result.admin).toBeUndefined();
  });
});
