/**
 * Integration tests — supply chain security module.
 * Item 68 of the PledgeStack roadmap.
 */
import { describe, it, expect } from 'vitest';
import {
  checkPinnedVersions,
  checkDependencyAllowlist,
  scanForSecrets,
  checkLicenseCompliance,
  generateSBOM,
  generateProvenance,
  verifyProvenance,
} from '../../packages/server/src/supply-chain';

describe('Supply chain security', () => {
  describe('SBOM generation', () => {
    it('generates CycloneDX SBOM', () => {
      const sbom = generateSBOM(process.cwd(), 'cyclonedx');
      expect(sbom.bomFormat).toBe('cyclonedx');
      expect(sbom.serialNumber).toContain('urn:uuid:');
    });

    it('generates SPDX SBOM', () => {
      const sbom = generateSBOM(process.cwd(), 'spdx');
      expect(sbom.bomFormat).toBe('spdx');
    });
  });

  describe('License compliance', () => {
    it('checks licenses and returns result', () => {
      const result = checkLicenseCompliance(process.cwd());
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('totalPackages');
    });
  });

  describe('Pinned dependency versions', () => {
    it('checks pinned versions', () => {
      const result = checkPinnedVersions(process.cwd());
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('violations');
    });
  });

  describe('Provenance attestation', () => {
    it('generates and verifies provenance', () => {
      const attestation = generateProvenance('pledgestack-test', 'abc123', {
        builderId: 'pkg:github/pledgestack/pledgejs',
        buildType: 'https://slsa.dev/build-type/v1',
      });
      expect(attestation.schema).toBe('slsa-provenance');
      const verification = verifyProvenance(attestation);
      expect(verification).toHaveProperty('valid');
      expect(verification).toHaveProperty('errors');
    });
  });

  describe('Dependency allowlist', () => {
    it('checks dependencies against allowlist', () => {
      const result = checkDependencyAllowlist(process.cwd(), {
        allowed: ['pledgestack-*', 'react', 'react-dom'],
      });
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('violations');
    });
  });

  describe('Secret scanning', () => {
    it('scans for secrets and returns findings', () => {
      const result = scanForSecrets(process.cwd());
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('scannedFiles');
    });
  });
});
