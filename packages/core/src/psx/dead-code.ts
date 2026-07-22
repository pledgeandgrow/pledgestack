/**
 * PSX dead code elimination — detects and strips unused Rust code.
 *
 * Goal #219: Detect unused Rust functions/structs across .psx/.ps files,
 * strip from compiled addon, reduce .node binary size.
 *
 * Approach:
 * 1. Parse all .psx/.ps files to collect all Rust items (fns, structs, enums)
 * 2. Build a usage graph: which items are referenced by #[napi] exports,
 *    TSX code, or other Rust items
 * 3. Items not reachable from any entry point are dead code
 * 4. Generate a stripped Rust source that excludes dead code
 * 5. Report dead code to the user (integrated with `pledge lint`)
 */

import { readFile } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { parsePSX, parsePS } from './parser';
import type { PSXParseResult, RustFunction } from './types';

/**
 * A Rust item (function, struct, or enum) discovered in a file.
 */
export interface RustItem {
  kind: 'function' | 'struct' | 'enum';
  name: string;
  file: string;
  line: number;
  /** Whether this item is an entry point (#[napi], #[test], or referenced from TSX) */
  isEntryPoint: boolean;
  /** Names of other items this item references */
  references: Set<string>;
}

/**
 * Result of dead code analysis.
 */
export interface DeadCodeResult {
  /** All items discovered */
  totalItems: number;
  /** Items identified as dead code */
  deadItems: RustItem[];
  /** Items that are used (reachable from entry points) */
  liveItems: RustItem[];
  /** Estimated binary size savings in bytes (rough estimate) */
  estimatedSavings: number;
}

/**
 * Analyzes all .psx/.ps files in a directory for dead code.
 *
 * Builds a usage graph starting from entry points (#[napi] functions,
 * #[test] functions, and functions referenced from TSX) and marks
 * all unreachable items as dead code.
 */
export async function analyzeDeadCode(rootDir: string): Promise<DeadCodeResult> {
  const { readdir } = await import('node:fs/promises');
  const allItems: RustItem[] = [];
  const allParses: { file: string; parse: PSXParseResult; source: string }[] = [];

  // ── Phase 1: Collect all items from all files ────────────────────────
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
      const parse = ext === '.ps' ? parsePS(source) : parsePSX(source);
      const relFile = relative(rootDir, fullPath);

      allParses.push({ file: relFile, parse, source });

      // Collect functions
      for (const fn of parse.allFunctions) {
        const attrs = fn.attributes ?? [];
        const isNapi = attrs.some((a) => a.includes('#[napi]'));
        const isTest = attrs.some((a) => a.includes('#[test]') || a.includes('#[tokio::test]'));

        // Check if referenced from TSX
        const tsxRef = parse.tsxContent.includes(`rust.${fn.name}`) ||
          parse.tsxContent.includes(`rust?.${fn.name}`);

        const isEntryPoint = isNapi || isTest || tsxRef;

        // Find references in function body
        const references = extractReferences(fn, parse);

        allItems.push({
          kind: 'function' as const,
          name: fn.name,
          file: relFile,
          line: fn.sourceLine ?? 0,
          isEntryPoint,
          references,
        });
      }

      // Collect structs
      for (const struct of parse.allStructs) {
        const attrs = struct.attributes ?? [];
        const isNapi = attrs.some((a) => a.includes('#[napi]'));

        // Struct is an entry point if used in a #[napi] function signature
        const isEntryPoint = isNapi || isStructUsedInNapi(struct.name, parse);

        // Find references to other types in fields
        const references = new Set<string>();
        for (const field of struct.fields) {
          // Extract type names from field types
          const typeMatches = field.type.match(/\b[A-Z][a-zA-Z0-9_]*\b/g);
          if (typeMatches) {
            for (const t of typeMatches) {
              if (!isPrimitiveType(t)) references.add(t);
            }
          }
        }

        allItems.push({
          kind: 'struct' as const,
          name: struct.name,
          file: relFile,
          line: struct.sourceLine ?? 0,
          isEntryPoint,
          references,
        });
      }

      // Collect enums
      for (const enumDef of parse.allEnums) {
        const attrs = enumDef.attributes ?? [];
        const isNapi = attrs.some((a) => a.includes('#[napi]'));

        const isEntryPoint = isNapi || isEnumUsedInNapi(enumDef.name, parse);

        const references = new Set<string>();
        for (const variant of enumDef.variants) {
          // Tuple variants may reference other types
          if (variant.fields) {
            for (const field of variant.fields) {
              const typeMatches = field.type.match(/\b[A-Z][a-zA-Z0-9_]*\b/g);
              if (typeMatches) {
                for (const t of typeMatches) {
                  if (!isPrimitiveType(t)) references.add(t);
                }
              }
            }
          }
        }

        allItems.push({
          kind: 'enum' as const,
          name: enumDef.name,
          file: relFile,
          line: enumDef.sourceLine ?? 0,
          isEntryPoint,
          references,
        });
      }
    }
  }

  await walk(rootDir);

  // ── Phase 2: Build usage graph and find reachable items ──────────────
  const itemMap = new Map<string, RustItem>();
  for (const item of allItems) {
    itemMap.set(item.name, item);
  }

  const reachable = new Set<string>();
  const queue: string[] = [];

  // Start with all entry points
  for (const item of allItems) {
    if (item.isEntryPoint) {
      reachable.add(item.name);
      queue.push(item.name);
    }
  }

  // BFS through references
  while (queue.length > 0) {
    const name = queue.shift()!;
    const item = itemMap.get(name);
    if (!item) continue;

    for (const ref of item.references) {
      if (!reachable.has(ref) && itemMap.has(ref)) {
        reachable.add(ref);
        queue.push(ref);
      }
    }
  }

  // ── Phase 3: Classify items ──────────────────────────────────────────
  const liveItems = allItems.filter((item) => reachable.has(item.name));
  const deadItems = allItems.filter((item) => !reachable.has(item.name));

  // Rough estimate: each dead function ~200 bytes, struct ~100 bytes, enum ~50 bytes
  const estimatedSavings =
    deadItems.filter((i) => i.kind === 'function').length * 200 +
    deadItems.filter((i) => i.kind === 'struct').length * 100 +
    deadItems.filter((i) => i.kind === 'enum').length * 50;

  return {
    totalItems: allItems.length,
    deadItems,
    liveItems,
    estimatedSavings,
  };
}

/**
 * Extracts type references from a function's body and signature.
 */
function extractReferences(fn: RustFunction, parse: PSXParseResult): Set<string> {
  const refs = new Set<string>();

  // References from return type
  const returnTypeMatches = fn.returnType.match(/\b[A-Z][a-zA-Z0-9_]*\b/g);
  if (returnTypeMatches) {
    for (const t of returnTypeMatches) {
      if (!isPrimitiveType(t)) refs.add(t);
    }
  }

  // References from parameter types
  for (const param of fn.params) {
    const typeMatches = param.type.match(/\b[A-Z][a-zA-Z0-9_]*\b/g);
    if (typeMatches) {
      for (const t of typeMatches) {
        if (!isPrimitiveType(t)) refs.add(t);
      }
    }
  }

  // References from function body (in the Rust block source)
  for (const block of parse.rustBlocks) {
    const fnIndex = block.source.indexOf(`fn ${fn.name}`);
    if (fnIndex === -1) continue;

    // Find the function body
    const fnStart = block.source.slice(fnIndex);
    const bodyMatch = fnStart.match(/\{([\s\S]*?)\}(?:\s*$|\s*fn\s)/);
    if (bodyMatch) {
      const body = bodyMatch[1];
      // Find all capitalized identifiers (potential type references)
      const typeMatches = body.match(/\b[A-Z][a-zA-Z0-9_]*\b/g);
      if (typeMatches) {
        for (const t of typeMatches) {
          if (!isPrimitiveType(t)) refs.add(t);
        }
      }

      // Find function calls (lowercase identifiers followed by ()
      const fnCallMatches = body.match(/\b([a-z_][a-zA-Z0-9_]*)\s*\(/g);
      if (fnCallMatches) {
        for (const call of fnCallMatches) {
          const name = call.replace(/\s*\($/, '');
          refs.add(name);
        }
      }
    }
    break;
  }

  return refs;
}

/**
 * Checks if a struct name is used in any #[napi] function's parameters or return type.
 */
function isStructUsedInNapi(structName: string, parse: PSXParseResult): boolean {
  for (const fn of parse.allFunctions) {
    const attrs = fn.attributes ?? [];
    if (!attrs.some((a) => a.includes('#[napi]'))) continue;

    if (fn.returnType.includes(structName)) return true;
    for (const param of fn.params) {
      if (param.type.includes(structName)) return true;
    }
  }
  return false;
}

/**
 * Checks if an enum name is used in any #[napi] function's parameters or return type.
 */
function isEnumUsedInNapi(enumName: string, parse: PSXParseResult): boolean {
  for (const fn of parse.allFunctions) {
    const attrs = fn.attributes ?? [];
    if (!attrs.some((a) => a.includes('#[napi]'))) continue;

    if (fn.returnType.includes(enumName)) return true;
    for (const param of fn.params) {
      if (param.type.includes(enumName)) return true;
    }
  }
  return false;
}

/**
 * Checks if a type name is a Rust primitive.
 */
function isPrimitiveType(name: string): boolean {
  const primitives = new Set([
    'String', 'str', 'Vec', 'Option', 'Result', 'Box',
    'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
    'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
    'f32', 'f64', 'bool', 'char',
    'Self', 'Some', 'None', 'Ok', 'Err',
  ]);
  return primitives.has(name);
}

/**
 * Formats dead code analysis results for display.
 */
export function formatDeadCodeResult(result: DeadCodeResult): string {
  const lines: string[] = [];

  if (result.deadItems.length === 0) {
    lines.push('\x1b[32m✓ No dead code detected.\x1b[0m');
    lines.push(`  ${result.totalItems} items analyzed, all reachable from entry points.`);
    return lines.join('\n');
  }

  lines.push('\x1b[33mDead code detected:\x1b[0m\n');

  const grouped = new Map<string, RustItem[]>();
  for (const item of result.deadItems) {
    const items = grouped.get(item.file) ?? [];
    items.push(item);
    grouped.set(item.file, items);
  }

  for (const [file, items] of grouped) {
    lines.push(`  \x1b[1m${file}\x1b[0m`);
    for (const item of items) {
      const icon = item.kind === 'function' ? 'fn' : item.kind === 'struct' ? 'st' : 'en';
      lines.push(
        `    \x1b[33m${icon}\x1b[0m ${item.name}  \x1b[2m(line ${item.line + 1})\x1b[0m`,
      );
    }
  }

  lines.push('');
  lines.push(
    `  \x1b[33m${result.deadItems.length}\x1b[0m dead item${result.deadItems.length !== 1 ? 's' : ''}, ` +
    `\x1b[32m${result.liveItems.length}\x1b[0m live item${result.liveItems.length !== 1 ? 's' : ''}`,
  );
  lines.push(`  Estimated binary savings: ~${result.estimatedSavings} bytes`);

  return lines.join('\n');
}
