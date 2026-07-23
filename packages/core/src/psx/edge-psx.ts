/**
 * #271 — Edge PSX Support.
 *
 * Compile .ps/.psx Rust to WASM for edge runtime, WASM-based NAPI
 * bindings, no native .node addon needed on edge platforms.
 *
 * Provides:
 * - WASM target compilation configuration
 * - WASM-based NAPI binding generation
 * - Edge platform adapter (Cloudflare Workers, Vercel Edge, Deno Deploy)
 * - Feature detection for WASM vs native addon
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EdgePlatform = 'cloudflare' | 'vercel' | 'deno' | 'node';

export interface WasmCompileConfig {
  /** Module name */
  moduleName: string;
  /** Target edge platform */
  platform: EdgePlatform;
  /** Whether to enable SIMD (default: true where supported) */
  enableSimd?: boolean;
  /** Whether to enable threads (default: false, not supported on all platforms) */
  enableThreads?: boolean;
  /** Optimize for size (default: true for edge) */
  optimizeForSize?: boolean;
  /** Initial memory in pages (64KB each, default: 16 = 1MB) */
  initialMemoryPages?: number;
  /** Maximum memory in pages (default: 256 = 16MB) */
  maxMemoryPages?: number;
}

export interface WasmBuildResult {
  moduleName: string;
  wasmPath: string;
  jsPath: string;
  wasmSizeBytes: number;
  jsSizeBytes: number;
  platform: EdgePlatform;
  features: string[];
  buildTimeMs: number;
}

export interface EdgeAdapterConfig {
  platform: EdgePlatform;
  /** Path to WASM modules directory */
  wasmDir: string;
  /** Whether to preload modules (default: true) */
  preloadModules?: boolean;
  /** Module names to preload */
  modules?: string[];
}

export interface EdgeModuleBinding {
  moduleName: string;
  wasmBase64: string;
  exports: string[];
  memory: {
    initial: number;
    maximum: number;
  };
}

// ---------------------------------------------------------------------------
// WASM compilation configuration
// ---------------------------------------------------------------------------

/**
 * Generates the Cargo.toml configuration for WASM target compilation.
 */
export function generateWasmCargoConfig(config: WasmCompileConfig): string {
  const features: string[] = [];
  if (config.enableSimd !== false) features.push('simd');
  if (config.enableThreads) features.push('threads');

  const optFlag = config.optimizeForSize !== false ? 'z' : '3';

  return `[package]
name = "pledge-${config.moduleName}-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
${config.platform === 'cloudflare' ? 'js-sys = "0.3"\n' : ''}

[profile.release]
opt-level = "${optFlag}"
lto = true
codegen-units = 1
panic = "abort"
strip = true

[features]
default = [${features.map(f => `"${f}"`).join(', ')}]
simd = []
threads = []
`;
}

/**
 * Generates the wasm-bindgen wrapper for edge platform.
 */
export function generateWasmBindings(
  moduleName: string,
  exports: Array<{ name: string; isAsync: boolean }>,
  platform: EdgePlatform,
): string {
  const lines: string[] = [
    '/**',
    ` * Auto-generated WASM bindings for ${moduleName} on ${platform}.`,
    ' * Do not edit manually — PledgePack regenerates on build.',
    ' */',
    '',
  ];

  if (platform === 'cloudflare') {
    lines.push(
      `import wasm from './${moduleName}_bg.wasm';`,
      `import { ${exports.map(e => e.name).join(', ')} } from './${moduleName}_bg.js';`,
      '',
      'export const rust = {',
    );
    for (const exp of exports) {
      if (exp.isAsync) {
        lines.push(`  ${exp.name}: async (...args: unknown[]) => {`);
        lines.push(`    return ${exp.name}(...args);`);
        lines.push(`  },`);
      } else {
        lines.push(`  ${exp.name},`);
      }
    }
    lines.push('};');
  } else if (platform === 'vercel') {
    lines.push(
      `import { ${exports.map(e => e.name).join(', ')} } from './${moduleName}_bg.js';`,
      `import wasmModule from './${moduleName}_bg.wasm';`,
      '',
      '// Initialize WASM module on first import',
      `let _initialized = false;`,
      `async function ensureInit() {`,
      `  if (!_initialized) {`,
      `    await wasmModule.instantiate();`,
      `    _initialized = true;`,
      `  }`,
      `}`,
      '',
      'export const rust = {',
    );
    for (const exp of exports) {
      if (exp.isAsync) {
        lines.push(`  ${exp.name}: async (...args: unknown[]) => {`);
        lines.push(`    await ensureInit();`);
        lines.push(`    return ${exp.name}(...args);`);
        lines.push(`  },`);
      } else {
        lines.push(`  ${exp.name}: (...args: unknown[]) => {`);
        lines.push(`    return ${exp.name}(...args);`);
        lines.push(`  },`);
      }
    }
    lines.push('};');
  } else {
    // Deno
    lines.push(
      `import { ${exports.map(e => e.name).join(', ')} } from './${moduleName}_bg.js';`,
      `import { instantiate } from './${moduleName}_bg.wasm';`,
      '',
      `let _instance: unknown = null;`,
      `async function ensureInit() {`,
      `  if (!_instance) {`,
      `    _instance = await instantiate();`,
      `  }`,
      `  return _instance;`,
      `}`,
      '',
      'export const rust = {',
    );
    for (const exp of exports) {
      lines.push(`  ${exp.name}: async (...args: unknown[]) => {`);
      lines.push(`    await ensureInit();`);
      lines.push(`    return ${exp.name}(...args);`);
      lines.push(`  },`);
    }
    lines.push('};');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Edge adapter
// ---------------------------------------------------------------------------

/**
 * Edge adapter for loading WASM modules on edge platforms.
 */
export class EdgeAdapter {
  private config: Required<EdgeAdapterConfig>;
  private modules = new Map<string, EdgeModuleBinding>();
  private loaded = false;

  constructor(config: EdgeAdapterConfig) {
    this.config = {
      platform: config.platform,
      wasmDir: config.wasmDir,
      preloadModules: config.preloadModules ?? true,
      modules: config.modules ?? [],
    };
  }

  /**
   * Preloads WASM modules into memory.
   */
  async preload(): Promise<void> {
    if (this.loaded || !this.config.preloadModules) return;

    for (const moduleName of this.config.modules) {
      await this.loadModule(moduleName);
    }
    this.loaded = true;
  }

  /**
   * Loads a WASM module from the filesystem.
   */
  async loadModule(moduleName: string): Promise<EdgeModuleBinding> {
    const existing = this.modules.get(moduleName);
    if (existing) return existing;

    const wasmPath = join(this.config.wasmDir, `${moduleName}_bg.wasm`);
    if (!existsSync(wasmPath)) {
      throw new Error(`WASM module "${moduleName}" not found at ${wasmPath}`);
    }

    const wasmBytes = readFileSync(wasmPath);
    const wasmBase64 = wasmBytes.toString('base64');

    // Parse exports from the JS binding file
    const jsPath = join(this.config.wasmDir, `${moduleName}_bg.js`);
    let exports: string[] = [];
    if (existsSync(jsPath)) {
      const jsContent = readFileSync(jsPath, 'utf-8');
      const exportMatches = jsContent.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g);
      exports = Array.from(exportMatches, m => m[1]);
    }

    const binding: EdgeModuleBinding = {
      moduleName,
      wasmBase64,
      exports,
      memory: {
        initial: 16,
        maximum: 256,
      },
    };

    this.modules.set(moduleName, binding);
    return binding;
  }

  /**
   * Gets a loaded module binding.
   */
  getModule(moduleName: string): EdgeModuleBinding | undefined {
    return this.modules.get(moduleName);
  }

  /**
   * Lists all loaded module names.
   */
  listModules(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Generates the edge entry point file.
   */
  generateEntryPoint(): string {
    const lines: string[] = [
      '/**',
      ' * Auto-generated edge entry point for PledgeStack PSX modules.',
      ' * This file is deployed to the edge platform.',
      ' */',
      '',
    ];

    if (this.config.platform === 'cloudflare') {
      lines.push(
        "import { EdgeAdapter } from './edge-adapter';",
        '',
        'const adapter = new EdgeAdapter({',
        `  platform: 'cloudflare',`,
        `  wasmDir: './wasm',`,
        `  modules: [${this.config.modules.map(m => `'${m}'`).join(', ')}],`,
        '});',
        '',
        'export default {',
        '  async fetch(request: Request, env: Record<string, unknown>): Promise<Response> {',
        '    await adapter.preload();',
        '    // Route handling happens here',
        '    return new Response("OK");',
        '  },',
        '};',
      );
    } else if (this.config.platform === 'vercel') {
      lines.push(
        "import { EdgeAdapter } from './edge-adapter';",
        '',
        'const adapter = new EdgeAdapter({',
        `  platform: 'vercel',`,
        `  wasmDir: './wasm',`,
        `  modules: [${this.config.modules.map(m => `'${m}'`).join(', ')}],`,
        '});',
        '',
        'export const config = { runtime: "edge" };',
        '',
        'export default async function handler(req: Request): Promise<Response> {',
        '  await adapter.preload();',
        '  return new Response("OK");',
        '}',
      );
    } else {
      lines.push(
        "import { EdgeAdapter } from './edge-adapter';",
        '',
        'const adapter = new EdgeAdapter({',
        `  platform: 'deno',`,
        `  wasmDir: './wasm',`,
        `  modules: [${this.config.modules.map(m => `'${m}'`).join(', ')}],`,
        '});',
        '',
        'Deno.serve(async (req: Request) => {',
        '  await adapter.preload();',
        '  return new Response("OK");',
        '});',
      );
    }

    return lines.join('\n');
  }
}

// ---------------------------------------------------------------------------
// Build orchestration
// ---------------------------------------------------------------------------

/**
 * Builds a PSX module for WASM edge target.
 */
export function buildWasmModule(
  config: WasmCompileConfig,
  outputDir: string,
): WasmBuildResult {
  const startTime = Date.now();
  mkdirSync(outputDir, { recursive: true });

  // Generate Cargo.toml
  const cargoConfig = generateWasmCargoConfig(config);
  const cargoPath = join(outputDir, 'Cargo.toml');
  writeFileSync(cargoPath, cargoConfig);

  // Simulate build output paths
  const wasmPath = join(outputDir, `${config.moduleName}_bg.wasm`);
  const jsPath = join(outputDir, `${config.moduleName}_bg.js`);

  const features: string[] = ['wasm-bindgen'];
  if (config.enableSimd !== false) features.push('simd');
  if (config.enableThreads) features.push('threads');

  return {
    moduleName: config.moduleName,
    wasmPath,
    jsPath,
    wasmSizeBytes: 0,
    jsSizeBytes: 0,
    platform: config.platform,
    features,
    buildTimeMs: Date.now() - startTime,
  };
}

/**
 * Detects whether the current runtime supports WASM.
 */
export function detectWasmSupport(): boolean {
  try {
    // Check for WebAssembly global
    return typeof WebAssembly !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Detects the edge platform from environment variables.
 */
export function detectEdgePlatform(): EdgePlatform | null {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.CF_PAGES) return 'cloudflare';
    if (process.env.CLOUDFLARE_ACCOUNT_ID) return 'cloudflare';
    if (process.env.VERCEL) return 'vercel';
    if (process.env.DENO_DEPLOYMENT_ID) return 'deno';
  }
  return null;
}
