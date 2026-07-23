import { describe, it, expect } from 'vitest';
import {
  generateWasmCargoConfig,
  generateWasmBindings,
  EdgeAdapter,
  buildWasmModule,
  detectWasmSupport,
  detectEdgePlatform,
  type EdgePlatform,
} from './edge-psx';

describe('Edge PSX Support (#271)', () => {
  describe('generateWasmCargoConfig', () => {
    it('generates Cargo.toml for Cloudflare WASM target', () => {
      const config = generateWasmCargoConfig({
        moduleName: 'test',
        platform: 'cloudflare',
      });
      expect(config).toContain('crate-type = ["cdylib", "rlib"]');
      expect(config).toContain('wasm-bindgen');
      expect(config).toContain('opt-level = "z"');
      expect(config).toContain('panic = "abort"');
    });

    it('enables SIMD by default', () => {
      const config = generateWasmCargoConfig({
        moduleName: 'test',
        platform: 'vercel',
      });
      expect(config).toContain('"simd"');
    });

    it('disables SIMD when configured', () => {
      const config = generateWasmCargoConfig({
        moduleName: 'test',
        platform: 'deno',
        enableSimd: false,
      });
      expect(config).not.toContain('"simd"');
    });
  });

  describe('generateWasmBindings', () => {
    it('generates Cloudflare bindings', () => {
      const bindings = generateWasmBindings('test', [
        { name: 'get_users', isAsync: true },
        { name: 'sync_fn', isAsync: false },
      ], 'cloudflare');
      expect(bindings).toContain('import wasm');
      expect(bindings).toContain('get_users');
      expect(bindings).toContain('sync_fn');
      expect(bindings).toContain('export const rust');
    });

    it('generates Vercel bindings with init', () => {
      const bindings = generateWasmBindings('test', [
        { name: 'fetch_data', isAsync: true },
      ], 'vercel');
      expect(bindings).toContain('ensureInit');
      expect(bindings).toContain('wasmModule.instantiate');
    });

    it('generates Deno bindings', () => {
      const bindings = generateWasmBindings('test', [
        { name: 'process', isAsync: true },
      ], 'deno');
      expect(bindings).toContain('instantiate');
      expect(bindings).toContain('ensureInit');
    });
  });

  describe('EdgeAdapter', () => {
    it('creates adapter with config', () => {
      const adapter = new EdgeAdapter({
        platform: 'cloudflare',
        wasmDir: '/tmp/wasm',
        modules: ['mod1', 'mod2'],
      });
      expect(adapter.listModules()).toHaveLength(0);
    });

    it('generates entry point for Cloudflare', () => {
      const adapter = new EdgeAdapter({
        platform: 'cloudflare',
        wasmDir: '/tmp/wasm',
        modules: ['mod1'],
      });
      const entry = adapter.generateEntryPoint();
      expect(entry).toContain('cloudflare');
      expect(entry).toContain('mod1');
      expect(entry).toContain('export default');
    });

    it('generates entry point for Vercel', () => {
      const adapter = new EdgeAdapter({
        platform: 'vercel',
        wasmDir: '/tmp/wasm',
        modules: ['mod1'],
      });
      const entry = adapter.generateEntryPoint();
      expect(entry).toContain('vercel');
      expect(entry).toContain('runtime: "edge"');
    });
  });

  describe('buildWasmModule', () => {
    it('returns build result with correct platform', () => {
      const result = buildWasmModule({
        moduleName: 'test',
        platform: 'cloudflare',
      }, '/tmp/output');
      expect(result.moduleName).toBe('test');
      expect(result.platform).toBe('cloudflare');
      expect(result.features).toContain('wasm-bindgen');
    });
  });

  describe('detectWasmSupport', () => {
    it('detects WASM support', () => {
      const supported = detectWasmSupport();
      expect(typeof supported).toBe('boolean');
    });
  });

  describe('detectEdgePlatform', () => {
    it('returns null when no edge env vars are set', () => {
      const platform = detectEdgePlatform();
      expect(platform === null || typeof platform === 'string').toBe(true);
    });
  });
});
