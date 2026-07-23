import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RollbackManager } from './rollback';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('PSX Rollback Support (#301)', () => {
  let manager: RollbackManager;
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `psx-rollback-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    manager = new RollbackManager({ addonDir: testDir });
  });

  afterEach(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  describe('deploy', () => {
    it('deploys a new addon version', () => {
      const addonPath = join(testDir, 'test.node');
      writeFileSync(addonPath, 'fake addon content');
      const result = manager.deploy('test', addonPath, '1.0.0');
      expect(result.success).toBe(true);
      expect(result.version).toBe('1.0.0');
    });

    it('tracks current version', () => {
      const addonPath = join(testDir, 'test.node');
      writeFileSync(addonPath, 'fake addon content');
      manager.deploy('test', addonPath, '1.0.0');
      expect(manager.getCurrentVersion('test')).toBe('1.0.0');
    });

    it('lists versions', () => {
      const addonPath = join(testDir, 'test.node');
      writeFileSync(addonPath, 'v1');
      manager.deploy('test', addonPath, '1.0.0');
      writeFileSync(addonPath, 'v2');
      manager.deploy('test', addonPath, '2.0.0');
      const versions = manager.listVersions('test');
      expect(versions.length).toBe(2);
    });
  });

  describe('rollback', () => {
    it('rolls back to previous version', async () => {
      const addonPath = join(testDir, 'test.node');
      writeFileSync(addonPath, 'v1');
      manager.deploy('test', addonPath, '1.0.0');
      writeFileSync(addonPath, 'v2');
      manager.deploy('test', addonPath, '2.0.0');
      const result = await manager.rollback('test');
      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe('2.0.0');
      expect(result.toVersion).toBe('1.0.0');
    });

    it('rolls back to specific version', async () => {
      const addonPath = join(testDir, 'test.node');
      writeFileSync(addonPath, 'v1');
      manager.deploy('test', addonPath, '1.0.0');
      writeFileSync(addonPath, 'v2');
      manager.deploy('test', addonPath, '2.0.0');
      writeFileSync(addonPath, 'v3');
      manager.deploy('test', addonPath, '3.0.0');
      const result = await manager.rollback('test', '1.0.0');
      expect(result.success).toBe(true);
      expect(result.toVersion).toBe('1.0.0');
    });

    it('fails when no previous version exists', async () => {
      const addonPath = join(testDir, 'test.node');
      writeFileSync(addonPath, 'v1');
      manager.deploy('test', addonPath, '1.0.0');
      const result = await manager.rollback('test');
      expect(result.success).toBe(false);
    });
  });

  describe('history', () => {
    it('returns deployment history', () => {
      const addonPath = join(testDir, 'test.node');
      writeFileSync(addonPath, 'v1');
      manager.deploy('test', addonPath, '1.0.0');
      writeFileSync(addonPath, 'v2');
      manager.deploy('test', addonPath, '2.0.0');
      const history = manager.getHistory('test');
      expect(history.length).toBe(2);
      expect(history[0].version).toBe('2.0.0');
    });
  });
});
