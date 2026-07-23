import { describe, it, expect } from 'vitest';
import { parseSemver, satisfiesVersion, detectBreakingChanges, checkCompatibility } from './version-compat';

describe('PSX Version Compatibility', () => {
  describe('parseSemver', () => {
    it('parses full version', () => {
      const v = parseSemver('1.2.3');
      expect(v).toEqual({ major: 1, minor: 2, patch: 3, preRelease: undefined });
    });

    it('parses pre-release version', () => {
      const v = parseSemver('1.0.0-beta.1');
      expect(v?.major).toBe(1);
      expect(v?.preRelease).toBe('beta.1');
    });

    it('returns null for invalid version', () => {
      expect(parseSemver('invalid')).toBeNull();
    });
  });

  describe('satisfiesVersion', () => {
    it('checks caret range', () => {
      expect(satisfiesVersion('1.2.5', '^1.2.3')).toBe(true);
      expect(satisfiesVersion('1.3.0', '^1.2.3')).toBe(true);
      expect(satisfiesVersion('2.0.0', '^1.2.3')).toBe(false);
    });

    it('checks tilde range', () => {
      expect(satisfiesVersion('1.2.5', '~1.2.3')).toBe(true);
      expect(satisfiesVersion('1.3.0', '~1.2.3')).toBe(false);
    });

    it('checks major-only range', () => {
      expect(satisfiesVersion('1.5.0', '1')).toBe(true);
      expect(satisfiesVersion('2.0.0', '1')).toBe(false);
    });

    it('checks exact version', () => {
      expect(satisfiesVersion('1.2.3', '1.2.3')).toBe(true);
      expect(satisfiesVersion('1.2.4', '1.2.3')).toBe(false);
    });
  });

  describe('detectBreakingChanges', () => {
    it('detects major version bump', () => {
      const changes = detectBreakingChanges('tokio', '0.2.0', '1.0.0');
      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some(c => c.includes('Major version bump'))).toBe(true);
    });

    it('returns empty for minor bump', () => {
      const changes = detectBreakingChanges('serde', '1.0.0', '1.2.0');
      expect(changes.length).toBe(0);
    });

    it('returns known breaking changes for napi 2', () => {
      const changes = detectBreakingChanges('napi', '1.0.0', '2.0.0');
      expect(changes.some(c => c.includes('API redesign'))).toBe(true);
    });
  });

  describe('checkCompatibility', () => {
    it('returns compatible for new crate', () => {
      const result = checkCompatibility('/nonexistent/Cargo.toml', 'new-crate', '1.0.0');
      expect(result.compatible).toBe(true);
      expect(result.currentVersion).toBe('(not installed)');
    });
  });
});
