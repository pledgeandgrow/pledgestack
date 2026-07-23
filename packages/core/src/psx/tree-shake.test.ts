import { describe, it, expect } from 'vitest';
import { analyzeCargoFeatures } from './tree-shake';
import { treeShakeAnalysis, formatTreeShakeResult } from './tree-shake';

describe('PSX Tree Shaking', () => {
  describe('analyzeCargoFeatures', () => {
    it('returns empty for nonexistent file', () => {
      const result = analyzeCargoFeatures('/nonexistent/Cargo.toml');
      expect(result).toEqual([]);
    });
  });

  describe('treeShakeAnalysis', () => {
    it('returns result with warnings array', () => {
      const result = treeShakeAnalysis('/nonexistent');
      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.totalPotentialSavingsKB).toBeGreaterThanOrEqual(0);
    });
  });

  describe('formatTreeShakeResult', () => {
    it('formats result with no warnings', () => {
      const result = {
        crateUsages: [],
        unusedCrates: [],
        totalPotentialSavingsKB: 0,
        optimizedCargoToml: '',
        warnings: [],
      };
      const formatted = formatTreeShakeResult(result);
      expect(formatted).toContain('Tree Shaking');
    });

    it('formats result with warnings', () => {
      const result = {
        crateUsages: [{
          crate: 'tokio',
          allFeatures: ['full'],
          usedFeatures: ['rt', 'macros', 'net', 'io-util', 'time'],
          unusedFeatures: ['full'],
          defaultFeatures: true,
          recommendedFeatures: ['rt', 'macros', 'net', 'io-util', 'time'],
          potentialSizeSavingsKB: 50,
        }],
        unusedCrates: ['unused-crate'],
        totalPotentialSavingsKB: 50,
        optimizedCargoToml: '',
        warnings: ['tokio: 1 unused feature(s): full'],
      };
      const formatted = formatTreeShakeResult(result);
      expect(formatted).toContain('tokio');
      expect(formatted).toContain('unused-crate');
    });
  });
});
