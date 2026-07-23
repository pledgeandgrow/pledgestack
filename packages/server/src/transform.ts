import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname, basename, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import {
  transformPSX,
  detectCratesFromImports,
  generateModuleCargoToml,
  ensureRootCargoToml,
  serializeSourceMap,
  mapRustErrors,
  formatMappedError,
  mapPanicToOriginal,
  captureRustOutput,
  formatCapturedOutput,
} from 'pledgestack-core';
import type { CargoConfig } from 'pledgestack-shared';
import {
  PLEDGEPACK_DEFAULT_PORT,
  fetchFromPledgepack,
  transformLocally,
  transformTsxLocally,
  generateRustFallback,
  clearTransformCacheDir,
} from 'pledgestack-shared';

const TRANSFORM_CACHE = new Map<string, string>();

/** Cache for source maps: moduleName → { entries, sourceFilePath } */
const SOURCE_MAP_CACHE = new Map<string, { entries: import('pledgestack-core').SourceMapEntry[]; sourceFilePath: string }>();

/** Track cargo compilation state for incremental builds */
interface CompilationState {
  /** Content hash of the last compiled Rust source */
  hash: string;
  /** Timestamp of last compilation */
  compiledAt: number;
  /** Whether the addon is currently compiling */
  compiling: boolean;
  /** Pending recompilation after current one finishes */
  pendingRecompile: boolean;
}
const COMPILATION_STATE = new Map<string, CompilationState>();

/**
 * Transforms a TypeScript/TSX file to JavaScript using PledgePack's Rust compiler (Oxc).
 *
 * In dev mode, fetches the transformed module from PledgePack's dev server (axum + Oxc),
 * which handles JSX→JS, TS type stripping, CSS transforms, and CJS interop.
 * The transformed JS is written to a temp cache file and returned as a file URL for import().
 *
 * This replaces the previous esbuild-based transformation with PledgePack's native Rust pipeline.
 */
export async function transformFile(
  sourcePath: string,
  isDev: boolean,
  pledgepackPort?: number,
  cargoConfig?: CargoConfig,
  rootDir?: string,
): Promise<string> {
  const projectRoot = rootDir ?? process.cwd();
  const ext = extname(sourcePath);

  // Handle .psx and .ps files — parse Rust, generate TSX/types + NAPI bindings
  if (ext === '.psx' || ext === '.ps') {
    return transformPSXFile(sourcePath, isDev, pledgepackPort, ext === '.ps' ? 'ps' : 'psx', cargoConfig, projectRoot);
  }

  if (ext !== '.ts' && ext !== '.tsx' && ext !== '.jsx' && ext !== '.mjs') {
    return pathToFileURL(sourcePath).href;
  }

  const cacheKey = isDev ? `${sourcePath}:${Date.now()}` : sourcePath;
  const cached = TRANSFORM_CACHE.get(cacheKey);
  if (cached) return cached;

  const port = pledgepackPort ?? PLEDGEPACK_DEFAULT_PORT;

  let transformedCode: string;

  if (isDev && port > 0) {
    transformedCode = await fetchFromPledgepack(sourcePath, port, projectRoot);
  } else {
    transformedCode = await transformLocally(sourcePath, ext);
  }

  const hash = createHash('sha256').update(sourcePath).digest('hex').slice(0, 12);
  const cacheDir = join(dirname(sourcePath), '.pledge-cache');
  const outFileName = basename(sourcePath, ext) + `.${hash}.js`;
  const outPath = join(cacheDir, outFileName);

  await mkdir(cacheDir, { recursive: true });

  if (isDev) {
    const devOutPath = join(cacheDir, basename(sourcePath, ext) + `.${Date.now()}.js`);
    await writeFile(devOutPath, transformedCode, 'utf-8');
    const fileUrl = pathToFileURL(devOutPath).href;
    TRANSFORM_CACHE.set(cacheKey, fileUrl);
    return fileUrl;
  }

  await writeFile(outPath, transformedCode, 'utf-8');
  const fileUrl = pathToFileURL(outPath).href;
  TRANSFORM_CACHE.set(cacheKey, fileUrl);
  return fileUrl;
}

/**
 * Clears the transform cache directory.
 */
export async function clearTransformCache(dir: string): Promise<void> {
  await clearTransformCacheDir(dir);
  TRANSFORM_CACHE.clear();
}

/**
 * Transforms a .psx file:
 * 1. Parses <rust> blocks and inline rust!{} expressions
 * 2. Generates TypeScript types from Rust structs
 * 3. Generates Rust source + Cargo.toml for cargo compilation
 * 4. Generates NAPI wrapper JS
 * 5. Writes source map for error mapping (#207)
 * 6. Compiles Rust with incremental cache (#214) and error mapping (#210)
 * 7. Captures println! output for console.log bridge (#211)
 * 8. Returns the file URL for the transformed module
 */
async function transformPSXFile(
  sourcePath: string,
  isDev: boolean,
  pledgepackPort?: number,
  format: 'psx' | 'ps' = 'psx',
  cargoConfig?: CargoConfig,
  rootDir?: string,
): Promise<string> {
  const projectRoot = rootDir ?? process.cwd();
  const ext = format === 'ps' ? '.ps' : '.psx';
  const source = await readFile(sourcePath, 'utf-8');
  const moduleName = basename(sourcePath, ext);
  const cacheDir = join(dirname(sourcePath), '.pledge-cache');
  await mkdir(cacheDir, { recursive: true });

  // Parse and generate artifacts
  const result = transformPSX(source, {
    moduleName,
    compileRust: true,
    addonPath: `./${moduleName}.node`,
    format,
  });

  // Write generated type definitions
  if (result.types) {
    const typesPath = join(cacheDir, `${moduleName}.d.ts`);
    await writeFile(typesPath, result.types, 'utf-8');
  }

  // Write source map for error mapping (#207)
  if (result.sourceMap && result.sourceMap.length > 0) {
    const sourceMapPath = join(cacheDir, `${moduleName}.psx.map.json`);
    await writeFile(sourceMapPath, serializeSourceMap(result.sourceMap, moduleName), 'utf-8');
    SOURCE_MAP_CACHE.set(moduleName, {
      entries: result.sourceMap,
      sourceFilePath: sourcePath,
    });
  }

  // Write Rust source for cargo compilation
  let addonReady = false;
  if (result.needsRustCompile && result.rustSource) {
    const rustDir = join(cacheDir, 'rust', moduleName);
    await mkdir(rustDir, { recursive: true });
    await writeFile(join(rustDir, 'lib.rs'), result.rustSource, 'utf-8');

    // Ensure root Cargo.toml workspace exists (with profile config #213)
    await ensureRootCargoToml(projectRoot, cargoConfig?.dev, cargoConfig?.release);

    // Detect which crates this .psx file uses and generate workspace-inheriting Cargo.toml
    const detectedCrates = detectCratesFromImports(result.parse.allImports);
    const moduleCargoToml = generateModuleCargoToml(moduleName, detectedCrates);
    await writeFile(join(rustDir, 'Cargo.toml'), moduleCargoToml, 'utf-8');

    // Compile Rust to native addon (.node) with incremental cache (#214) and error mapping (#210)
    addonReady = await compileRustAddon(rustDir, moduleName, cacheDir, isDev, sourcePath, cargoConfig, projectRoot);
  }

  // Write NAPI wrapper JS — point to compiled addon or fallback stub
  if (result.napiWrapper) {
    const wrapperPath = join(cacheDir, `${moduleName}.napi.js`);
    if (addonReady) {
      await writeFile(wrapperPath, result.napiWrapper, 'utf-8');
    } else {
      // Fallback stub — throws helpful error if Rust isn't compiled
      await writeFile(wrapperPath, generateRustFallback(moduleName), 'utf-8');
    }
  }

  // For .ps files (pure Rust), there's no TSX to transform — just use the NAPI wrapper
  if (format === 'ps') {
    const wrapperPath = join(cacheDir, `${moduleName}.napi.js`);
    const fileUrl = pathToFileURL(wrapperPath).href;
    const cacheKey = isDev ? `${sourcePath}:${Date.now()}` : sourcePath;
    TRANSFORM_CACHE.set(cacheKey, fileUrl);
    return fileUrl;
  }

  // Transform the TSX portion (Oxc or esbuild) — only for .psx files
  let transformedCode: string;
  const port = pledgepackPort ?? PLEDGEPACK_DEFAULT_PORT;

  if (isDev && port > 0) {
    // Write TSX to temp file and fetch from PledgePack
    const tsxTempPath = join(cacheDir, `${moduleName}.tsx`);
    await writeFile(tsxTempPath, result.tsx, 'utf-8');
    transformedCode = await fetchFromPledgepack(tsxTempPath, port, projectRoot);
  } else {
    transformedCode = await transformTsxLocally(result.tsx, isDev);
  }

  const hash = createHash('sha256').update(sourcePath).digest('hex').slice(0, 12);
  const outFileName = `${moduleName}.${hash}.js`;
  const outPath = join(cacheDir, outFileName);
  await writeFile(outPath, transformedCode, 'utf-8');

  const fileUrl = pathToFileURL(outPath).href;
  const cacheKey = isDev ? `${sourcePath}:${Date.now()}` : sourcePath;
  TRANSFORM_CACHE.set(cacheKey, fileUrl);
  return fileUrl;
}

/**
 * Compiles a Rust crate to a NAPI native addon (.node) using cargo.
 *
 * Implements:
 * - #214: Incremental compilation cache — persistent cargo target dir across
 *   dev server restarts, content-hash invalidation, sccache integration
 * - #210: Rust→JS error mapping — cargo stderr parsed and mapped to .psx lines
 * - #211: println! → console.log bridge — stdout captured and attributed
 *
 * In dev mode, uses debug profile for faster compilation.
 * In production, uses release profile with LTO for maximum performance.
 *
 * Returns true if the addon was successfully compiled (or already up-to-date).
 */
async function compileRustAddon(
  rustDir: string,
  moduleName: string,
  cacheDir: string,
  isDev: boolean,
  sourceFilePath: string,
  cargoConfig?: CargoConfig,
  rootDir?: string,
): Promise<boolean> {
  const projectRoot = rootDir ?? process.cwd();
  const { spawn } = await import('node:child_process');

  // Check if cargo is available
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn('cargo', ['--version'], { stdio: 'ignore' });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`cargo exited with ${code}`));
      });
    });
  } catch {
    return false;
  }

  // ── #214: Incremental compilation cache ──────────────────────────────
  // Use persistent cargo target directory across dev server restarts.
  // The target dir is shared across all modules via the workspace.
  // ── #213: Configurable via cargoConfig.targetDir ─────────────────────
  const sharedTargetDir = cargoConfig?.targetDir ?? join(projectRoot, 'target');

  // Check if addon already exists and is up-to-date (content hash)
  const addonPath = join(cacheDir, `${moduleName}.node`);
  const hashFile = join(cacheDir, `${moduleName}.node.hash`);
  const currentHash = createHash('sha256')
    .update(await readFile(join(rustDir, 'lib.rs'), 'utf-8'))
    .digest('hex');

  // Check compilation state — avoid duplicate concurrent compilations (#214)
  const state = COMPILATION_STATE.get(moduleName);
  if (state?.compiling) {
    // Mark pending recompile — will be picked up after current compilation finishes
    if (state.hash !== currentHash) {
      state.pendingRecompile = true;
    }
    // Return existing addon if available, otherwise fallback
    return existsSync(addonPath);
  }

  if (existsSync(addonPath) && existsSync(hashFile)) {
    const savedHash = await readFile(hashFile, 'utf-8');
    if (savedHash === currentHash) {
      // Addon is up-to-date — skip compilation
      return true;
    }
  }

  // Mark as compiling
  COMPILATION_STATE.set(moduleName, {
    hash: currentHash,
    compiledAt: 0,
    compiling: true,
    pendingRecompile: false,
  });

  // Compile with cargo
  const profile = isDev ? 'dev' : 'release';
  // ── #214: Use CARGO_TARGET_DIR for persistent cache across restarts ──
  const cargoArgs = ['build', '--profile', profile];

  // Set environment variables for incremental compilation (#214)
  const cargoEnv: Record<string, string> = {
    ...process.env,
    CARGO_TARGET_DIR: sharedTargetDir,
  };

  // Enable sccache if available (#214) — can be disabled via config (#213)
  const sccacheEnabled = cargoConfig?.sccache;
  if (sccacheEnabled !== false) {
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn('sccache', ['--version'], { stdio: 'ignore' });
        child.on('error', reject);
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error('sccache not found'));
        });
      });
      cargoEnv.RUSTC_WRAPPER = 'sccache';
    } catch {
      // sccache not installed — continue without it
    }
  }

  try {
    const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn('cargo', cargoArgs, {
        cwd: rustDir,
        stdio: 'pipe',
        timeout: cargoConfig?.timeout ?? (isDev ? 30000 : 120000),
        env: cargoEnv,
      });
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
      child.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve({ stdout, stderr });
        else {
          // ── #210: Map Rust errors to .psx/.ps source locations ───────
          const sourceMapEntry = SOURCE_MAP_CACHE.get(moduleName);
          if (sourceMapEntry) {
            const mappedErrors = mapRustErrors(
              stderr,
              sourceMapEntry.entries,
              moduleName,
              sourceMapEntry.sourceFilePath,
            );
            for (const err of mappedErrors) {
              console.error(formatMappedError(err, sourceMapEntry.sourceFilePath));
            }
          } else {
            console.error(`[pledgestack] Rust compilation failed for ${moduleName}:`, stderr);
          }
          reject(new Error(`cargo exited with ${code}`));
        }
      });
    });

    // ── #211: println! → console.log bridge ────────────────────────────
    // Capture any stdout output from Rust compilation (e.g., println! in build scripts)
    // and redirect to console with source attribution
    if (stdout.trim()) {
      const sourceMapEntry = SOURCE_MAP_CACHE.get(moduleName);
      const sourcePath = sourceMapEntry?.sourceFilePath ?? sourceFilePath;
      const captured = captureRustOutput(stdout, 'stdout', sourceMapEntry?.entries ?? [], sourcePath);
      for (const line of formatCapturedOutput(captured)) {
        console.log(line);
      }
    }

    // Find the compiled .so/.dll/.dylib and copy as .node
    // ── #214: Use shared target directory ──────────────────────────────
    const targetDir = join(sharedTargetDir, isDev ? 'debug' : 'release');
    const libName = `pledge_${moduleName}`;
    const candidates = [
      join(targetDir, `lib${libName}.so`),     // Linux
      join(targetDir, `lib${libName}.dylib`),  // macOS
      join(targetDir, `${libName}.dll`),       // Windows
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        const { copyFile } = await import('node:fs/promises');
        await copyFile(candidate, addonPath);
        await writeFile(hashFile, currentHash, 'utf-8');

        // Update compilation state
        const s = COMPILATION_STATE.get(moduleName);
        if (s) {
          s.compiling = false;
          s.compiledAt = Date.now();
          s.hash = currentHash;
        }

        // ── #208: HMR — notify connected clients that Rust addon was recompiled ──
        notifyRustAddonReload(moduleName, sourceFilePath);

        return true;
      }
    }

    console.error(`[pledgestack] Compiled addon not found for ${moduleName}`);
    const s = COMPILATION_STATE.get(moduleName);
    if (s) s.compiling = false;
    return false;
  } catch (err) {
    // Compilation failed — return false so fallback stub is used
    const s = COMPILATION_STATE.get(moduleName);
    if (s) s.compiling = false;
    return false;
  }
}

/**
 * ── #208: PSX HMR ──────────────────────────────────────────────────────
 * Notifies connected dev server clients that a Rust addon was recompiled.
 * The client can then reload the module without a full page refresh.
 *
 * This is a simple event emitter — the dev server connects to it via
 * the HMR websocket and triggers a module reload when notified.
 */
type HMRListener = (moduleName: string, sourceFilePath: string) => void;
const HMR_LISTENERS = new Set<HMRListener>();

/** Register a listener for Rust addon reload events */
export function onRustAddonReload(listener: HMRListener): void {
  HMR_LISTENERS.add(listener);
}

/** Unregister a listener */
export function offRustAddonReload(listener: HMRListener): void {
  HMR_LISTENERS.delete(listener);
}

/** Notify all listeners that a Rust addon was recompiled (#208) */
function notifyRustAddonReload(moduleName: string, sourceFilePath: string): void {
  for (const listener of HMR_LISTENERS) {
    try {
      listener(moduleName, sourceFilePath);
    } catch {
      // Listener errors shouldn't affect compilation
    }
  }
}

/**
 * ── #208: PSX HMR ──────────────────────────────────────────────────────
 * Invalidates the transform cache for a .psx/.ps file, forcing recompilation
 * on next access. Called when the file watcher detects a change.
 */
export function invalidatePSXCache(sourcePath: string): void {
  // Remove all cache entries for this source path
  for (const key of TRANSFORM_CACHE.keys()) {
    if (key.startsWith(sourcePath)) {
      TRANSFORM_CACHE.delete(key);
    }
  }
}

/**
 * ── #210: Rust→JS error mapping ────────────────────────────────────────
 * Maps a Rust panic message from a NAPI error to the original .psx/.ps
 * source location. Used by the error overlay to show accurate source lines.
 */
export function mapNapiErrorToSource(
  errorMessage: string,
  moduleName: string,
): { message: string; sourceLine: number; sourceFile: string } | null {
  const sourceMapEntry = SOURCE_MAP_CACHE.get(moduleName);
  if (!sourceMapEntry) return null;

  return mapPanicToOriginal(
    errorMessage,
    sourceMapEntry.entries,
    sourceMapEntry.sourceFilePath,
  );
}
