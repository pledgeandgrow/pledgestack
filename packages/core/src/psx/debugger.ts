/**
 * PSX debugger — DAP (Debug Adapter Protocol) support for Rust in .psx files.
 *
 * Goal #212: Allow stepping through Rust code in .psx files using
 * VS Code's debugger. Uses source maps to translate between the
 * generated Rust source (lib.rs) and the original .psx file.
 *
 * Architecture:
 * 1. User sets a breakpoint in a .psx file
 * 2. The debug adapter translates .psx breakpoints to generated Rust line numbers
 * 3. Launches lldb/codelldb with the compiled .node addon
 * 4. Maps runtime source locations back to .psx for display
 *
 * VS Code launch.json config:
 * {
 *   "type": "pledgestack",
 *   "request": "launch",
 *   "name": "Debug PSX",
 *   "program": "${workspaceFolder}/.pledge-cache/users.napi.js"
 * }
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';
import type { SourceMapEntry } from './types';

/**
 * Debug session configuration.
 */
export interface DebugSessionConfig {
  /** Path to the .psx file to debug */
  psxFile: string;
  /** Path to the compiled .node addon */
  addonPath: string;
  /** Path to the generated Rust source (lib.rs) */
  rustSourcePath: string;
  /** Path to the source map file */
  sourceMapPath: string;
  /** Debugger backend: 'lldb' or 'gdb' */
  backend: 'lldb' | 'gdb';
  /** Whether to stop at entry */
  stopAtEntry: boolean;
  /** Additional debugger args */
  args?: string[];
}

/**
 * Breakpoint in a .psx file.
 */
export interface PsxBreakpoint {
  /** .psx file path */
  file: string;
  /** Line number (0-indexed) */
  line: number;
  /** Column (0-indexed, optional) */
  column?: number;
}

/**
 * Breakpoint translated to generated Rust source.
 */
export interface RustBreakpoint {
  /** Generated Rust file path */
  file: string;
  /** Line number in lib.rs (0-indexed) */
  line: number;
  /** Whether the breakpoint could be mapped */
  verified: boolean;
  /** Original .psx line for display */
  originalLine: number;
  /** Original .psx file for display */
  originalFile: string;
}

/**
 * Loads a source map from a .psx.map.json file.
 */
export async function loadSourceMap(
  sourceMapPath: string,
): Promise<SourceMapEntry[]> {
  if (!existsSync(sourceMapPath)) return [];

  const content = await readFile(sourceMapPath, 'utf-8');
  try {
    return JSON.parse(content) as SourceMapEntry[];
  } catch {
    return [];
  }
}

/**
 * Translates a .psx breakpoint to a generated Rust source line.
 *
 * Uses the source map to find which generated Rust line corresponds
 * to the given .psx line.
 */
export function translateBreakpoint(
  breakpoint: PsxBreakpoint,
  sourceMap: SourceMapEntry[],
  rustSourcePath: string,
): RustBreakpoint {
  // Find the source map entry that maps to this .psx line
  // The source map entries have: { originalLine, generatedLine, ... }
  const entry = sourceMap.find((e) => e.originalLine === breakpoint.line);

  if (entry) {
    return {
      file: rustSourcePath,
      line: entry.generatedLine,
      verified: true,
      originalLine: breakpoint.line,
      originalFile: breakpoint.file,
    };
  }

  // If no exact match, find the closest entry
  const sorted = [...sourceMap].sort((a, b) => a.originalLine - b.originalLine);
  let closest: SourceMapEntry | undefined;
  for (const e of sorted) {
    if (e.originalLine <= breakpoint.line) {
      closest = e;
    } else {
      break;
    }
  }

  if (closest) {
    return {
      file: rustSourcePath,
      line: closest.generatedLine,
      verified: true,
      originalLine: breakpoint.line,
      originalFile: breakpoint.file,
    };
  }

  return {
    file: rustSourcePath,
    line: breakpoint.line,
    verified: false,
    originalLine: breakpoint.line,
    originalFile: breakpoint.file,
  };
}

/**
 * Translates a Rust source location back to .psx source.
 *
 * Used when the debugger reports a stopped event at a Rust line —
 * we need to show the corresponding .psx line to the user.
 */
export function translateRustLocation(
  rustLine: number,
  sourceMap: SourceMapEntry[],
  psxFilePath: string,
): PsxBreakpoint {
  const entry = sourceMap.find((e) => e.generatedLine === rustLine);

  if (entry) {
    return {
      file: psxFilePath,
      line: entry.originalLine,
    };
  }

  // Find closest entry
  const sorted = [...sourceMap].sort((a, b) => a.generatedLine - b.generatedLine);
  let closest: SourceMapEntry | undefined;
  for (const e of sorted) {
    if (e.generatedLine <= rustLine) {
      closest = e;
    } else {
      break;
    }
  }

  return {
    file: psxFilePath,
    line: closest?.originalLine ?? rustLine,
  };
}

/**
 * Generates a lldb init script that sets up breakpoints and source mapping.
 *
 * This script is passed to lldb via `--source` flag.
 */
export function generateLldbScript(
  config: DebugSessionConfig,
  breakpoints: RustBreakpoint[],
): string {
  const lines: string[] = [];

  // Set the target (the .node addon)
  lines.push(`target create "${config.addonPath}"`);

  // Set breakpoints
  for (const bp of breakpoints) {
    if (bp.verified) {
      lines.push(`breakpoint set --file "${bp.file}" --line ${bp.line + 1}`);
    }
  }

  if (config.stopAtEntry) {
    lines.push(`breakpoint set --name main`);
  }

  // Run the program
  lines.push(`run`);

  return lines.join('\n');
}

/**
 * Generates a gdb init script with breakpoints.
 */
export function generateGdbScript(
  config: DebugSessionConfig,
  breakpoints: RustBreakpoint[],
): string {
  const lines: string[] = [];

  lines.push(`file ${config.addonPath}`);

  for (const bp of breakpoints) {
    if (bp.verified) {
      lines.push(`break ${bp.file}:${bp.line + 1}`);
    }
  }

  if (config.stopAtEntry) {
    lines.push(`break main`);
  }

  lines.push(`run`);

  return lines.join('\n');
}

/**
 * Resolves debug configuration for a .psx file.
 *
 * Given a .psx file path, finds the corresponding:
 * - Generated Rust source (lib.rs)
 * - Source map file
 * - Compiled .node addon
 */
export async function resolveDebugConfig(
  psxFile: string,
  cacheDir?: string,
): Promise<DebugSessionConfig | null> {
  const moduleName = basename(psxFile, extname(psxFile));
  const dir = cacheDir ?? join(psxFile, '..', '.pledge-cache');
  const rustDir = join(dir, 'rust', moduleName);

  const rustSourcePath = join(rustDir, 'lib.rs');
  const sourceMapPath = join(dir, `${moduleName}.psx.map.json`);
  const addonPath = join(dir, `${moduleName}.node`);

  if (!existsSync(rustSourcePath) || !existsSync(addonPath)) {
    return null;
  }

  return {
    psxFile,
    addonPath,
    rustSourcePath,
    sourceMapPath,
    backend: 'lldb',
    stopAtEntry: false,
  };
}

/**
 * Launches the debugger with the given configuration and breakpoints.
 *
 * Returns the child process for the debugger.
 */
export async function launchDebugger(
  config: DebugSessionConfig,
  breakpoints: PsxBreakpoint[],
): Promise<ChildProcess | null> {
  // Load source map
  const sourceMap = await loadSourceMap(config.sourceMapPath);
  if (sourceMap.length === 0) {
    console.error('No source map found — cannot debug .psx file');
    return null;
  }

  // Translate breakpoints to Rust source lines
  const rustBreakpoints = breakpoints.map((bp) =>
    translateBreakpoint(bp, sourceMap, config.rustSourcePath),
  );

  // Generate debugger script
  const script = config.backend === 'lldb'
    ? generateLldbScript(config, rustBreakpoints)
    : generateGdbScript(config, rustBreakpoints);

  // Write script to temp file
  const scriptPath = join(config.rustSourcePath, '..', 'debug-script.txt');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(scriptPath, script, 'utf-8');

  // Launch debugger
  const debuggerBin = config.backend === 'lldb' ? 'lldb' : 'gdb';
  const args = config.backend === 'lldb'
    ? ['--source', scriptPath]
    : ['-x', scriptPath];

  const child = spawn(debuggerBin, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  return child;
}
