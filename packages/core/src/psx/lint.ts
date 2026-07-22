/**
 * PSX lint rules — ESLint-compatible rules for .psx files.
 *
 * Goal #217: Custom lint rules that analyze Rust code inside .psx files
 * to catch common issues:
 * - Unused Rust functions (not called from TSX, not #[napi])
 * - unwrap() usage in server code (panic risk)
 * - Missing Result return types for fallible functions
 * - NAPI signature compatibility checks
 *
 * These rules use the PSX parser to extract Rust metadata and analyze it.
 * They can be used as ESLint custom rules or standalone via `pledge lint`.
 */

import { parsePSX, parsePS } from './parser';
import type { PSXParseResult } from './types';
import { join, extname, relative } from 'node:path';

/**
 * Severity levels for lint messages.
 */
export type LintSeverity = 'error' | 'warning' | 'info';

/**
 * A single lint message.
 */
export interface LintMessage {
  rule: string;
  severity: LintSeverity;
  message: string;
  file: string;
  line: number;
  column?: number;
  suggestion?: string;
}

/**
 * Result of linting a single file.
 */
export interface LintResult {
  file: string;
  messages: LintMessage[];
}

/**
 * Configuration for lint rules.
 */
export interface LintConfig {
  /** Rules to enable/disable */
  rules?: {
    'no-unused-rust-fn'?: 'error' | 'warning' | 'off';
    'no-unwrap'?: 'error' | 'warning' | 'off';
    'require-result-return'?: 'error' | 'warning' | 'off';
    'napi-signature-check'?: 'error' | 'warning' | 'off';
    'no-panic-in-async'?: 'error' | 'warning' | 'off';
  };
}

const DEFAULT_LINT_CONFIG: Required<NonNullable<LintConfig['rules']>> = {
  'no-unused-rust-fn': 'warning',
  'no-unwrap': 'warning',
  'require-result-return': 'warning',
  'napi-signature-check': 'error',
  'no-panic-in-async': 'error',
};

// ─── Rule: no-unused-rust-fn ─────────────────────────────────────────────

/**
 * Detects Rust functions that are never called from TSX code and not
 * exported via #[napi] attribute.
 *
 * A function is considered "used" if:
 * - It has #[napi] attribute (exported to JS)
 * - It has #[test] or #[tokio::test] attribute (test function)
 * - It's called from another Rust function in the same file
 * - It's referenced in the TSX content via rust.functionName() or similar
 */
function checkUnusedRustFns(
  parse: PSXParseResult,
  file: string,
  severity: LintSeverity,
): LintMessage[] {
  const messages: LintMessage[] = [];

  // Collect all function names that are used
  const usedNames = new Set<string>();

  // Functions with #[napi] are exported
  for (const fn of parse.allFunctions) {
    const attrs = fn.attributes ?? [];
    if (attrs.some((a) => a.includes('#[napi]'))) {
      usedNames.add(fn.name);
    }
    if (attrs.some((a) => a.includes('#[test]') || a.includes('#[tokio::test]'))) {
      usedNames.add(fn.name);
    }
  }

  // Check TSX content for function references
  const tsxContent = parse.tsxContent;
  for (const fn of parse.allFunctions) {
    // Check if function name appears in TSX (as rust.fnName or __rust_expr reference)
    const patterns = [
      `rust.${fn.name}`,
      `rust?.${fn.name}`,
      `.${fn.name}(`,
    ];
    for (const pattern of patterns) {
      if (tsxContent.includes(pattern)) {
        usedNames.add(fn.name);
        break;
      }
    }
  }

  // Check if functions call each other (within Rust blocks)
  for (const block of parse.rustBlocks) {
    for (const fn of block.functions) {
      // Other functions in the same block might call this one
      for (const otherFn of block.functions) {
        if (otherFn.name !== fn.name && block.source.includes(fn.name)) {
          usedNames.add(fn.name);
        }
      }
    }
  }

  // Report unused functions
  for (const fn of parse.allFunctions) {
    if (!usedNames.has(fn.name)) {
      messages.push({
        rule: 'no-unused-rust-fn',
        severity,
        message: `Rust function '${fn.name}' is never called from TSX or exported via #[napi]`,
        file,
        line: fn.sourceLine ?? 0,
        suggestion: `Add #[napi] attribute to export to JS, or remove if unused`,
      });
    }
  }

  return messages;
}

// ─── Rule: no-unwrap ─────────────────────────────────────────────────────

/**
 * Detects usage of .unwrap() in Rust code, which can panic at runtime.
 *
 * In server code, panics crash the process. This rule warns on unwrap()
 * usage and suggests using ? operator or match instead.
 */
function checkNoUnwrap(
  parse: PSXParseResult,
  file: string,
  severity: LintSeverity,
): LintMessage[] {
  const messages: LintMessage[] = [];

  for (const block of parse.rustBlocks) {
    const lines = block.source.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Find .unwrap() calls — but not in comments
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('///')) continue;

      const unwrapRegex = /\.unwrap\s*\(\s*\)/g;
      let match: RegExpExecArray | null;
      while ((match = unwrapRegex.exec(line)) !== null) {
        messages.push({
          rule: 'no-unwrap',
          severity,
          message: `.unwrap() can panic — consider using ? operator or match`,
          file,
          line: block.startLine + i,
          column: match.index,
          suggestion: `Replace .unwrap() with ? or match/let-else pattern`,
        });
      }
    }
  }

  return messages;
}

// ─── Rule: require-result-return ─────────────────────────────────────────

/**
 * Detects functions that can fail but don't return Result.
 *
 * Functions that use ? operator, call fallible functions, or perform
 * operations that can fail should return Result<T, E> instead of panicking.
 */
function checkRequireResultReturn(
  parse: PSXParseResult,
  file: string,
  severity: LintSeverity,
): LintMessage[] {
  const messages: LintMessage[] = [];

  for (const fn of parse.allFunctions) {
    // Skip test functions
    const attrs = fn.attributes ?? [];
    if (attrs.some((a) => a.includes('#[test]'))) continue;

    // Check if return type is already Result
    if (fn.returnType.includes('Result<') || fn.returnType.includes('Result <')) continue;

    // Find the function body in the source
    for (const block of parse.rustBlocks) {
      const fnIndex = block.source.indexOf(`fn ${fn.name}`);
      if (fnIndex === -1) continue;

      // Extract function body
      const fnStart = block.source.slice(fnIndex);
      const bodyMatch = fnStart.match(/\{([\s\S]*?)\}(?:\s*$|\s*fn\s)/);
      if (!bodyMatch) continue;

      const body = bodyMatch[1];

      // Check for fallible patterns
      const hasQuestionMark = /\?\s*[;\n)]/.test(body);
      const hasUnwrap = /\.unwrap\s*\(\s*\)/.test(body);
      const hasExpect = /\.expect\s*\(/.test(body);

      if (hasQuestionMark || hasUnwrap || hasExpect) {
        messages.push({
          rule: 'require-result-return',
          severity,
          message: `Function '${fn.name}' uses fallible operations but doesn't return Result`,
          file,
          line: fn.sourceLine ?? 0,
          suggestion: `Change return type to Result<T, napi::Error> and use ? operator`,
        });
      }
      break;
    }
  }

  return messages;
}

// ─── Rule: napi-signature-check ──────────────────────────────────────────

/**
 * Validates that #[napi] functions have compatible signatures.
 *
 * NAPI functions must:
 * - Return Result<T, napi::Error> for fallible operations
 * - Use NAPI-compatible types (no raw Rust types like &str without proper mapping)
 * - Not use lifetime parameters in public API
 */
function checkNapiSignature(
  parse: PSXParseResult,
  file: string,
  severity: LintSeverity,
): LintMessage[] {
  const messages: LintMessage[] = [];

  for (const fn of parse.allFunctions) {
    const attrs = fn.attributes ?? [];
    if (!attrs.some((a) => a.includes('#[napi]'))) continue;

    // Check return type — should be Result<T, napi::Error> for async functions
    if (fn.isAsync && !fn.returnType.includes('Result<')) {
      messages.push({
        rule: 'napi-signature-check',
        severity,
        message: `Async #[napi] function '${fn.name}' should return Result<T, napi::Error>`,
        file,
        line: fn.sourceLine ?? 0,
        suggestion: `Wrap return type in Result<T, napi::Error>`,
      });
    }

    // Check for lifetime parameters in params
    for (const param of fn.params) {
      if (param.type.includes("'") && !param.type.includes("'_")) {
        messages.push({
          rule: 'napi-signature-check',
          severity,
          message: `#[napi] function '${fn.name}' has lifetime parameter in param '${param.name}'`,
          file,
          line: fn.sourceLine ?? 0,
          suggestion: `NAPI functions cannot expose lifetime parameters — use owned types (String, Vec)`,
        });
      }
    }

    // Check for raw references that aren't NAPI-compatible
    for (const param of fn.params) {
      if (param.type.includes('&str') && !param.type.includes('&mut')) {
        // &str is actually fine in napi-rs — it maps to String
        continue;
      }
      if (param.type.includes('&[') || param.type.includes('&mut [')) {
        messages.push({
          rule: 'napi-signature-check',
          severity,
          message: `#[napi] function '${fn.name}' has slice reference in param '${param.name}'`,
          file,
          line: fn.sourceLine ?? 0,
          suggestion: `Use Vec<T> or napi::JsBuffer instead of slice references`,
        });
      }
    }
  }

  return messages;
}

// ─── Rule: no-panic-in-async ─────────────────────────────────────────────

/**
 * Detects panic-prone operations in async functions.
 *
 * Async functions that panic can cause the tokio runtime to behave
 * unexpectedly. This rule catches unwrap(), expect(), and indexing
 * without bounds checking in async contexts.
 */
function checkNoPanicInAsync(
  parse: PSXParseResult,
  file: string,
  severity: LintSeverity,
): LintMessage[] {
  const messages: LintMessage[] = [];

  for (const fn of parse.allFunctions) {
    if (!fn.isAsync) continue;

    // Find function body
    for (const block of parse.rustBlocks) {
      const fnIndex = block.source.indexOf(`fn ${fn.name}`);
      if (fnIndex === -1) continue;

      const fnStart = block.source.slice(fnIndex);
      const bodyMatch = fnStart.match(/\{([\s\S]*?)\}(?:\s*$|\s*fn\s)/);
      if (!bodyMatch) continue;

      const body = bodyMatch[1];
      const lines = body.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) continue;

        // Check for unwrap
        if (/\.unwrap\s*\(\s*\)/.test(line)) {
          messages.push({
            rule: 'no-panic-in-async',
            severity,
            message: `.unwrap() in async function '${fn.name}' can panic the tokio runtime`,
            file,
            line: (fn.sourceLine ?? 0) + i + 1,
            column: line.indexOf('.unwrap()'),
            suggestion: `Use ? operator or match to handle the error gracefully`,
          });
        }

        // Check for expect
        if (/\.expect\s*\(/.test(line)) {
          messages.push({
            rule: 'no-panic-in-async',
            severity,
            message: `.expect() in async function '${fn.name}' can panic the tokio runtime`,
            file,
            line: (fn.sourceLine ?? 0) + i + 1,
            column: line.indexOf('.expect('),
            suggestion: `Use ? operator or match to handle the error gracefully`,
          });
        }

        // Check for direct indexing without bounds check
        if (/\[\d+\]/.test(line) && !line.includes('if') && !line.includes('match')) {
          messages.push({
            rule: 'no-panic-in-async',
            severity: 'warning',
            message: `Direct indexing in async function '${fn.name}' can panic if out of bounds`,
            file,
            line: (fn.sourceLine ?? 0) + i + 1,
            suggestion: `Use .get(index) and handle Option, or check bounds first`,
          });
        }
      }
      break;
    }
  }

  return messages;
}

// ─── Main lint function ──────────────────────────────────────────────────

/**
 * Lints a single .psx or .ps file and returns all messages.
 *
 * @param filePath Path to the .psx or .ps file
 * @param source Source code content
 * @param config Lint configuration
 */
export function lintPsxFile(
  filePath: string,
  source: string,
  config?: LintConfig,
): LintResult {
  const rules = { ...DEFAULT_LINT_CONFIG, ...config?.rules };
  const messages: LintMessage[] = [];

  const ext = filePath.endsWith('.ps') ? 'ps' : 'psx';
  const parse = ext === 'ps' ? parsePS(source) : parsePSX(source);

  if (!parse.hasRust) {
    return { file: filePath, messages: [] };
  }

  // Run each rule
  if (rules['no-unused-rust-fn'] !== 'off') {
    messages.push(...checkUnusedRustFns(parse, filePath, rules['no-unused-rust-fn']));
  }
  if (rules['no-unwrap'] !== 'off') {
    messages.push(...checkNoUnwrap(parse, filePath, rules['no-unwrap']));
  }
  if (rules['require-result-return'] !== 'off') {
    messages.push(...checkRequireResultReturn(parse, filePath, rules['require-result-return']));
  }
  if (rules['napi-signature-check'] !== 'off') {
    messages.push(...checkNapiSignature(parse, filePath, rules['napi-signature-check']));
  }
  if (rules['no-panic-in-async'] !== 'off') {
    messages.push(...checkNoPanicInAsync(parse, filePath, rules['no-panic-in-async']));
  }

  // Sort by line number
  messages.sort((a, b) => a.line - b.line);

  return { file: filePath, messages };
}

/**
 * Lints all .psx and .ps files in a directory tree.
 */
export async function lintDirectory(
  rootDir: string,
  config?: LintConfig,
): Promise<LintResult[]> {
  const { readdir } = await import('node:fs/promises');
  const { readFile } = await import('node:fs/promises');
  const results: LintResult[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'target'
        ) continue;
        await walk(fullPath);
        continue;
      }

      const ext = extname(entry.name);
      if (ext !== '.psx' && ext !== '.ps') continue;

      const source = await readFile(fullPath, 'utf-8');
      const result = lintPsxFile(relative(rootDir, fullPath), source, config);
      results.push(result);
    }
  }

  await walk(rootDir);
  return results;
}

/**
 * Formats lint results for terminal display.
 */
export function formatLintResults(results: LintResult[]): string {
  const lines: string[] = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const result of results) {
    if (result.messages.length === 0) continue;

    lines.push(`\n\x1b[1m${result.file}\x1b[0m`);

    for (const msg of result.messages) {
      const sevColor = msg.severity === 'error' ? '\x1b[31m' : '\x1b[33m';
      const sevLabel = msg.severity === 'error' ? 'error' : 'warning';
      const sevReset = '\x1b[0m';

      lines.push(
        `  ${sevColor}${sevLabel}${sevReset} ${msg.message}  ` +
        `\x1b[2m(${msg.rule})\x1b[0m  ` +
        `\x1b[2m${msg.line + 1}${msg.column ? `:${msg.column + 1}` : ''}\x1b[0m`,
      );

      if (msg.suggestion) {
        lines.push(`    \x1b[36m💡 ${msg.suggestion}\x1b[0m`);
      }

      if (msg.severity === 'error') totalErrors++;
      else totalWarnings++;
    }
  }

  lines.push('');
  const summaryParts: string[] = [];
  if (totalErrors > 0) {
    summaryParts.push(`\x1b[31m${totalErrors} error${totalErrors !== 1 ? 's' : ''}\x1b[0m`);
  }
  if (totalWarnings > 0) {
    summaryParts.push(`\x1b[33m${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''}\x1b[0m`);
  }
  if (summaryParts.length === 0) {
    lines.push('\x1b[32m✓ No lint issues found.\x1b[0m');
  } else {
    lines.push(`  ${summaryParts.join(', ')}`);
  }

  return lines.join('\n');
}
