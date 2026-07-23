import { describe, it, expect } from 'vitest';
import { isRustSSRAvailable } from './rust-ssr';

describe('rust-ssr', () => {
  describe('isRustSSRAvailable', () => {
    it('returns a boolean without throwing', () => {
      expect(typeof isRustSSRAvailable()).toBe('boolean');
    });

    it('returns false when native addon is not compiled', () => {
      // In test environment, the native addon is not available
      expect(isRustSSRAvailable()).toBe(false);
    });

    it('caches the availability check', () => {
      const first = isRustSSRAvailable();
      const second = isRustSSRAvailable();
      expect(first).toBe(second);
    });
  });
});
