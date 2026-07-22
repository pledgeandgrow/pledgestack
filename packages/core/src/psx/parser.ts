/**
 * PSX parser — splits .psx files into Rust blocks and TypeScript/JSX.
 *
 * Syntax:
 *   <rust>
 *     // Rust code here
 *   </rust>
 *
 *   // TypeScript/JSX here
 *   export default function Page() { ... }
 *
 * Inline expressions:
 *   const result = await rust! { sqlx::query_scalar!("SELECT 1") };
 *
 * The parser uses a tokenizer-based approach (not regex) for Rust source parsing:
 * 1. Finds all <rust>...</rust> blocks and extracts them (tag-based, safe for regex)
 * 2. Finds all rust!{...} inline expressions and replaces them with variable references
 * 3. Tokenizes Rust source and walks tokens to extract items with accurate line numbers
 * 4. Generates source map entries mapping generated Rust lines → original .psx/.ps lines
 * 5. Returns clean TSX content + structured Rust metadata + source map
 */

import type {
  PSXParseResult,
  RustBlock,
  RustFunction,
  RustParam,
  RustStruct,
  RustField,
  RustEnum,
  RustEnumVariant,
  InlineRustExpr,
  SourceMapEntry,
} from './types';


/**
 * Parses a .psx file content into structured Rust + TSX parts.
 */
export function parsePSX(source: string): PSXParseResult {
  const rustBlocks: RustBlock[] = [];
  const inlineExpressions: InlineRustExpr[] = [];
  const allFunctions: RustFunction[] = [];
  const allStructs: RustStruct[] = [];
  const allEnums: RustEnum[] = [];
  const allImports: string[] = [];
  const sourceMap: SourceMapEntry[] = [];

  // 1. Extract <rust>...</rust> blocks — tag-based extraction is safe with regex
  let tsxContent = source;
  const blockRegex = /<rust>([\s\S]*?)<\/rust>/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(source)) !== null) {
    const rustSource = match[1];
    const fullMatch = match[0];

    // Calculate line numbers in the original source
    const startLine = source.slice(0, match.index).split('\n').length - 1;
    const endLine = startLine + fullMatch.split('\n').length - 1;

    const parser = new RustSourceParser(rustSource, startLine);
    const { functions, structs, enums, imports, blockSourceMap } = parser.parse();

    const block: RustBlock = {
      source: rustSource.trim(),
      startLine,
      endLine,
      functions,
      structs,
      enums,
      imports,
      sourceMap: blockSourceMap,
    };

    rustBlocks.push(block);
    allFunctions.push(...functions);
    allStructs.push(...structs);
    allEnums.push(...enums);
    allImports.push(...imports);
    sourceMap.push(...blockSourceMap);
  }

  // Remove <rust> blocks from TSX content
  tsxContent = tsxContent.replace(blockRegex, '');

  // 2. Extract inline rust!{...} expressions — uses brace matching, not regex on Rust
  let inlineIndex = 0;
  const inlineRegex = /rust!\s*\{([\s\S]*?)\};?/g;
  let inlineMatch: RegExpExecArray | null;

  while ((inlineMatch = inlineRegex.exec(tsxContent)) !== null) {
    const exprSource = inlineMatch[1].trim();
    const varName = `__rust_expr_${inlineIndex}`;

    const inlineExpr: InlineRustExpr = {
      source: exprSource,
      start: inlineMatch.index,
      end: inlineMatch.index + inlineMatch[0].length,
      varName,
    };

    inlineExpressions.push(inlineExpr);
    inlineIndex++;
  }

  // Replace inline expressions with variable references
  let replacedTsx = tsxContent;
  for (let i = inlineExpressions.length - 1; i >= 0; i--) {
    const expr = inlineExpressions[i];
    const hasAwait = tsxContent.slice(Math.max(0, expr.start - 10), expr.start).includes('await');
    const replacement = hasAwait ? `await ${expr.varName}()` : `${expr.varName}()`;
    replacedTsx =
      replacedTsx.slice(0, expr.start) +
      replacement +
      replacedTsx.slice(expr.end);
  }

  // Clean up any leftover empty lines from removed blocks
  replacedTsx = replacedTsx.replace(/^\s*$/gm, '').replace(/\n{3,}/g, '\n\n');

  return {
    tsxContent: replacedTsx.trim(),
    rustBlocks,
    inlineExpressions,
    allFunctions,
    allStructs,
    allEnums,
    allImports,
    hasRust: rustBlocks.length > 0 || inlineExpressions.length > 0,
    sourceMap,
  };
}

/**
 * Parses a .ps file (pure Rust, no TypeScript/JSX).
 *
 * The entire file is treated as one Rust block. No <rust> tags needed,
 * no TSX extraction, no inline expressions. Just plain Rust source code.
 *
 * Usage:
 *   // app/api/users/route.ps
 *   use sqlx::PgPool;
 *
 *   pub async fn get_users(pool: &PgPool) -> Vec<User> {
 *       sqlx::query_as!(User, "SELECT * FROM users").fetch_all(pool).await
 *   }
 *
 * The file is parsed for functions, structs, and enums — same as <rust> blocks.
 * TypeScript types are auto-generated so .tsx files can import and use them.
 */
export function parsePS(source: string): PSXParseResult {
  const parser = new RustSourceParser(source, 0);
  const { functions, structs, enums, imports, blockSourceMap } = parser.parse();

  const block: RustBlock = {
    source: source.trim(),
    startLine: 0,
    endLine: source.split('\n').length - 1,
    functions,
    structs,
    enums,
    imports,
    sourceMap: blockSourceMap,
  };

  return {
    tsxContent: '',
    rustBlocks: [block],
    inlineExpressions: [],
    allFunctions: functions,
    allStructs: structs,
    allEnums: enums,
    allImports: imports,
    hasRust: true,
    sourceMap: blockSourceMap,
  };
}

// ─── Tokenizer ──────────────────────────────────────────────────────────

interface Token {
  type: 'ident' | 'keyword' | 'symbol' | 'string' | 'number' | 'attr' | 'doc_comment' | 'line_comment' | 'whitespace' | 'newline';
  value: string;
  line: number;
  col: number;
  pos: number;
}

const RUST_KEYWORDS = new Set([
  'fn', 'struct', 'enum', 'use', 'pub', 'async', 'await', 'let', 'mut', 'const',
  'static', 'impl', 'trait', 'mod', 'match', 'if', 'else', 'for', 'while', 'loop',
  'return', 'break', 'continue', 'move', 'ref', 'self', 'Self', 'super', 'crate',
  'as', 'in', 'where', 'dyn', 'unsafe', 'extern', 'type', 'union',
]);

/**
 * Tokenizes Rust source code into a stream of tokens with line/col tracking.
 */
function tokenizeRust(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 0;
  let col = 0;

  while (i < source.length) {
    const ch = source[i];
    const startPos = i;
    const startLine = line;
    const startCol = col;

    // Newline
    if (ch === '\n') {
      tokens.push({ type: 'newline', value: '\n', line: startLine, col: startCol, pos: startPos });
      line++;
      col = 0;
      i++;
      continue;
    }

    // Whitespace (spaces, tabs)
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      let ws = '';
      while (i < source.length && (source[i] === ' ' || source[i] === '\t' || source[i] === '\r')) {
        ws += source[i];
        col++;
        i++;
      }
      tokens.push({ type: 'whitespace', value: ws, line: startLine, col: startCol, pos: startPos });
      continue;
    }

    // Line comment (//)
    if (ch === '/' && source[i + 1] === '/') {
      let comment = '';
      while (i < source.length && source[i] !== '\n') {
        comment += source[i];
        col++;
        i++;
      }
      // Distinguish doc comments (/// or //!)
      const isDoc = comment.startsWith('///') || comment.startsWith('//!');
      tokens.push({
        type: isDoc ? 'doc_comment' : 'line_comment',
        value: comment,
        line: startLine,
        col: startCol,
        pos: startPos,
      });
      continue;
    }

    // Block comment (/* ... */) — with nesting support
    if (ch === '/' && source[i + 1] === '*') {
      let depth = 1;
      let comment = '/*';
      i += 2;
      col += 2;
      while (i < source.length && depth > 0) {
        if (source[i] === '/' && source[i + 1] === '*') {
          depth++;
          comment += '/*';
          i += 2;
          col += 2;
        } else if (source[i] === '*' && source[i + 1] === '/') {
          depth--;
          comment += '*/';
          i += 2;
          col += 2;
        } else {
          if (source[i] === '\n') {
            line++;
            col = 0;
          } else {
            col++;
          }
          comment += source[i];
          i++;
        }
      }
      const isDoc = comment.startsWith('/**') || comment.startsWith('/*!');
      tokens.push({
        type: isDoc ? 'doc_comment' : 'line_comment',
        value: comment,
        line: startLine,
        col: startCol,
        pos: startPos,
      });
      continue;
    }

    // Attribute (#[...])
    if (ch === '#' && source[i + 1] === '[') {
      let attr = '';
      let depth = 0;
      while (i < source.length) {
        if (source[i] === '[') depth++;
        if (source[i] === ']') {
          depth--;
          if (depth === 0) {
            attr += source[i];
            col++;
            i++;
            break;
          }
        }
        if (source[i] === '\n') {
          line++;
          col = 0;
        } else {
          col++;
        }
        attr += source[i];
        i++;
      }
      tokens.push({ type: 'attr', value: attr, line: startLine, col: startCol, pos: startPos });
      continue;
    }

    // String literal ("..." or r"..." or raw strings)
    if (ch === '"' || (ch === 'r' && (source[i + 1] === '"' || source[i + 1] === '#'))) {
      let str = '';
      // Handle raw strings r"..." or r#"..."#
      if (ch === 'r') {
        str += source[i];
        col++;
        i++;
        // Count hash marks
        let hashes = 0;
        while (source[i] === '#') {
          str += source[i];
          col++;
          i++;
          hashes++;
        }
        if (source[i] === '"') {
          str += source[i];
          col++;
          i++;
          // Read until closing " followed by same number of #
          while (i < source.length) {
            if (source[i] === '"') {
              str += source[i];
              col++;
              i++;
              let closeHashes = 0;
              while (closeHashes < hashes && source[i] === '#') {
                str += source[i];
                col++;
                i++;
                closeHashes++;
              }
              if (closeHashes === hashes) break;
            } else {
              if (source[i] === '\n') {
                line++;
                col = 0;
              } else {
                col++;
              }
              str += source[i];
              i++;
            }
          }
        }
      } else {
        // Regular string with escape handling
        str += source[i];
        col++;
        i++;
        while (i < source.length && source[i] !== '"') {
          if (source[i] === '\\' && i + 1 < source.length) {
            str += source[i] + source[i + 1];
            col += 2;
            i += 2;
          } else {
            if (source[i] === '\n') {
              line++;
              col = 0;
            } else {
              col++;
            }
            str += source[i];
            i++;
          }
        }
        if (i < source.length) {
          str += source[i]; // closing "
          col++;
          i++;
        }
      }
      tokens.push({ type: 'string', value: str, line: startLine, col: startCol, pos: startPos });
      continue;
    }

    // Char literal ('...')
    if (ch === '\'') {
      let str = ch;
      col++;
      i++;
      while (i < source.length && source[i] !== '\'') {
        if (source[i] === '\\' && i + 1 < source.length) {
          str += source[i] + source[i + 1];
          col += 2;
          i += 2;
        } else {
          str += source[i];
          col++;
          i++;
        }
      }
      if (i < source.length) {
        str += source[i];
        col++;
        i++;
      }
      tokens.push({ type: 'string', value: str, line: startLine, col: startCol, pos: startPos });
      continue;
    }

    // Number literal
    if (ch >= '0' && ch <= '9') {
      let num = '';
      while (i < source.length && /[0-9a-fA-FxXoObBeE_\.]/.test(source[i])) {
        num += source[i];
        col++;
        i++;
      }
      tokens.push({ type: 'number', value: num, line: startLine, col: startCol, pos: startPos });
      continue;
    }

    // Identifier or keyword
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) {
        ident += source[i];
        col++;
        i++;
      }
      // Check for lifetime ('ident)
      if (startCol === 0 && source[startPos] === '\'') {
        // Already handled above
      }
      tokens.push({
        type: RUST_KEYWORDS.has(ident) ? 'keyword' : 'ident',
        value: ident,
        line: startLine,
        col: startCol,
        pos: startPos,
      });
      continue;
    }

    // Lifetime ('ident)
    if (ch === '\'') {
      let lt = ch;
      col++;
      i++;
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) {
        lt += source[i];
        col++;
        i++;
      }
      tokens.push({ type: 'symbol', value: lt, line: startLine, col: startCol, pos: startPos });
      continue;
    }

    // Single-character symbols
    tokens.push({ type: 'symbol', value: ch, line: startLine, col: startCol, pos: startPos });
    col++;
    i++;
  }

  return tokens;
}

// ─── Rust Source Parser ──────────────────────────────────────────────────

/**
 * Parser for Rust source code within a <rust> block or .ps file.
 * Uses the tokenizer for accurate item extraction with line tracking.
 */
class RustSourceParser {
  private tokens: Token[];
  private pos = 0;
  private baseLineOffset: number;
  private moduleName: string;

  constructor(source: string, baseLineOffset: number, moduleName = 'unknown') {
    this.tokens = tokenizeRust(source);
    this.baseLineOffset = baseLineOffset;
    this.moduleName = moduleName;
  }

  parse(): {
    functions: RustFunction[];
    structs: RustStruct[];
    enums: RustEnum[];
    imports: string[];
    blockSourceMap: SourceMapEntry[];
  } {
    const functions: RustFunction[] = [];
    const structs: RustStruct[] = [];
    const enums: RustEnum[] = [];
    const imports: string[] = [];
    const blockSourceMap: SourceMapEntry[] = [];

    // Collect pending attributes and doc comments
    let pendingAttrs: string[] = [];
    let pendingDocComments: string[] = [];

    while (this.pos < this.tokens.length) {
      const token = this.peek();
      if (!token) break;

      // Skip whitespace and newlines
      if (token.type === 'whitespace' || token.type === 'newline') {
        this.advance();
        continue;
      }

      // Collect doc comments
      if (token.type === 'doc_comment') {
        const docText = token.value.replace(/^\/\/\/\s*/, '').replace(/^\/\/!\s*/, '').trim();
        pendingDocComments.push(docText);
        this.advance();
        continue;
      }

      // Skip regular comments
      if (token.type === 'line_comment') {
        this.advance();
        continue;
      }

      // Collect attributes
      if (token.type === 'attr') {
        pendingAttrs.push(token.value);
        this.advance();
        continue;
      }

      // Parse use statements
      if (token.type === 'keyword' && token.value === 'use') {
        const importPath = this.parseUseStatement();
        if (importPath) {
          imports.push(importPath);
          blockSourceMap.push({
            generatedLine: -1, // filled during codegen
            originalLine: this.baseLineOffset + token.line,
            moduleName: this.moduleName,
          });
        }
        pendingAttrs = [];
        pendingDocComments = [];
        continue;
      }

      // Parse pub keyword — look ahead for fn/struct/enum
      let isPub = false;
      if (token.type === 'keyword' && token.value === 'pub') {
        isPub = true;
        this.advance();
        // Skip whitespace
        this.skipWhitespace();
        const next = this.peek();
        if (!next) continue;

        if (next.type === 'keyword' && next.value === 'fn') {
          const fn = this.parseFunction(isPub, pendingAttrs, pendingDocComments);
          if (fn) {
            functions.push(fn);
            blockSourceMap.push({
              generatedLine: -1,
              originalLine: this.baseLineOffset + next.line,
              moduleName: this.moduleName,
            });
          }
          pendingAttrs = [];
          pendingDocComments = [];
          continue;
        }

        if (next.type === 'keyword' && next.value === 'struct') {
          const struct = this.parseStruct(isPub, pendingAttrs, pendingDocComments);
          if (struct) {
            structs.push(struct);
            blockSourceMap.push({
              generatedLine: -1,
              originalLine: this.baseLineOffset + next.line,
              moduleName: this.moduleName,
            });
          }
          pendingAttrs = [];
          pendingDocComments = [];
          continue;
        }

        if (next.type === 'keyword' && next.value === 'enum') {
          const enumDef = this.parseEnum(isPub, pendingAttrs, pendingDocComments);
          if (enumDef) {
            enums.push(enumDef);
            blockSourceMap.push({
              generatedLine: -1,
              originalLine: this.baseLineOffset + next.line,
              moduleName: this.moduleName,
            });
          }
          pendingAttrs = [];
          pendingDocComments = [];
          continue;
        }

        // pub(crate), pub(super) etc.
        if (next.type === 'symbol' && next.value === '(') {
          this.skipBalanced('(', ')');
          this.skipWhitespace();
          const after = this.peek();
          if (after?.type === 'keyword' && after.value === 'fn') {
            const fn = this.parseFunction(true, pendingAttrs, pendingDocComments);
            if (fn) {
              functions.push(fn);
              blockSourceMap.push({
                generatedLine: -1,
                originalLine: this.baseLineOffset + after.line,
                moduleName: this.moduleName,
              });
            }
          } else if (after?.type === 'keyword' && after.value === 'struct') {
            const struct = this.parseStruct(true, pendingAttrs, pendingDocComments);
            if (struct) {
              structs.push(struct);
              blockSourceMap.push({
                generatedLine: -1,
                originalLine: this.baseLineOffset + after.line,
                moduleName: this.moduleName,
              });
            }
          } else if (after?.type === 'keyword' && after.value === 'enum') {
            const enumDef = this.parseEnum(true, pendingAttrs, pendingDocComments);
            if (enumDef) {
              enums.push(enumDef);
              blockSourceMap.push({
                generatedLine: -1,
                originalLine: this.baseLineOffset + after.line,
                moduleName: this.moduleName,
              });
            }
          }
          pendingAttrs = [];
          pendingDocComments = [];
          continue;
        }

        // Other pub items (const, static, etc.) — skip to next item
        pendingAttrs = [];
        pendingDocComments = [];
        continue;
      }

      // Non-pub fn/struct/enum
      if (token.type === 'keyword' && token.value === 'fn') {
        const fn = this.parseFunction(false, pendingAttrs, pendingDocComments);
        if (fn) {
          functions.push(fn);
          blockSourceMap.push({
            generatedLine: -1,
            originalLine: this.baseLineOffset + token.line,
            moduleName: this.moduleName,
          });
        }
        pendingAttrs = [];
        pendingDocComments = [];
        continue;
      }

      if (token.type === 'keyword' && token.value === 'struct') {
        const struct = this.parseStruct(false, pendingAttrs, pendingDocComments);
        if (struct) {
          structs.push(struct);
          blockSourceMap.push({
            generatedLine: -1,
            originalLine: this.baseLineOffset + token.line,
            moduleName: this.moduleName,
          });
        }
        pendingAttrs = [];
        pendingDocComments = [];
        continue;
      }

      if (token.type === 'keyword' && token.value === 'enum') {
        const enumDef = this.parseEnum(false, pendingAttrs, pendingDocComments);
        if (enumDef) {
          enums.push(enumDef);
          blockSourceMap.push({
            generatedLine: -1,
            originalLine: this.baseLineOffset + token.line,
            moduleName: this.moduleName,
          });
        }
        pendingAttrs = [];
        pendingDocComments = [];
        continue;
      }

      // Skip everything else (impl blocks, trait defs, mod, const, etc.)
      // For impl blocks, skip the entire block
      if (token.type === 'keyword' && (token.value === 'impl' || token.value === 'trait' || token.value === 'mod')) {
        this.skipToNextItem();
        pendingAttrs = [];
        pendingDocComments = [];
        continue;
      }

      // Unknown token — skip
      this.advance();
      pendingAttrs = [];
      pendingDocComments = [];
    }

    return { functions, structs, enums, imports, blockSourceMap };
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  private advance(): Token | undefined {
    return this.tokens[this.pos++];
  }

  private skipWhitespace(): void {
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (!t || (t.type !== 'whitespace' && t.type !== 'newline')) break;
      this.advance();
    }
  }

  private skipBalanced(open: string, close: string): void {
    let depth = 0;
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (!t) break;
      if (t.type === 'symbol' && t.value === open) depth++;
      if (t.type === 'symbol' && t.value === close) {
        depth--;
        if (depth === 0) {
          this.advance();
          return;
        }
      }
      this.advance();
    }
  }

  /** Skip until we find the next top-level item (fn, struct, enum, use, impl, etc.) */
  private skipToNextItem(): void {
    // Skip to the opening brace and balance it
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (!t) break;
      if (t.type === 'symbol' && t.value === '{') {
        this.skipBalanced('{', '}');
        return;
      }
      if (t.type === 'symbol' && t.value === ';') {
        this.advance();
        return;
      }
      this.advance();
    }
  }

  private parseUseStatement(): string | null {
    // Consume 'use'
    this.advance();
    this.skipWhitespace();

    // Read until ';'
    let path = '';
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (!t) break;
      if (t.type === 'symbol' && t.value === ';') {
        this.advance();
        return path.trim();
      }
      if (t.type !== 'whitespace' && t.type !== 'newline') {
        path += t.value;
      }
      this.advance();
    }
    return path.trim() || null;
  }

  private parseFunction(
    isPub: boolean,
    attributes: string[],
    docComments: string[],
  ): RustFunction | null {
    // Consume 'fn'
    const fnToken = this.advance();
    if (!fnToken) return null;

    this.skipWhitespace();

    // Check for async
    let isAsync = false;
    const next = this.peek();
    if (next?.type === 'keyword' && next.value === 'async') {
      isAsync = true;
      this.advance();
      this.skipWhitespace();
    }

    // Check for unsafe
    const afterAsync = this.peek();
    if (afterAsync?.type === 'keyword' && afterAsync.value === 'unsafe') {
      this.advance();
      this.skipWhitespace();
    }

    // Check for extern
    const afterUnsafe = this.peek();
    if (afterUnsafe?.type === 'keyword' && afterUnsafe.value === 'extern') {
      this.advance();
      this.skipWhitespace();
      // Skip extern string (e.g., extern "C")
      const externStr = this.peek();
      if (externStr?.type === 'string') {
        this.advance();
        this.skipWhitespace();
      }
    }

    // Now expect 'fn'
    const fnKw = this.peek();
    if (fnKw?.type === 'keyword' && fnKw.value === 'fn') {
      this.advance();
      this.skipWhitespace();
    }

    // Function name
    const nameToken = this.peek();
    if (!nameToken || nameToken.type !== 'ident') return null;
    const name = nameToken.value;
    const sourceLine = this.baseLineOffset + nameToken.line;
    this.advance();

    // Skip generics <...>
    this.skipWhitespace();
    const maybeGen = this.peek();
    if (maybeGen?.type === 'symbol' && maybeGen.value === '<') {
      this.skipBalanced('<', '>');
    }

    // Parameters ( ... )
    this.skipWhitespace();
    const parenOpen = this.peek();
    if (!parenOpen || parenOpen.type !== 'symbol' || parenOpen.value !== '(') return null;

    // Extract parameter string by balancing parens
    const paramStart = this.pos;
    this.skipBalanced('(', ')');
    const paramEnd = this.pos;
    const paramTokens = this.tokens.slice(paramStart, paramEnd);
    const paramStr = paramTokens.map((t) => t.value).join('').replace(/^\(/, '').replace(/\)$/, '');
    const params = parseRustParams(paramStr);

    // Return type -> ... or ()
    this.skipWhitespace();
    let returnType = '()';
    const arrow = this.peek();
    if (arrow?.type === 'symbol' && arrow.value === '-' && this.peek(1)?.value === '>') {
      this.advance(); // '-'
      this.advance(); // '>'
      this.skipWhitespace();
      // Read return type until '{' or ';'
      let retType = '';
      while (this.pos < this.tokens.length) {
        const t = this.peek();
        if (!t) break;
        if (t.type === 'symbol' && (t.value === '{' || t.value === ';')) break;
        if (t.type === 'symbol' && t.value === 'where') break;
        if (t.type !== 'whitespace' && t.type !== 'newline') {
          retType += t.value;
        }
        this.advance();
      }
      returnType = retType.trim() || '()';
    }

    // Skip where clause if present
    const whereToken = this.peek();
    if (whereToken?.type === 'keyword' && whereToken.value === 'where') {
      // Skip until '{' or ';'
      while (this.pos < this.tokens.length) {
        const t = this.peek();
        if (!t) break;
        if (t.type === 'symbol' && (t.value === '{' || t.value === ';')) break;
        this.advance();
      }
    }

    // Skip the function body { ... } or semicolon (trait method)
    const bodyOrSemi = this.peek();
    if (bodyOrSemi?.type === 'symbol' && bodyOrSemi.value === '{') {
      this.skipBalanced('{', '}');
    } else if (bodyOrSemi?.type === 'symbol' && bodyOrSemi.value === ';') {
      this.advance();
    }

    const returnTypeName = rustTypeToTs(returnType);
    const docComment = docComments.length > 0 ? docComments.join('\n') : undefined;

    return {
      name,
      isAsync,
      isPub,
      params,
      returnType,
      returnTypeName,
      docComment,
      sourceLine,
      attributes: attributes.length > 0 ? attributes : undefined,
    };
  }

  private parseStruct(
    _isPub: boolean,
    attributes: string[],
    docComments: string[],
  ): RustStruct | null {
    // Consume 'struct'
    const structToken = this.advance();
    if (!structToken) return null;

    this.skipWhitespace();

    // Struct name
    const nameToken = this.peek();
    if (!nameToken || nameToken.type !== 'ident') return null;
    const name = nameToken.value;
    const sourceLine = this.baseLineOffset + nameToken.line;
    this.advance();

    // Skip generics <...>
    this.skipWhitespace();
    const maybeGen = this.peek();
    if (maybeGen?.type === 'symbol' && maybeGen.value === '<') {
      this.skipBalanced('<', '>');
    }

    // Skip where clause
    this.skipWhitespace();
    const whereToken = this.peek();
    if (whereToken?.type === 'keyword' && whereToken.value === 'where') {
      while (this.pos < this.tokens.length) {
        const t = this.peek();
        if (!t) break;
        if (t.type === 'symbol' && (t.value === '{' || t.value === ';')) break;
        this.advance();
      }
    }

    // Struct body { ... }
    this.skipWhitespace();
    const braceOpen = this.peek();
    if (!braceOpen || braceOpen.type !== 'symbol' || braceOpen.value !== '{') {
      // Tuple struct: struct Foo(Type1, Type2); or unit struct: struct Foo;
      const semi = this.peek();
      if (semi?.type === 'symbol' && semi.value === ';') {
        this.advance();
        return {
          name,
          fields: [],
          derives: extractDerives(attributes),
          docComment: docComments.length > 0 ? docComments.join('\n') : undefined,
          sourceLine,
          attributes: attributes.length > 0 ? attributes : undefined,
        };
      }
      // Tuple struct
      if (semi?.type === 'symbol' && semi.value === '(') {
        this.skipBalanced('(', ')');
        // Skip to ';'
        while (this.pos < this.tokens.length) {
          const t = this.peek();
          if (!t) break;
          if (t.type === 'symbol' && t.value === ';') { this.advance(); break; }
          this.advance();
        }
        return {
          name,
          fields: [],
          derives: extractDerives(attributes),
          docComment: docComments.length > 0 ? docComments.join('\n') : undefined,
          sourceLine,
          attributes: attributes.length > 0 ? attributes : undefined,
        };
      }
      return null;
    }

    // Extract body by balancing braces
    const bodyStart = this.pos;
    this.skipBalanced('{', '}');
    const bodyEnd = this.pos;
    const bodyTokens = this.tokens.slice(bodyStart, bodyEnd);
    const bodyStr = bodyTokens.map((t) => t.value).join('').replace(/^{/, '').replace(/}$/, '');
    const fields = parseRustFields(bodyStr);

    return {
      name,
      fields,
      derives: extractDerives(attributes),
      docComment: docComments.length > 0 ? docComments.join('\n') : undefined,
      sourceLine,
      attributes: attributes.length > 0 ? attributes : undefined,
    };
  }

  private parseEnum(
    _isPub: boolean,
    attributes: string[],
    docComments: string[],
  ): RustEnum | null {
    // Consume 'enum'
    const enumToken = this.advance();
    if (!enumToken) return null;

    this.skipWhitespace();

    // Enum name
    const nameToken = this.peek();
    if (!nameToken || nameToken.type !== 'ident') return null;
    const name = nameToken.value;
    const sourceLine = this.baseLineOffset + nameToken.line;
    this.advance();

    // Skip generics
    this.skipWhitespace();
    const maybeGen = this.peek();
    if (maybeGen?.type === 'symbol' && maybeGen.value === '<') {
      this.skipBalanced('<', '>');
    }

    // Skip where clause
    this.skipWhitespace();
    const whereToken = this.peek();
    if (whereToken?.type === 'keyword' && whereToken.value === 'where') {
      while (this.pos < this.tokens.length) {
        const t = this.peek();
        if (!t) break;
        if (t.type === 'symbol' && (t.value === '{' || t.value === ';')) break;
        this.advance();
      }
    }

    // Enum body { ... }
    this.skipWhitespace();
    const braceOpen = this.peek();
    if (!braceOpen || braceOpen.type !== 'symbol' || braceOpen.value !== '{') return null;

    const bodyStart = this.pos;
    this.skipBalanced('{', '}');
    const bodyEnd = this.pos;
    const bodyTokens = this.tokens.slice(bodyStart, bodyEnd);
    const bodyStr = bodyTokens.map((t) => t.value).join('').replace(/^{/, '').replace(/}$/, '');

    const variants = parseEnumVariants(bodyStr);

    return {
      name,
      variants,
      derives: extractDerives(attributes),
      docComment: docComments.length > 0 ? docComments.join('\n') : undefined,
      sourceLine,
      attributes: attributes.length > 0 ? attributes : undefined,
    };
  }
}

/** Extract derive macro names from attribute strings */
function extractDerives(attributes: string[]): string[] {
  return attributes
    .filter((a) => a.includes('derive('))
    .flatMap((a) => {
      const match = a.match(/derive\(([^)]*)\)/);
      return match ? match[1].split(',').map((d) => d.trim()).filter(Boolean) : [];
    });
}

/**
 * Parses Rust enum variants from the body string.
 * Handles unit variants, struct-like variants, and tuple variants.
 */
function parseEnumVariants(body: string): RustEnumVariant[] {
  const variants: RustEnumVariant[] = [];
  // Split on commas at depth 0
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '{' || ch === '(' || ch === '[') depth++;
    if (ch === '}' || ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    // Extract doc comment
    let variantStr = trimmed;
    let docComment: string | undefined;
    const docMatch = variantStr.match(/\/\/\/\s*(.*)/);
    if (docMatch) {
      docComment = docMatch[1].trim();
      variantStr = variantStr.replace(/\/\/\/.*$/, '').trim();
    }

    // Remove trailing comments
    variantStr = variantStr.replace(/\/\/.*$/, '').trim();
    if (!variantStr) continue;

    // Check for struct-like variant: Name { field: Type, ... }
    const structMatch = variantStr.match(/^(\w+)\s*\{([\s\S]*)\}/);
    if (structMatch) {
      variants.push({
        name: structMatch[1],
        fields: parseRustFields(structMatch[2]),
        docComment,
      });
      continue;
    }

    // Check for tuple variant: Name(Type1, Type2)
    const tupleMatch = variantStr.match(/^(\w+)\s*\((.*)\)/);
    if (tupleMatch) {
      variants.push({
        name: tupleMatch[1],
        docComment,
      });
      continue;
    }

    // Check for discriminant: Name = value
    const discMatch = variantStr.match(/^(\w+)\s*=\s*(.+)/);
    if (discMatch) {
      variants.push({
        name: discMatch[1],
        discriminant: discMatch[2].trim(),
        docComment,
      });
      continue;
    }

    // Unit variant: just Name
    const nameMatch = variantStr.match(/^(\w+)/);
    if (nameMatch) {
      variants.push({ name: nameMatch[1], docComment });
    }
  }

  return variants;
}

/**
 * Parses Rust function parameters: "pool: &PgPool, limit: i32"
 */
function parseRustParams(paramsStr: string): RustParam[] {
  if (!paramsStr.trim()) return [];

  const params: RustParam[] = [];
  // Split on commas, but not inside generics like Vec<User>
  let depth = 0;
  let current = '';
  for (const char of paramsStr) {
    if (char === '<' || char === '(' || char === '[') depth++;
    if (char === '>' || char === ')' || char === ']') depth--;
    if (char === ',' && depth === 0) {
      params.push(parseRustParam(current));
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) params.push(parseRustParam(current));

  return params;
}

function parseRustParam(paramStr: string): RustParam {
  const parts = paramStr.trim().split(':');
  if (parts.length < 2) return { name: paramStr.trim(), type: 'unknown', typeName: 'unknown' };
  const name = parts[0].trim();
  const type = parts.slice(1).join(':').trim();
  return { name, type, typeName: rustTypeToTs(type) };
}

/**
 * Parses Rust struct fields: "id: i32, name: String, email: Option<String>"
 */
function parseRustFields(body: string): RustField[] {
  const fields: RustField[] = [];
  const lines = body.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    // Remove doc comments
    const commentMatch = trimmed.match(/\/\/\/\s*(.*)/);
    const docComment = commentMatch?.[1]?.trim();

    // Remove trailing comments
    const cleanLine = trimmed.replace(/\/\/.*$/, '').trim();
    if (!cleanLine || cleanLine === '}') continue;

    const parts = cleanLine.split(':');
    if (parts.length < 2) continue;

    const name = parts[0].trim().replace(/pub\s+/, '');
    const type = parts.slice(1).join(':').trim().replace(/,$/, '').trim();
    const isOption = type.startsWith('Option<');
    const cleanType = isOption ? type.replace(/Option<|>/g, '') : type;

    fields.push({
      name,
      type: cleanType,
      typeName: rustTypeToTs(cleanType),
      isOption,
      docComment,
    });
  }

  return fields;
}

/**
 * Maps Rust types to TypeScript types.
 */
export function rustTypeToTs(rustType: string): string {
  const trimmed = rustType.trim();

  // Remove lifetimes and references
  let type = trimmed.replace(/&/g, '').replace(/'\w+/g, '').trim();

  // Remove mut
  type = type.replace(/\bmut\b/g, '').trim();

  // Option<T> → T | null
  const optionMatch = type.match(/Option<(.+)>/);
  if (optionMatch) {
    return `${rustTypeToTs(optionMatch[1])} | null`;
  }

  // Vec<T> → T[]
  const vecMatch = type.match(/Vec<(.+)>/);
  if (vecMatch) {
    return `${rustTypeToTs(vecMatch[1])}[]`;
  }

  // HashMap<K, V> → Record<K, V>
  const mapMatch = type.match(/HashMap<([^,]+),\s*(.+)>/);
  if (mapMatch) {
    return `Record<${rustTypeToTs(mapMatch[1])}, ${rustTypeToTs(mapMatch[2])}>`;
  }

  // Result<T, E> → T (we unwrap errors in the binding layer)
  const resultMatch = type.match(/Result<([^,]+),\s*[^>]+>/);
  if (resultMatch) {
    return rustTypeToTs(resultMatch[1]);
  }

  // Tuple (A, B) → [A, B]
  const tupleMatch = type.match(/^\(([^)]+)\)$/);
  if (tupleMatch) {
    const elements = tupleMatch[1].split(',').map((e) => rustTypeToTs(e.trim()));
    return `[${elements.join(', ')}]`;
  }

  // Primitives
  const primitiveMap: Record<string, string> = {
    'i8': 'number',
    'i16': 'number',
    'i32': 'number',
    'i64': 'number',
    'i128': 'number',
    'u8': 'number',
    'u16': 'number',
    'u32': 'number',
    'u64': 'number',
    'u128': 'number',
    'isize': 'number',
    'usize': 'number',
    'f32': 'number',
    'f64': 'number',
    'bool': 'boolean',
    'char': 'string',
    'String': 'string',
    '&str': 'string',
    'str': 'string',
    '()': 'void',
  };

  if (primitiveMap[type]) return primitiveMap[type];

  // Custom types (structs/enums) — use the type name as-is
  return type;
}
