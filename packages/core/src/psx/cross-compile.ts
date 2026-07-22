/**
 * Cross-compilation targets — pre-build .node addons for multiple platforms.
 *
 * Goal #218: Build .node addons for all supported platforms in CI,
 * package them into a single npm package with optional dependencies.
 *
 * Supported targets (matching @napi-rs/napi targets):
 * - x86_64-pc-windows-msvc       (Windows x64)
 * - aarch64-pc-windows-msvc      (Windows ARM64)
 * - x86_64-unknown-linux-gnu     (Linux x64)
 * - aarch64-unknown-linux-gnu    (Linux ARM64)
 * - x86_64-apple-darwin          (macOS x64)
 * - aarch64-apple-darwin         (macOS ARM64)
 *
 * The build output is organized as:
 *   .pledge/dist/
 *     addons/
 *       x86_64-pc-windows-msvc/   *.node
 *       x86_64-unknown-linux-gnu/ *.node
 *       x86_64-apple-darwin/      *.node
 *       ...
 *     manifest.json               target → addon mapping
 */

import { spawn } from 'node:child_process';
import { mkdir, writeFile, readdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Supported cross-compilation targets.
 */
export interface CompilationTarget {
  /** Rust target triple */
  target: string;
  /** Human-readable platform name */
  platform: string;
  /** Architecture */
  arch: string;
  /** OS */
  os: 'windows' | 'linux' | 'macos';
  /** Whether this target is the current host */
  isHost?: boolean;
}

/**
 * All supported compilation targets.
 */
export const SUPPORTED_TARGETS: CompilationTarget[] = [
  {
    target: 'x86_64-pc-windows-msvc',
    platform: 'windows-x64',
    arch: 'x64',
    os: 'windows',
  },
  {
    target: 'aarch64-pc-windows-msvc',
    platform: 'windows-arm64',
    arch: 'arm64',
    os: 'windows',
  },
  {
    target: 'x86_64-unknown-linux-gnu',
    platform: 'linux-x64',
    arch: 'x64',
    os: 'linux',
  },
  {
    target: 'aarch64-unknown-linux-gnu',
    platform: 'linux-arm64',
    arch: 'arm64',
    os: 'linux',
  },
  {
    target: 'x86_64-apple-darwin',
    platform: 'macos-x64',
    arch: 'x64',
    os: 'macos',
  },
  {
    target: 'aarch64-apple-darwin',
    platform: 'macos-arm64',
    arch: 'arm64',
    os: 'macos',
  },
];

/**
 * Detects the current host platform's target.
 */
export function getHostTarget(): CompilationTarget | undefined {
  const platform = process.platform;
  const arch = process.arch;

  const osName =
    platform === 'win32' ? 'windows' :
    platform === 'linux' ? 'linux' :
    platform === 'darwin' ? 'macos' : null;

  if (!osName) return undefined;

  return SUPPORTED_TARGETS.find((t) => {
    const osMatch = t.os === osName;
 const archMatch =
      (t.arch === 'x64' && arch === 'x64') ||
      (t.arch === 'arm64' && (arch === 'arm64' || arch === 'arm'));
    return osMatch && archMatch;
  });
}

/**
 * Result of building for a single target.
 */
export interface BuildTargetResult {
  target: string;
  success: boolean;
  addonFiles: string[];
  error?: string;
  duration?: number;
}

/**
 * Builds all .psx/.ps Rust addons for a specific target.
 *
 * Uses `cargo build --target <triple>` with the release profile.
 * The resulting .node files are copied to the dist directory.
 */
export async function buildForTarget(
  target: CompilationTarget,
  projectRoot: string,
  cargoDir: string,
  distDir: string,
): Promise<BuildTargetResult> {
  const startTime = Date.now();
  const targetDir = join(distDir, 'addons', target.target);

  // Check if the Rust target is installed
  const targetInstalled = await checkRustTarget(target.target);
  if (!targetInstalled) {
    return {
      target: target.target,
      success: false,
      addonFiles: [],
      error: `Rust target ${target.target} not installed. Run: rustup target add ${target.target}`,
    };
  }

  // Build with cargo
  const buildSuccess = await runCargoBuild(cargoDir, target.target);
  if (!buildSuccess) {
    return {
      target: target.target,
      success: false,
      addonFiles: [],
      error: `cargo build --target ${target.target} failed`,
      duration: Date.now() - startTime,
    };
  }

  // Copy .node files from target directory
  await mkdir(targetDir, { recursive: true });
  const addonFiles: string[] = [];

  const cargoTargetDir = join(projectRoot, 'target', target.target, 'release');
  if (existsSync(cargoTargetDir)) {
    const files = await readdir(cargoTargetDir);
    for (const file of files) {
      if (file.endsWith('.node')) {
        const dest = join(targetDir, file);
        await copyFile(join(cargoTargetDir, file), dest);
        addonFiles.push(relative(distDir, dest));
      }
    }
  }

  return {
    target: target.target,
    success: true,
    addonFiles,
    duration: Date.now() - startTime,
  };
}

/**
 * Builds all .psx/.ps Rust addons for all supported targets.
 *
 * This is the main entry point for CI cross-compilation.
 * Generates a manifest.json mapping targets to addon files.
 */
export async function buildAllTargets(
  projectRoot: string,
  cargoDir: string,
  distDir?: string,
): Promise<{
  results: BuildTargetResult[];
  manifest: Record<string, string[]>;
}> {
  const outDir = distDir ?? join(projectRoot, '.pledge', 'dist');
  await mkdir(outDir, { recursive: true });

  const results: BuildTargetResult[] = [];

  for (const target of SUPPORTED_TARGETS) {
    console.log(`\nBuilding for ${target.platform} (${target.target})...`);
    const result = await buildForTarget(target, projectRoot, cargoDir, outDir);
    results.push(result);

    if (result.success) {
      console.log(`  ✓ ${result.addonFiles.length} addon(s) built in ${result.duration}ms`);
    } else {
      console.error(`  ✗ ${result.error}`);
    }
  }

  // Generate manifest.json
  const manifest: Record<string, string[]> = {};
  for (const result of results) {
    if (result.success) {
      manifest[result.target] = result.addonFiles;
    }
  }

  await writeFile(
    join(outDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  return { results, manifest };
}

/**
 * Checks if a Rust target is installed via rustup.
 */
async function checkRustTarget(target: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('rustup', ['target', 'list', '--installed'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    let output = '';
    child.stdout.on('data', (data: Buffer) => { output += data.toString(); });

    child.on('error', () => resolve(false));
    child.on('close', () => {
      resolve(output.includes(target));
    });
  });
}

/**
 * Runs `cargo build --target <triple> --release` in the given directory.
 */
async function runCargoBuild(cargoDir: string, target: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('cargo', ['build', '--release', '--target', target], {
      cwd: cargoDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300000,
    });

    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Resolves the correct .node addon path for the current platform at runtime.
 *
 * Used by the NAPI wrapper to load the correct pre-built addon.
 */
export function resolveAddonPath(
  distDir: string,
  moduleName: string,
): string | null {
  const hostTarget = getHostTarget();
  if (!hostTarget) return null;

  const addonDir = join(distDir, 'addons', hostTarget.target);
  const addonPath = join(addonDir, `${moduleName}.node`);

  return existsSync(addonPath) ? addonPath : null;
}
