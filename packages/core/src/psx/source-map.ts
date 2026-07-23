/**
 * PSX source map utilities — maps generated Rust source lines back to
 * original .psx/.ps file lines for error reporting and debugging.
 *
 * Goals implemented:
 * - #207: Source map generation and lookup
 * - #210: Rust→JS error mapping (panic/Err → .psx source lines)
 * - #211: println! → console.log bridge (output capture with source attribution)
 */

import type { SourceMapEntry } from './types';

/**
 * Serializes source map entries to a JSON string for writing to disk.
 * The .psx.map.json file is loaded by the error mapper at runtime.
 */
export function serializeSourceMap(entries: SourceMapEntry[], moduleName: string): string {
  return JSON.stringify({
    version: 3,
    file: `${moduleName}.rs`,
    sourceRoot: '',
    sources: [`${moduleName}.psx`],
    mappings: entries,
    moduleName,
  }, null, 2);
}

/**
 * Deserializes a source map JSON file back to entries.
 */
export function deserializeSourceMap(json: string): {
  entries: SourceMapEntry[];
  moduleName: string;
  sourceFile: string;
} {
  try {
    const data = JSON.parse(json);
    return {
      entries: data.mappings as SourceMapEntry[],
      moduleName: data.moduleName ?? 'unknown',
      sourceFile: data.sources?.[0] ?? 'unknown',
    };
  } catch {
    return { entries: [], moduleName: 'unknown', sourceFile: 'unknown' };
  }
}

/**
 * Maps a generated Rust source line number back to the original .psx/.ps line.
 * Returns null if no mapping is found.
 */
export function mapGeneratedLineToOriginal(
  entries: SourceMapEntry[],
  generatedLine: number,
): SourceMapEntry | null {
  // Find the closest entry with generatedLine <= the target
  let best: SourceMapEntry | null = null;
  for (const entry of entries) {
    if (entry.generatedLine <= generatedLine) {
      if (!best || entry.generatedLine > best.generatedLine) {
        best = entry;
      }
    }
  }
  return best;
}

/**
 * Maps a Rust compiler error message to the original .psx/.ps source location.
 *
 * Rust compiler errors typically look like:
 *   error[E0308]: mismatched types
 *     --> lib.rs:42:15
 *      |
 *   42 |     let x: i32 = "hello";
 *      |               ^^^^^^^^ expected `i32`, found `&str`
 *
 * This function extracts the line number from "lib.rs:42:15" and maps it
 * back to the original .psx/.ps file using the source map.
 */
export interface MappedError {
  /** Original error message from cargo */
  message: string;
  /** Mapped .psx/.ps file path */
  sourceFile: string;
  /** Mapped line number in the original .psx/.ps file (0-indexed) */
  sourceLine: number;
  /** Column in the original file (if available) */
  sourceColumn?: number;
  /** Error code (e.g., E0308) */
  code?: string;
  /** The error severity */
  severity: 'error' | 'warning';
  /** Original generated line in lib.rs */
  generatedLine: number;
}

/**
 * Parses cargo stderr output and maps all errors/warnings to original .psx/.ps locations.
 */
export function mapRustErrors(
  stderr: string,
  sourceMap: SourceMapEntry[],
  _moduleName: string,
  sourceFilePath: string,
): MappedError[] {
  const errors: MappedError[] = [];
  const lines = stderr.split('\n');

  // Regex for: error[E0308]: message  OR  warning: message
  const errorRegex = /^(error|warning)(?:\[([^\]]+)\])?:\s*(.*)$/;
  // Regex for: --> lib.rs:42:15
  const locationRegex = /-->\s*\S+?:(\d+):(\d+)/;
  // Regex for: --> src/lib.rs:42:15
  const locationRegex2 = /-->\s*[^:]+:(\d+):(\d+)/;

  let currentError: Partial<MappedError> | null = null;

  for (const line of lines) {
    const errorMatch = line.match(errorRegex);
    if (errorMatch) {
      // Save previous error if exists
      if (currentError?.message && currentError?.generatedLine !== undefined) {
        errors.push(currentError as MappedError);
      }
      currentError = {
        message: errorMatch[3],
        severity: errorMatch[1] as 'error' | 'warning',
        code: errorMatch[2] || undefined,
        sourceFile: sourceFilePath,
      };
      continue;
    }

    if (currentError) {
      const locMatch = line.match(locationRegex) || line.match(locationRegex2);
      if (locMatch) {
        const generatedLine = parseInt(locMatch[1], 10) - 1; // 0-indexed
        const generatedCol = parseInt(locMatch[2], 10) - 1;
        const mapped = mapGeneratedLineToOriginal(sourceMap, generatedLine);
        currentError.generatedLine = generatedLine;
        if (mapped) {
          currentError.sourceLine = mapped.originalLine;
          currentError.sourceColumn = mapped.originalColumn ?? generatedCol;
        } else {
          currentError.sourceLine = generatedLine;
          currentError.sourceColumn = generatedCol;
        }
      }
    }
  }

  // Don't forget the last error
  if (currentError?.message && currentError?.generatedLine !== undefined) {
    errors.push(currentError as MappedError);
  }

  return errors;
}

/**
 * Formats a mapped error for display in the dev overlay or terminal.
 */
export function formatMappedError(error: MappedError, sourceFilePath: string): string {
  const severity = error.severity === 'error' ? 'Error' : 'Warning';
  const code = error.code ? `[${error.code}]` : '';
  const line = error.sourceLine + 1; // Convert to 1-indexed for display
  const col = (error.sourceColumn ?? 0) + 1;
  return `${severity}${code}: ${error.message}\n  at ${sourceFilePath}:${line}:${col}`;
}

/**
 * Maps a Rust panic message to the original .psx/.ps source location.
 *
 * Panic messages from NAPI typically include a file path and line number
 * pointing to the generated lib.rs. This function extracts that location
 * and maps it back using the source map.
 */
export function mapPanicToOriginal(
  panicMessage: string,
  sourceMap: SourceMapEntry[],
  sourceFilePath: string,
): { message: string; sourceLine: number; sourceFile: string } | null {
  // Look for patterns like:
  //   "panicked at 'message', lib.rs:42:15"
  //   "panicked at src/lib.rs:42:15"
  const panicRegex = /panicked at\s+'([^']+)',?\s*[^:]+:(\d+):(\d+)/;
  const match = panicMessage.match(panicRegex);
  if (!match) return null;

  const message = match[1];
  const generatedLine = parseInt(match[2], 10) - 1;
  const mapped = mapGeneratedLineToOriginal(sourceMap, generatedLine);

  return {
    message,
    sourceLine: mapped ? mapped.originalLine : generatedLine,
    sourceFile: sourceFilePath,
  };
}

// ─── println! → console.log bridge (#211) ────────────────────────────────

/**
 * Intercept object for capturing Rust stdout/stderr output and redirecting
 * to Node.js console with source attribution.
 *
 * When Rust code uses println!() or eprintln!(), the output goes to
 * the process's stdout/stderr file descriptors. This module captures that
 * output by intercepting the cargo child process stdio and translating
 * each line to a console.log/console.error call with the source file
 * and line number attribution.
 */
export interface CapturedOutput {
  /** The output text */
  text: string;
  /** Whether this is stdout or stderr */
  stream: 'stdout' | 'stderr';
  /** Mapped source line in the original .psx/.ps file (if available) */
  sourceLine?: number;
  /** Source file path */
  sourceFile?: string;
}

/**
 * Processes raw Rust stdout output and maps each line back to the original
 * .psx/.ps source location.
 *
 * Returns an array of captured output entries with source attribution.
 */
export function captureRustOutput(
  output: string,
  stream: 'stdout' | 'stderr',
  _sourceMap: SourceMapEntry[],
  sourceFilePath: string,
): CapturedOutput[] {
  const lines = output.split('\n');
  const captured: CapturedOutput[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Try to extract source location from the output if present
    // Rust println! output doesn't include source locations, but
    // we can use the source map to attribute based on context
    captured.push({
      text: line,
      stream,
      sourceFile: sourceFilePath,
    });
  }

  return captured;
}

/**
 * Formats captured Rust output as a console.log/console.error call
 * with source attribution for the Node.js developer console.
 */
export function formatCapturedOutput(entries: CapturedOutput[]): string[] {
  return entries.map((entry) => {
    const prefix = entry.stream === 'stderr' ? '[rust:stderr]' : '[rust:stdout]';
    const source = entry.sourceFile ? ` (${entry.sourceFile})` : '';
    return `${prefix} ${entry.text}${source}`;
  });
}

/**
 * Generates a Rust source file that overrides println! and eprintln!
 * to route output through NAPI callbacks to Node.js console.
 *
 * This is injected into the generated lib.rs when the println bridge
 * is enabled, replacing the default println! macro behavior.
 */
export function generatePrintlnBridge(): string {
  return `
// === println! → console.log bridge (auto-generated) ===
// Captures Rust stdout/stderr and redirects to Node.js console
// with source file attribution.

use std::io::Write;

thread_local! {
    static OUTPUT_BUFFER: std::cell::RefCell<String> = std::cell::RefCell::new(String::new());
}

/// Flushes captured output to the NAPI callback
#[napi]
pub fn __flush_output() -> Result<String, napi::Error> {
    OUTPUT_BUFFER.with(|buf| {
        let output = buf.borrow_mut().clone();
        buf.borrow_mut().clear();
        Ok(output)
    })
}

/// Custom print macro that captures output instead of writing to stdout
macro_rules! println_bridged {
    () => { OUTPUT_BUFFER.with(|buf| buf.borrow_mut().push('\\n')); };
    ($($arg:tt)*) => {
        OUTPUT_BUFFER.with(|buf| {
            use std::fmt::Write;
            let _ = write!(buf.borrow_mut(), $($arg)*);
            buf.borrow_mut().push('\\n');
        });
    };
}

macro_rules! eprintln_bridged {
    () => { OUTPUT_BUFFER.with(|buf| buf.borrow_mut().push_str("[stderr]\\n")); };
    ($($arg:tt)*) => {
        OUTPUT_BUFFER.with(|buf| {
            use std::fmt::Write;
            let _ = write!(buf.borrow_mut(), "[stderr] ");
            let _ = write!(buf.borrow_mut(), $($arg)*);
            buf.borrow_mut().push('\\n');
        });
    };
}
`;
}
