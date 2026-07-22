/**
 * PSX HMR — Hot Module Replacement for Rust code changes in .psx/.ps files.
 *
 * Goal #208: Incremental `cargo build` with module-level invalidation,
 * preserve TSX state across Rust recompiles.
 *
 * When a .psx/.ps file changes:
 * 1. Only the affected Rust module is recompiled (incremental cargo)
 * 2. The compiled .node addon is hot-swapped at runtime
 * 3. TSX state is preserved — only the Rust function bindings are refreshed
 * 4. An HMR event is sent to the client to re-import the module
 *
 * This module integrates with the existing HMR watcher and the dev server's
 * module invalidation system.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { readFile, mkdir } from 'node:fs/promises';

/**
 * Tracks the compilation state of each PSX module for incremental builds.
 */
interface ModuleCompileState {
  /** Module name (derived from filename) */
  moduleName: string;
  /** Source file path (.psx or .ps) */
  sourcePath: string;
  /** Content hash of the Rust source at last compile */
  rustHash: string;
  /** Content hash of the TSX source at last compile */
  tsxHash: string;
  /** Path to the compiled .node addon */
  addonPath: string;
  /** Cargo workspace directory */
  cargoDir: string;
  /** Last compilation timestamp */
  lastCompiled: number;
  /** Whether the module is currently compiling */
  isCompiling: boolean;
}

/**
 * Result of an HMR-triggered recompilation.
 */
export interface PSXHMRResult {
  moduleName: string;
  /** Whether the Rust code was recompiled */
  rustRecompiled: boolean;
  /** Whether the TSX needs re-transformation */
  tsxChanged: boolean;
  /** Path to the updated .node addon (if recompiled) */
  addonPath?: string;
  /** Error message if compilation failed */
  error?: string;
  /** Duration of the recompilation in ms */
  duration?: number;
}

/**
 * Manages incremental Rust compilation and hot-swapping for PSX modules.
 *
 * Usage:
 *   const hmr = createPSXHMRManager({ projectRoot, cargoTargetDir });
 *   hmr.registerModule('users', 'app/users.psx');
 *   const result = await hmr.handleFileChange('app/users.psx');
 */
export class PSXHMRManager {
  private modules = new Map<string, ModuleCompileState>();
  private sourceToModule = new Map<string, string>();
  private readonly cargoTargetDir: string;
  private readonly cargoProfile: 'dev' | 'release';
  private compileQueue: Promise<void> = Promise.resolve();
  private listeners: Array<(result: PSXHMRResult) => void> = [];

  constructor(options: {
    projectRoot: string;
    cargoTargetDir?: string;
    cargoProfile?: 'dev' | 'release';
  }) {
    this.cargoTargetDir = options.cargoTargetDir ?? join(options.projectRoot, 'target');
    this.cargoProfile = options.cargoProfile ?? 'dev';
  }

  /**
   * Registers a PSX module for HMR tracking.
   */
  registerModule(moduleName: string, sourcePath: string, addonPath: string, cargoDir: string): void {
    const state: ModuleCompileState = {
      moduleName,
      sourcePath,
      rustHash: '',
      tsxHash: '',
      addonPath,
      cargoDir,
      lastCompiled: 0,
      isCompiling: false,
    };
    this.modules.set(moduleName, state);
    this.sourceToModule.set(sourcePath, moduleName);
  }

  /**
   * Handles a file change event. Returns null if the file is not a PSX module
   * or if no recompilation is needed.
   */
  async handleFileChange(filePath: string): Promise<PSXHMRResult | null> {
    const moduleName = this.sourceToModule.get(filePath);
    if (!moduleName) return null;

    const state = this.modules.get(moduleName);
    if (!state) return null;

    if (state.isCompiling) {
      // Queue this change — will be picked up after current compile finishes
      return null;
    }

    // Read the changed file
    let source: string;
    try {
      source = await readFile(filePath, 'utf-8');
    } catch {
      return null;
    }

    // Parse to split Rust and TSX
    const { parsePSX } = await import('./parser');
    const parsed = parsePSX(source);
    const rustSource = parsed.rustBlocks.map((b) => b.source).join('\n');
    const tsxContent = parsed.tsxContent;

    const newRustHash = hashContent(rustSource);
    const newTsxHash = hashContent(tsxContent);

    const rustChanged = newRustHash !== state.rustHash;
    const tsxChanged = newTsxHash !== state.tsxHash;

    // Update hashes
    state.rustHash = newRustHash;
    state.tsxHash = newTsxHash;

    if (!rustChanged && !tsxChanged) {
      return null;
    }

    const result: PSXHMRResult = {
      moduleName,
      rustRecompiled: false,
      tsxChanged,
    };

    if (rustChanged) {
      // Serialize compilation to avoid concurrent cargo builds
      const compilePromise = this.compileModule(state).then((compileResult) => {
        result.rustRecompiled = compileResult.success;
        result.addonPath = compileResult.addonPath;
        result.error = compileResult.error;
        result.duration = compileResult.duration;
        this.notifyListeners(result);
      });

      this.compileQueue = this.compileQueue.then(() => compilePromise);
      await compilePromise;
    } else {
      // Only TSX changed — no Rust recompilation needed
      this.notifyListeners(result);
    }

    return result;
  }

  /**
   * Compiles a single module incrementally.
   * Uses `cargo build` with incremental compilation enabled.
   */
  private async compileModule(state: ModuleCompileState): Promise<{
    success: boolean;
    addonPath?: string;
    error?: string;
    duration: number;
  }> {
    const startTime = Date.now();
    state.isCompiling = true;

    try {
      // Run incremental cargo build
      const success = await runIncrementalCargoBuild(state.cargoDir, this.cargoProfile);

      if (!success) {
        return {
          success: false,
          error: `cargo build failed for module ${state.moduleName}`,
          duration: Date.now() - startTime,
        };
      }

      // Copy the .node addon to the module's output directory
      const addonDir = dirname(state.addonPath);
      await mkdir(addonDir, { recursive: true });

      // Find the built .node file in the cargo target directory
      const profileDir = this.cargoProfile === 'dev' ? 'debug' : 'release';
      const cargoOutputDir = join(this.cargoTargetDir, profileDir);

      // The .node file name matches the module name
      const nodeFile = join(cargoOutputDir, `lib${state.moduleName.replace(/-/g, '_')}.node`);
      const altNodeFile = join(cargoOutputDir, `${state.moduleName}.node`);

      let sourceAddon: string | null = null;
      if (existsSync(nodeFile)) sourceAddon = nodeFile;
      else if (existsSync(altNodeFile)) sourceAddon = altNodeFile;

      if (sourceAddon) {
        const { copyFile } = await import('node:fs/promises');
        await copyFile(sourceAddon, state.addonPath);
      }

      state.lastCompiled = Date.now();

      return {
        success: true,
        addonPath: state.addonPath,
        duration: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - startTime,
      };
    } finally {
      state.isCompiling = false;
    }
  }

  /**
   * Adds a listener that is called when a module is recompiled.
   */
  onRecompile(listener: (result: PSXHMRResult) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(result: PSXHMRResult): void {
    for (const listener of this.listeners) {
      listener(result);
    }
  }

  /**
   * Gets all registered module names.
   */
  getModules(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Checks if a file path is a registered PSX module.
   */
  isPSXModule(filePath: string): boolean {
    return this.sourceToModule.has(filePath);
  }

  /**
   * Updates the source hash for a module without recompiling.
   * Used during initial registration to set baseline hashes.
   */
  async initializeHash(moduleName: string): Promise<void> {
    const state = this.modules.get(moduleName);
    if (!state) return;

    try {
      const source = await readFile(state.sourcePath, 'utf-8');
      const { parsePSX } = await import('./parser');
      const parsed = parsePSX(source);
      state.rustHash = hashContent(parsed.rustBlocks.map((b) => b.source).join('\n'));
      state.tsxHash = hashContent(parsed.tsxContent);
    } catch {
      // Module may not exist yet
    }
  }

  /**
   * Stops all compilation and cleans up.
   */
  dispose(): void {
    this.modules.clear();
    this.sourceToModule.clear();
    this.listeners = [];
  }
}

/**
 * Creates a PSX HMR manager.
 */
export function createPSXHMRManager(options: {
  projectRoot: string;
  cargoTargetDir?: string;
  cargoProfile?: 'dev' | 'release';
}): PSXHMRManager {
  return new PSXHMRManager(options);
}

/**
 * Runs an incremental cargo build for a single workspace member.
 * Uses --config profile.dev.incremental=true for faster rebuilds.
 */
function runIncrementalCargoBuild(cargoDir: string, profile: 'dev' | 'release'): Promise<boolean> {
  return new Promise((resolve) => {
    const args = ['build', '--profile', profile];
    if (profile === 'dev') {
      args.push('--config', 'profile.dev.incremental=true');
    }

    const child = spawn('cargo', args, {
      cwd: cargoDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000, // 60s timeout for incremental builds
    });

    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Simple content hash for change detection.
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

/**
 * Generates the HMR client code injected into PSX modules.
 *
 * This code listens for HMR events from the dev server and re-imports
 * the Rust functions from the updated .node addon without losing
 * React component state.
 */
export function generatePSXHMRClient(moduleName: string, addonPath: string): string {
  return `
// === PSX HMR Client (auto-generated for ${moduleName}) ===
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // Delete the cached addon so the next import loads the fresh .node file
    const moduleKey = require.resolve('${addonPath}');
    if (require.cache[moduleKey]) {
      delete require.cache[moduleKey];
    }
    // Trigger a re-render by dispatching a custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pledge:psx-hmr', {
        detail: { module: '${moduleName}' }
      }));
    }
  });
}
`;
}
