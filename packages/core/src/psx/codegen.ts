/**
 * PSX codegen — generates TypeScript types, NAPI bindings, and Rust source
 * from parsed .psx files.
 *
 * Given a PSXParseResult, produces:
 * 1. TypeScript type definitions (.d.ts) from Rust structs/enums
 * 2. NAPI binding Rust code (napi-rs macros) wrapping user functions
 * 3. JavaScript wrapper module that imports the native addon
 * 4. Complete Rust source file (Cargo.toml + lib.rs) for compilation
 */

import type { PSXParseResult, SourceMapEntry } from './types';

/**
 * Generates TypeScript type definitions from Rust structs and enums.
 */
export function generateTypeDefinitions(parse: PSXParseResult): string {
  const lines: string[] = [
    '/**',
    ' * Auto-generated type definitions from .psx Rust blocks.',
    ' * Do not edit manually — PledgePack regenerates on build.',
    ' */',
    '',
  ];

  // Generate enums
  for (const enumDef of parse.allEnums) {
    if (enumDef.docComment) lines.push(`/** ${enumDef.docComment} */`);
    lines.push(`export type ${enumDef.name} = ${enumDef.variants.map((v) => `'${v.name}'`).join(' | ')};`);
    lines.push('');
  }

  // Generate structs as interfaces
  for (const struct of parse.allStructs) {
    if (struct.docComment) lines.push(`/** ${struct.docComment} */`);
    lines.push(`export interface ${struct.name} {`);
    for (const field of struct.fields) {
      if (field.docComment) lines.push(`  /** ${field.docComment} */`);
      const optional = field.isOption ? '?' : '';
      lines.push(`  ${field.name}${optional}: ${field.typeName};`);
    }
    lines.push('}');
    lines.push('');
  }

  // Generate rust namespace declaration
  if (parse.allFunctions.length > 0 || parse.inlineExpressions.length > 0) {
    lines.push('export declare const rust: {');
    for (const fn of parse.allFunctions) {
      const params = fn.params
        .filter((p) => p.name !== 'self' && p.name !== '&self')
        .map((p) => `${p.name}: ${p.typeName}`)
        .join(', ');
      if (fn.docComment) lines.push(`  /** ${fn.docComment} */`);
      lines.push(`  ${fn.name}(${params}): Promise<${fn.returnTypeName}>;`);
    }
    for (const expr of parse.inlineExpressions) {
      lines.push(`  ${expr.varName}(): Promise<unknown>;`);
    }
    lines.push('};');
  }

  return lines.join('\n');
}

/**
 * Generates the NAPI binding Rust code that wraps user functions
 * for Node.js FFI access via napi-rs.
 */
export function generateNapiBindings(parse: PSXParseResult): string {
  const lines: string[] = [
    '// Auto-generated NAPI bindings from .psx Rust blocks.',
    '// Do not edit manually — PledgePack regenerates on build.',
    '',
    'use napi_derive::napi;',
    'use serde::Serialize;',
    '',
  ];

  // Add napi-wrapped structs
  for (const struct of parse.allStructs) {
    if (struct.docComment) lines.push(`/// ${struct.docComment}`);
    lines.push('#[napi(object)]');
    lines.push(`pub struct ${struct.name}Napi {`);
    for (const field of struct.fields) {
      const napiType = rustTypeToNapi(field.type);
      lines.push(`  pub ${field.name}: ${field.isOption ? `Option<${napiType}>` : napiType},`);
    }
    lines.push('}');
    lines.push('');
  }

  // Add napi-wrapped functions
  for (const fn of parse.allFunctions) {
    if (!fn.isPub) continue;

    if (fn.docComment) lines.push(`/// ${fn.docComment}`);
    lines.push('#[napi]');
    const params = fn.params
      .filter((p) => p.name !== 'self' && p.name !== '&self' && p.name !== '&pool' && p.name !== 'pool')
      .map((p) => `${p.name}: ${rustTypeToNapi(p.type)}`)
      .join(', ');

    const returnType = rustTypeToNapi(fn.returnType);
    lines.push(`pub async fn ${fn.name}_napi(${params}) -> Result<${returnType}, napi::Error> {`);

    // Build the call to the user's function
    const callParams = fn.params
      .filter((p) => p.name !== 'self' && p.name !== '&self')
      .map((p) => p.name)
      .join(', ');

    lines.push(`    ${fn.name}(${callParams}).await.map_err(|e| napi::Error::from_reason(e.to_string()))`);
    lines.push('}');
    lines.push('');
  }

  // Add inline expression functions
  for (const expr of parse.inlineExpressions) {
    lines.push('#[napi]');
    lines.push(`pub async fn ${expr.varName}() -> Result<serde_json::Value, napi::Error> {`);
    lines.push(`    let result = ${expr.source};`);
    lines.push(`    Ok(serde_json::to_value(result).map_err(|e| napi::Error::from_reason(e.to_string()))?)`);
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generates the complete Rust source file for cargo compilation.
 * Combines user code + NAPI bindings + necessary imports.
 * Also produces source map entries mapping generated lines to original .psx/.ps lines.
 */
export function generateRustSource(
  parse: PSXParseResult,
  moduleName: string,
): { rustSource: string; sourceMap: SourceMapEntry[] } {
  const lines: string[] = [
    `// Auto-generated Rust source for ${moduleName}.psx`,
    '// Do not edit manually — PledgePack regenerates on build.',
    '',
  ];
  const sourceMap: SourceMapEntry[] = [];

  // Standard imports
  lines.push('use napi_derive::napi;');
  lines.push('use serde::Serialize;');
  lines.push('use serde::Deserialize;');
  lines.push('');

  // User imports — track source map for each
  for (const imp of parse.allImports) {
    const generatedLine = lines.length;
    lines.push(`use ${imp};`);
    // Find matching source map entry from parse
    const entry = parse.sourceMap?.find((e) => e.originalLine >= 0 && e.moduleName === moduleName);
    if (entry) {
      sourceMap.push({
        generatedLine,
        originalLine: entry.originalLine,
        moduleName,
      });
    }
  }
  lines.push('');

  // User Rust code (from blocks) — track line offsets for source mapping
  for (const block of parse.rustBlocks) {
    const blockStartLine = lines.length;
    lines.push('// === User Rust code ===');
    // Split block source into lines and track mapping
    const blockLines = block.source.split('\n');
    for (let i = 0; i < blockLines.length; i++) {
      const generatedLine = blockStartLine + 1 + i; // +1 for the comment line
      const originalLine = block.startLine + i;
      sourceMap.push({
        generatedLine,
        originalLine,
        moduleName,
      });
      lines.push(blockLines[i]);
    }
    lines.push('');
  }

  // NAPI bindings
  lines.push('// === NAPI bindings (auto-generated) ===');
  const napiCode = generateNapiBindings(parse);
  lines.push(napiCode);

  // Inline expressions
  if (parse.inlineExpressions.length > 0) {
    lines.push('// === Inline expressions (auto-generated) ===');
    for (const expr of parse.inlineExpressions) {
      lines.push(`#[napi]`);
      lines.push(`pub async fn ${expr.varName}() -> Result<serde_json::Value, napi::Error> {`);
      lines.push(`    let result = { ${expr.source} };`);
      lines.push(`    Ok(serde_json::to_value(result).map_err(|e| napi::Error::from_reason(e.to_string()))?)`);
      lines.push('}');
      lines.push('');
    }
  }

  return { rustSource: lines.join('\n'), sourceMap };
}

/**
 * Generates a Cargo.toml for the .psx module.
 */
export function generateCargoToml(moduleName: string, parse: PSXParseResult): string {
  const hasSqlx = parse.allImports.some((i) => i.includes('sqlx'));

  const dependencies: string[] = [
    'napi = { version = "2", features = ["napi8", "async"] }',
    'napi-derive = "2"',
    'serde = { version = "1", features = ["derive"] }',
    'serde_json = "1"',
    'tokio = { version = "1", features = ["full"] }',
  ];

  if (hasSqlx) {
    dependencies.push('sqlx = { version = "0.7", features = ["runtime-tokio", "postgres", "macros", "chrono"] }');
  }

  return `[package]
name = "pledge-${moduleName}"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
${dependencies.map((d) => `${d}`).join('\n')}

[profile.release]
lto = true
opt-level = 3
`;
}

/**
 * Generates the JavaScript wrapper that imports the native addon
 * and provides the `rust` namespace.
 */
export function generateNapiWrapper(
  parse: PSXParseResult,
  addonPath: string,
): string {
  const lines: string[] = [
    '/**',
    ' * Auto-generated NAPI wrapper for .psx Rust functions.',
    ' * Do not edit manually — PledgePack regenerates on build.',
    ' */',
    '',
    `const addon = require('${addonPath}');`,
    '',
    'export const rust = {',
  ];

  for (const fn of parse.allFunctions) {
    if (!fn.isPub) continue;
    lines.push(`  ${fn.name}: addon.${fn.name}_napi,`);
  }

  for (const expr of parse.inlineExpressions) {
    lines.push(`  ${expr.varName}: addon.${expr.varName},`);
  }

  lines.push('};');
  lines.push('');

  return lines.join('\n');
}

/**
 * Maps Rust types to NAPI-compatible Rust types.
 */
function rustTypeToNapi(rustType: string): string {
  const trimmed = rustType.trim().replace(/&/g, '').replace(/'\w+/g, '').replace(/\bmut\b/g, '').trim();

  // Option<T> → Option<NapiT>
  const optionMatch = trimmed.match(/Option<(.+)>/);
  if (optionMatch) {
    return `Option<${rustTypeToNapi(optionMatch[1])}>`;
  }

  // Vec<T> → Vec<NapiT>
  const vecMatch = trimmed.match(/Vec<(.+)>/);
  if (vecMatch) {
    return `Vec<${rustTypeToNapi(vecMatch[1])}>`;
  }

  // Result<T, E> → T
  const resultMatch = trimmed.match(/Result<([^,]+),\s*[^>]+>/);
  if (resultMatch) {
    return rustTypeToNapi(resultMatch[1]);
  }

  // Primitives
  const primitiveMap: Record<string, string> = {
    'i8': 'i8',
    'i16': 'i16',
    'i32': 'i32',
    'i64': 'i64',
    'u8': 'u8',
    'u16': 'u16',
    'u32': 'u32',
    'u64': 'u64',
    'f32': 'f32',
    'f64': 'f64',
    'bool': 'bool',
    'String': 'String',
    'str': 'String',
    '&str': 'String',
    '()': '()',
  };

  if (primitiveMap[trimmed]) return primitiveMap[trimmed];

  // Custom struct → use Napi variant
  return `${trimmed}Napi`;
}
