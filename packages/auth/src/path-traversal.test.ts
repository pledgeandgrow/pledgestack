import { describe, it, expect } from 'vitest';
import { containsTraversal, safeResolve, sanitizeRoutePath, createFileSandbox } from '../path-traversal';

describe('path-traversal', () => {
  it('detects traversal in path with ..', () => {
    expect(containsTraversal('../../etc/passwd')).toBe(true);
    expect(containsTraversal('foo/../bar')).toBe(true);
    expect(containsTraversal('normal/path')).toBe(false);
  });

  it('safeResolve throws on traversal', () => {
    expect(() => safeResolve('/sandbox', '../../etc/passwd')).toThrow();
    expect(() => safeResolve('/sandbox', 'normal/path')).not.toThrow();
  });

  it('sanitizeRoutePath rejects traversal', () => {
    expect(sanitizeRoutePath('../../etc/passwd')).toBeNull();
    expect(sanitizeRoutePath('normal/path')).toBe('normal/path');
    expect(sanitizeRoutePath('path\0with-null')).toBeNull();
  });

  it('createFileSandbox resolves safe paths', () => {
    const sandbox = createFileSandbox('/project');
    expect(sandbox.isSafe('app/page.tsx')).toBe(true);
    expect(sandbox.isSafe('../../etc/passwd')).toBe(false);
  });

  it('createFileSandbox assertSafe throws on unsafe path', () => {
    const sandbox = createFileSandbox('/project');
    expect(() => sandbox.assertSafe('../../etc/passwd')).toThrow();
    expect(() => sandbox.assertSafe('app/page.tsx')).not.toThrow();
  });
});
