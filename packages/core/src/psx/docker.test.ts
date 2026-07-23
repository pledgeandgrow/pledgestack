import { describe, it, expect } from 'vitest';
import { generateDockerfile, generateDockerignore, estimateImageSize } from './docker';

describe('PSX Docker', () => {
  describe('generateDockerfile', () => {
    it('generates a multi-stage Dockerfile', () => {
      const dockerfile = generateDockerfile();
      expect(dockerfile).toContain('FROM');
      expect(dockerfile).toContain('rust-builder');
      expect(dockerfile).toContain('js-builder');
      expect(dockerfile).toContain('runtime');
    });

    it('includes LTO and strip in build', () => {
      const dockerfile = generateDockerfile({ strip: true, lto: true });
      expect(dockerfile).toContain('strip');
    });

    it('supports Alpine images', () => {
      const dockerfile = generateDockerfile({ useAlpine: true });
      expect(dockerfile).toContain('alpine');
      expect(dockerfile).toContain('apk add');
    });

    it('supports slim images', () => {
      const dockerfile = generateDockerfile({ useAlpine: false });
      expect(dockerfile).toContain('slim');
      expect(dockerfile).toContain('apt-get');
    });

    it('creates non-root user', () => {
      const dockerfile = generateDockerfile();
      expect(dockerfile).toContain('pledgestack');
      expect(dockerfile).toContain('USER pledgestack');
    });

    it('includes health check', () => {
      const dockerfile = generateDockerfile({ port: 3000 });
      expect(dockerfile).toContain('HEALTHCHECK');
      expect(dockerfile).toContain('3000');
    });

    it('uses custom entry point', () => {
      const dockerfile = generateDockerfile({ entryPoint: 'dist/server/index.js' });
      expect(dockerfile).toContain('dist/server/index.js');
    });
  });

  describe('generateDockerignore', () => {
    it('excludes node_modules', () => {
      const ignore = generateDockerignore();
      expect(ignore).toContain('node_modules');
    });

    it('excludes .git', () => {
      const ignore = generateDockerignore();
      expect(ignore).toContain('.git');
    });

    it('excludes test files', () => {
      const ignore = generateDockerignore();
      expect(ignore).toContain('*.test.ts');
    });
  });

  describe('estimateImageSize', () => {
    it('estimates slim image size', () => {
      const estimate = estimateImageSize({ useAlpine: false });
      expect(estimate.sizeMB).toBeGreaterThan(0);
      expect(estimate.breakdown['base-image']).toBeGreaterThan(0);
    });

    it('estimates alpine image size (smaller)', () => {
      const alpine = estimateImageSize({ useAlpine: true });
      const slim = estimateImageSize({ useAlpine: false });
      expect(alpine.sizeMB).toBeLessThan(slim.sizeMB);
    });
  });
});
