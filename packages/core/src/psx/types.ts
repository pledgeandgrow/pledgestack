/**
 * PSX types — type definitions for the .psx file format.
 *
 * A .psx file contains:
 * - One or more <rust> blocks with Rust source code
 * - TypeScript/JSX code (the rest of the file)
 * - Optional <rust expr> inline expressions
 */

export interface RustBlock {
  /** Raw Rust source code */
  source: string;
  /** Start line in the .psx file (0-indexed) */
  startLine: number;
  /** End line in the .psx file (0-indexed) */
  endLine: number;
  /** Functions extracted from the block */
  functions: RustFunction[];
  /** Structs extracted from the block */
  structs: RustStruct[];
  /** Enums extracted from the block */
  enums: RustEnum[];
  /** Use statements */
  imports: string[];
  /** Source map entries mapping generated Rust line → original .psx/.ps line */
  sourceMap?: SourceMapEntry[];
}

export interface RustFunction {
  name: string;
  isAsync: boolean;
  isPub: boolean;
  params: RustParam[];
  returnType: string;
  returnTypeName: string;
  docComment?: string;
  /** Line number in the original .psx/.ps file (0-indexed) */
  sourceLine?: number;
  /** Attributes on the function (e.g., #[napi], #[cfg(...)]) */
  attributes?: string[];
}

export interface RustParam {
  name: string;
  type: string;
  typeName: string;
}

export interface RustStruct {
  name: string;
  fields: RustField[];
  derives: string[];
  docComment?: string;
  /** Line number in the original .psx/.ps file (0-indexed) */
  sourceLine?: number;
  /** All attributes on the struct (e.g., #[derive(...)], #[napi(object)]) */
  attributes?: string[];
}

export interface RustField {
  name: string;
  type: string;
  typeName: string;
  isOption: boolean;
  docComment?: string;
}

export interface RustEnum {
  name: string;
  variants: RustEnumVariant[];
  derives: string[];
  docComment?: string;
  /** Line number in the original .psx/.ps file (0-indexed) */
  sourceLine?: number;
  /** All attributes on the enum */
  attributes?: string[];
}

export interface InlineRustExpr {
  /** The Rust expression source */
  source: string;
  /** Start position in the TSX content */
  start: number;
  /** End position in the TSX content */
  end: number;
  /** Generated variable name to replace the expression */
  varName: string;
}

export interface RustEnumVariant {
  /** Variant name */
  name: string;
  /** Variant fields (for struct-like variants) */
  fields?: RustField[];
  /** Discriminant value (for enum variants with explicit values) */
  discriminant?: string;
  /** Doc comment for the variant */
  docComment?: string;
}

export interface SourceMapEntry {
  /** Line number in the generated Rust source (lib.rs) — 0-indexed */
  generatedLine: number;
  /** Line number in the original .psx/.ps file — 0-indexed */
  originalLine: number;
  /** Column in the original file (0-indexed, optional) */
  originalColumn?: number;
  /** Module name for disambiguation */
  moduleName: string;
}

export interface PSXParseResult {
  /** The TypeScript/JSX content with rust blocks removed and expressions replaced */
  tsxContent: string;
  /** Extracted Rust blocks */
  rustBlocks: RustBlock[];
  /** Inline rust!{} expressions */
  inlineExpressions: InlineRustExpr[];
  /** All Rust functions across all blocks */
  allFunctions: RustFunction[];
  /** All Rust structs across all blocks */
  allStructs: RustStruct[];
  /** All Rust enums across all blocks */
  allEnums: RustEnum[];
  /** All use statements across all blocks */
  allImports: string[];
  /** Whether the file has any Rust content */
  hasRust: boolean;
  /** Source map entries for mapping generated Rust → original .psx/.ps lines */
  sourceMap?: SourceMapEntry[];
}

export interface PSXTransformResult {
  /** Transformed TypeScript/JSX code ready for Oxc compilation */
  tsx: string;
  /** Generated TypeScript type definitions */
  types: string;
  /** Generated Rust source file content */
  rustSource: string;
  /** Generated NAPI binding Rust code */
  napiBindings: string;
  /** Generated NAPI JavaScript wrapper */
  napiWrapper: string;
  /** Whether Rust compilation is needed */
  needsRustCompile: boolean;
  /** Parse result for debugging */
  parse: PSXParseResult;
  /** Source map for Rust→.psx error mapping */
  sourceMap?: SourceMapEntry[];
  /** Rust source map JSON for cargo --cfg sourcemap */
  rustSourceMapJson?: string;
}
