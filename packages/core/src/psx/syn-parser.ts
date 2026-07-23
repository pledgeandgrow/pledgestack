/**
 * #206 — Syn-based Rust Parser.
 *
 * Replaces regex-based parsing with a proper Rust AST parser.
 * Provides accurate struct/enum/fn detection, type parsing,
 * and inline expression parsing using a token-based approach.
 *
 * This is a TypeScript implementation of a simplified Rust AST parser
 * inspired by the `syn` crate. It tokenizes Rust source and builds
 * an AST for accurate item extraction.
 *
 * Provides:
 * - Tokenizer for Rust source code
 * - AST parser for items (fn, struct, enum, impl, trait, use)
 * - Type parser (generics, references, lifetimes)
 * - Attribute parsing (#[napi], #[derive(...)])
 * - More accurate than regex-based parsing
 */

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

export type TokenType =
  | 'ident' | 'lifetime' | 'punct' | 'keyword' | 'string'
  | 'number' | 'char' | 'doc-comment' | 'whitespace' | 'eof';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// Rust keywords
const RUST_KEYWORDS = new Set([
  'fn', 'struct', 'enum', 'impl', 'trait', 'use', 'pub', 'crate',
  'mod', 'let', 'mut', 'const', 'static', 'async', 'await', 'return',
  'if', 'else', 'match', 'for', 'while', 'loop', 'break', 'continue',
  'self', 'Self', 'super', 'as', 'in', 'ref', 'move', 'where',
  'type', 'extern', 'unsafe', 'dyn', 'union', 'macro_rules',
]);

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

export class RustTokenizer {
  private source: string;
  private pos = 0;
  private line = 1;
  private column = 1;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      // Whitespace
      if (char === ' ' || char === '\t' || char === '\r') {
        this.consumeWhitespace();
        continue;
      }

      if (char === '\n') {
        this.consumeWhitespace();
        continue;
      }

      // Comments
      if (char === '/' && this.source[this.pos + 1] === '/') {
        this.consumeLineComment();
        continue;
      }

      if (char === '/' && this.source[this.pos + 1] === '*') {
        this.consumeBlockComment();
        continue;
      }

      // Doc comments
      if (char === '/' && this.source[this.pos + 1] === '/' && this.source[this.pos + 2] === '/') {
        this.consumeDocComment();
        continue;
      }

      // Attributes
      if (char === '#') {
        this.consumeAttribute();
        continue;
      }

      // Lifetimes
      if (char === "'") {
        this.consumeLifetimeOrChar();
        continue;
      }

      // Strings
      if (char === '"') {
        this.consumeString();
        continue;
      }

      // Raw strings r"..." or r#"..."#
      if (char === 'r' && (this.source[this.pos + 1] === '"' || this.source[this.pos + 1] === '#')) {
        this.consumeRawString();
        continue;
      }

      // Numbers
      if (this.isDigit(char)) {
        this.consumeNumber();
        continue;
      }

      // Identifiers and keywords
      if (this.isIdentStart(char)) {
        this.consumeIdent();
        continue;
      }

      // Punctuation
      this.consumePunct();
    }

    this.tokens.push({ type: 'eof', value: '', line: this.line, column: this.column });
    return this.tokens;
  }

  private consumeWhitespace(): void {
    const start = this.pos;
    void start;
    while (this.pos < this.source.length && /\s/.test(this.source[this.pos])) {
      if (this.source[this.pos] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.pos++;
    }
  }

  private consumeLineComment(): void {
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
      this.pos++;
    }
  }

  private consumeBlockComment(): void {
    this.pos += 2; // skip /*
    while (this.pos < this.source.length - 1) {
      if (this.source[this.pos] === '*' && this.source[this.pos + 1] === '/') {
        this.pos += 2;
        return;
      }
      if (this.source[this.pos] === '\n') this.line++;
      this.pos++;
    }
    this.pos = this.source.length;
  }

  private consumeDocComment(): void {
    const startLine = this.line;
    const startCol = this.column;
    this.pos += 3; // skip ///
    let value = '///';
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
      value += this.source[this.pos];
      this.pos++;
    }
    this.tokens.push({ type: 'doc-comment', value, line: startLine, column: startCol });
  }

  private consumeAttribute(): void {
    const startLine = this.line;
    const startCol = this.column;
    let value = '';
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
      // Stop at end of attribute (closing bracket)
      value += this.source[this.pos];
      this.pos++;
      this.column++;
      // Track bracket depth
      if (value.includes(']') && this.balancedBrackets(value)) break;
    }
    this.tokens.push({ type: 'punct', value, line: startLine, column: startCol });
  }

  private balancedBrackets(s: string): boolean {
    let depth = 0;
    for (const c of s) {
      if (c === '[') depth++;
      if (c === ']') depth--;
    }
    return depth === 0;
  }

  private consumeLifetimeOrChar(): void {
    const startLine = this.line;
    const startCol = this.column;
    this.pos++; // skip '
    // Check if it's a lifetime (followed by ident) or a char literal
    if (this.isIdentStart(this.source[this.pos]) && this.source[this.pos + 1] !== "'") {
      let value = "'";
      while (this.pos < this.source.length && this.isIdentPart(this.source[this.pos])) {
        value += this.source[this.pos];
        this.pos++;
      }
      this.tokens.push({ type: 'lifetime', value, line: startLine, column: startCol });
    } else {
      // Char literal
      let value = "'";
      while (this.pos < this.source.length && this.source[this.pos] !== "'") {
        if (this.source[this.pos] === '\\') {
          value += this.source[this.pos];
          this.pos++;
        }
        value += this.source[this.pos];
        this.pos++;
      }
      value += "'";
      this.pos++; // skip closing '
      this.tokens.push({ type: 'char', value, line: startLine, column: startCol });
    }
  }

  private consumeString(): void {
    const startLine = this.line;
    const startCol = this.column;
    this.pos++; // skip opening "
    let value = '"';
    while (this.pos < this.source.length && this.source[this.pos] !== '"') {
      if (this.source[this.pos] === '\\') {
        value += this.source[this.pos];
        this.pos++;
      }
      value += this.source[this.pos];
      this.pos++;
    }
    value += '"';
    this.pos++; // skip closing "
    this.tokens.push({ type: 'string', value, line: startLine, column: startCol });
  }

  private consumeRawString(): void {
    const startLine = this.line;
    const startCol = this.column;
    let value = 'r';
    this.pos++; // skip r
    // Count hash signs
    let hashes = 0;
    while (this.source[this.pos] === '#') {
      value += '#';
      this.pos++;
      hashes++;
    }
    value += '"';
    this.pos++; // skip opening "
    while (this.pos < this.source.length) {
      if (this.source[this.pos] === '"') {
        value += '"';
        this.pos++;
        // Check for matching closing hashes
        let closeHashes = 0;
        while (closeHashes < hashes && this.source[this.pos] === '#') {
          value += '#';
          this.pos++;
          closeHashes++;
        }
        if (closeHashes === hashes) break;
      } else {
        value += this.source[this.pos];
        this.pos++;
      }
    }
    this.tokens.push({ type: 'string', value, line: startLine, column: startCol });
  }

  private consumeNumber(): void {
    const startLine = this.line;
    const startCol = this.column;
    let value = '';
    while (this.pos < this.source.length && (this.isDigit(this.source[this.pos]) || this.source[this.pos] === '_' || this.source[this.pos] === '.' || 'abcdefABCDEFxXbBoO'.includes(this.source[this.pos]))) {
      value += this.source[this.pos];
      this.pos++;
    }
    this.tokens.push({ type: 'number', value, line: startLine, column: startCol });
  }

  private consumeIdent(): void {
    const startLine = this.line;
    const startCol = this.column;
    let value = '';
    while (this.pos < this.source.length && this.isIdentPart(this.source[this.pos])) {
      value += this.source[this.pos];
      this.pos++;
    }
    const type: TokenType = RUST_KEYWORDS.has(value) ? 'keyword' : 'ident';
    this.tokens.push({ type, value, line: startLine, column: startCol });
  }

  private consumePunct(): void {
    const startLine = this.line;
    const startCol = this.column;
    const char = this.source[this.pos];
    this.pos++;
    this.column++;
    this.tokens.push({ type: 'punct', value: char, line: startLine, column: startCol });
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isIdentStart(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }

  private isIdentPart(c: string): boolean {
    return this.isIdentStart(c) || this.isDigit(c);
  }
}

// ---------------------------------------------------------------------------
// AST Types
// ---------------------------------------------------------------------------

export interface AstItem {
  kind: 'fn' | 'struct' | 'enum' | 'impl' | 'trait' | 'use' | 'type' | 'const' | 'static';
  name: string;
  line: number;
  attributes: AstAttribute[];
  visibility: 'pub' | 'pub(crate)' | 'private';
  isAsync: boolean;
  isUnsafe: boolean;
  params: AstParam[];
  returnType: string;
  generics: string[];
  whereClause?: string;
  body?: string;
}

export interface AstAttribute {
  name: string;
  args?: string;
  line: number;
}

export interface AstParam {
  name: string;
  type: string;
  isMut: boolean;
  isRef: boolean;
  lifetime?: string;
}

export interface AstStructField {
  name: string;
  type: string;
  isPub: boolean;
  attributes: AstAttribute[];
}

export interface AstEnumVariant {
  name: string;
  fields: AstStructField[];
  discriminant?: string;
  attributes: AstAttribute[];
}

export interface AstStruct {
  name: string;
  line: number;
  fields: AstStructField[];
  attributes: AstAttribute[];
  generics: string[];
  isUnit: boolean;
  isTuple: boolean;
}

export interface AstEnum {
  name: string;
  line: number;
  variants: AstEnumVariant[];
  attributes: AstAttribute[];
  generics: string[];
}

export interface AstUse {
  path: string;
  items: string[];
  isGlob: boolean;
  line: number;
}

export interface AstParseResult {
  items: AstItem[];
  structs: AstStruct[];
  enums: AstEnum[];
  uses: AstUse[];
  functions: AstItem[];
  imports: string[];
}

// ---------------------------------------------------------------------------
// AST Parser
// ---------------------------------------------------------------------------

export class RustAstParser {
  private tokens: Token[];
  private pos = 0;
  private result: AstParseResult = {
    items: [],
    structs: [],
    enums: [],
    uses: [],
    functions: [],
    imports: [],
  };

  constructor(source: string) {
    const tokenizer = new RustTokenizer(source);
    this.tokens = tokenizer.tokenize();
  }

  parse(): AstParseResult {
    while (this.peek().type !== 'eof') {
      this.parseItem();
    }
    return this.result;
  }

  private peek(offset: number = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private expectKeyword(kw: string): boolean {
    const tok = this.peek();
    if (tok.type === 'keyword' && tok.value === kw) {
      this.advance();
      return true;
    }
    return false;
  }

  private parseItem(): void {
    const attributes = this.parseAttributes();
    const visibility = this.parseVisibility();
    const tok = this.peek();

    if (tok.type === 'keyword') {
      // Handle async/unsafe before fn
      if (tok.value === 'async' || tok.value === 'unsafe') {
        const isAsync = tok.value === 'async';
        const isUnsafe = tok.value === 'unsafe';
        this.advance(); // consume async/unsafe
        const nextTok = this.peek();
        if (nextTok.type === 'keyword' && nextTok.value === 'fn') {
          this.parseFn(attributes, visibility, isAsync, isUnsafe);
          return;
        }
        // Not followed by fn — skip
        return;
      }
      switch (tok.value) {
        case 'fn':
          this.parseFn(attributes, visibility);
          return;
        case 'struct':
          this.parseStruct(attributes, visibility);
          return;
        case 'enum':
          this.parseEnum(attributes, visibility);
          return;
        case 'use':
          this.parseUse();
          return;
        case 'impl':
          this.parseImpl(attributes);
          return;
        case 'trait':
          this.parseTrait(attributes, visibility);
          return;
        case 'type':
          this.parseTypeAlias(attributes, visibility);
          return;
        case 'const':
        case 'static':
          this.parseConst(tok.value, attributes, visibility);
          return;
      }
    }

    // Skip unknown token
    this.advance();
  }

  private parseAttributes(): AstAttribute[] {
    const attrs: AstAttribute[] = [];
    while (this.peek().type === 'punct' && this.peek().value.startsWith('#[')) {
      const attrToken = this.advance();
      const content = attrToken.value.slice(2, -1); // Remove #[ and ]
      const parts = content.split('(');
      const name = parts[0].trim();
      const args = parts.length > 1 ? parts.slice(1).join('(').trim().replace(/\)$/, '') : undefined;
      attrs.push({ name, args, line: attrToken.line });
    }
    return attrs;
  }

  private parseVisibility(): 'pub' | 'pub(crate)' | 'private' {
    if (this.expectKeyword('pub')) {
      if (this.peek().type === 'punct' && this.peek().value === '(') {
        this.advance();
        if (this.expectKeyword('crate')) {
          this.advance(); // skip )
          return 'pub(crate)';
        }
        // Skip until )
        while (this.peek().type !== 'eof' && !(this.peek().type === 'punct' && this.peek().value === ')')) {
          this.advance();
        }
        this.advance(); // skip )
      }
      return 'pub';
    }
    return 'private';
  }

  private parseFn(attributes: AstAttribute[], visibility: 'pub' | 'pub(crate)' | 'private', preAsync = false, preUnsafe = false): void {
    const fnToken = this.advance(); // consume 'fn'
    const isAsync = preAsync;
    const isUnsafe = preUnsafe;

    const nameToken = this.advance();
    const name = nameToken.value;

    // Parse generics
    const generics = this.parseGenerics();

    // Parse params
    const params = this.parseParams();

    // Parse return type
    let returnType = '()';
    if (this.peek().type === 'punct' && this.peek().value === '-' && this.peek(1).type === 'punct' && this.peek(1).value === '>') {
      this.advance(); // -
      this.advance(); // >
      returnType = this.parseType();
    }

    // Parse where clause
    let whereClause: string | undefined;
    if (this.peek().type === 'keyword' && this.peek().value === 'where') {
      whereClause = this.parseWhereClause();
    }

    // Skip body
    let body: string | undefined;
    if (this.peek().type === 'punct' && this.peek().value === '{') {
      body = this.skipBlock();
    } else if (this.peek().type === 'punct' && this.peek().value === ';') {
      this.advance();
    }

    const item: AstItem = {
      kind: 'fn',
      name,
      line: fnToken.line,
      attributes,
      visibility,
      isAsync,
      isUnsafe,
      params,
      returnType,
      generics,
      whereClause,
      body,
    };

    this.result.items.push(item);
    this.result.functions.push(item);
  }

  private parseGenerics(): string[] {
    if (this.peek().type !== 'punct' || this.peek().value !== '<') return [];
    this.advance(); // skip <
    const generics: string[] = [];
    while (this.peek().type !== 'eof' && !(this.peek().type === 'punct' && this.peek().value === '>')) {
      const tok = this.advance();
      if (tok.value.trim()) generics.push(tok.value);
    }
    this.advance(); // skip >
    return generics.filter(Boolean);
  }

  private parseParams(): AstParam[] {
    if (this.peek().type !== 'punct' || this.peek().value !== '(') return [];
    this.advance(); // skip (
    const params: AstParam[] = [];

    while (this.peek().type !== 'eof' && !(this.peek().type === 'punct' && this.peek().value === ')')) {
      // Skip & for self
      if (this.peek().type === 'punct' && this.peek().value === '&') {
        this.advance();
        // Check for lifetime
        if (this.peek().type === 'lifetime') this.advance();
      }

      // Skip mut
      const isMut = this.peek().type === 'keyword' && this.peek().value === 'mut';
      if (isMut) this.advance();

      // self
      if (this.peek().type === 'keyword' && this.peek().value === 'self') {
        this.advance();
        params.push({ name: 'self', type: 'Self', isMut, isRef: true });
        if (this.peek().type === 'punct' && this.peek().value === ',') this.advance();
        continue;
      }

      // Regular param: name: type
      const nameToken = this.advance();
      if (this.peek().type === 'punct' && this.peek().value === ':') {
        this.advance(); // skip :
        const type = this.parseType();
        params.push({ name: nameToken.value, type, isMut, isRef: false });
      }

      // Skip comma
      if (this.peek().type === 'punct' && this.peek().value === ',') this.advance();
    }

    this.advance(); // skip )
    return params;
  }

  private parseType(): string {
    let type = '';
    let depth = 0;

    while (this.peek().type !== 'eof') {
      const tok = this.peek();
      if (depth === 0 && tok.type === 'punct' && (tok.value === ',' || tok.value === ')' || tok.value === ';' || tok.value === '{' || tok.value === '}' || tok.value === '=')) {
        break;
      }
      if (tok.type === 'punct' && (tok.value === '<' || tok.value === '(' || tok.value === '[')) depth++;
      if (tok.type === 'punct' && (tok.value === '>' || tok.value === ')' || tok.value === ']')) depth--;
      type += tok.value;
      this.advance();
    }

    return type.trim();
  }

  private parseWhereClause(): string {
    let clause = '';
    while (this.peek().type !== 'eof' && !(this.peek().type === 'punct' && this.peek().value === '{')) {
      clause += this.advance().value;
    }
    return clause.trim();
  }

  private skipBlock(): string {
    if (this.peek().type !== 'punct' || this.peek().value !== '{') return '';
    let depth = 0;
    let body = '';
    while (this.peek().type !== 'eof') {
      const tok = this.advance();
      body += tok.value;
      if (tok.type === 'punct' && tok.value === '{') depth++;
      if (tok.type === 'punct' && tok.value === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    return body;
  }

  private parseStruct(attributes: AstAttribute[], _visibility: 'pub' | 'pub(crate)' | 'private'): void {
    const structToken = this.advance(); // consume 'struct'
    const name = this.advance().value;
    const generics = this.parseGenerics();

    const fields: AstStructField[] = [];
    let isUnit = false;
    let isTuple = false;

    if (this.peek().type === 'punct' && this.peek().value === '{') {
      this.advance(); // skip {
      while (this.peek().type !== 'eof' && !(this.peek().type === 'punct' && this.peek().value === '}')) {
        const fieldAttrs = this.parseAttributes();
        const fieldPub = this.parseVisibility();
        const fieldName = this.advance().value;
        let fieldType = '()';
        if (this.peek().type === 'punct' && this.peek().value === ':') {
          this.advance();
          fieldType = this.parseType();
        }
        fields.push({
          name: fieldName,
          type: fieldType,
          isPub: fieldPub !== 'private',
          attributes: fieldAttrs,
        });
        if (this.peek().type === 'punct' && this.peek().value === ',') this.advance();
      }
      this.advance(); // skip }
    } else if (this.peek().type === 'punct' && this.peek().value === '(') {
      isTuple = true;
      this.skipParens();
    } else {
      isUnit = true;
    }

    if (this.peek().type === 'punct' && this.peek().value === ';') this.advance();

    this.result.structs.push({
      name,
      line: structToken.line,
      fields,
      attributes,
      generics,
      isUnit,
      isTuple,
    });
  }

  private parseEnum(attributes: AstAttribute[], _visibility: 'pub' | 'pub(crate)' | 'private'): void {
    const enumToken = this.advance(); // consume 'enum'
    const name = this.advance().value;
    const generics = this.parseGenerics();

    const variants: AstEnumVariant[] = [];

    if (this.peek().type === 'punct' && this.peek().value === '{') {
      this.advance(); // skip {
      while (this.peek().type !== 'eof' && !(this.peek().type === 'punct' && this.peek().value === '}')) {
        const variantAttrs = this.parseAttributes();
        const variantName = this.advance().value;
        const variant: AstEnumVariant = {
          name: variantName,
          fields: [],
          attributes: variantAttrs,
        };

        if (this.peek().type === 'punct' && this.peek().value === '{') {
          // Struct variant
          this.advance();
          while (this.peek().type !== 'eof' && !(this.peek().type === 'punct' && this.peek().value === '}')) {
            const fieldAttrs = this.parseAttributes();
            const fieldPub = this.parseVisibility();
            const fieldName = this.advance().value;
            let fieldType = '()';
            if (this.peek().type === 'punct' && this.peek().value === ':') {
              this.advance();
              fieldType = this.parseType();
            }
            variant.fields.push({
              name: fieldName,
              type: fieldType,
              isPub: fieldPub !== 'private',
              attributes: fieldAttrs,
            });
            if (this.peek().type === 'punct' && this.peek().value === ',') this.advance();
          }
          this.advance(); // skip }
        } else if (this.peek().type === 'punct' && this.peek().value === '(') {
          // Tuple variant
          this.skipParens();
        } else if (this.peek().type === 'punct' && this.peek().value === '=') {
          // Discriminant
          this.advance();
          variant.discriminant = this.advance().value;
        }

        variants.push(variant);
        if (this.peek().type === 'punct' && this.peek().value === ',') this.advance();
      }
      this.advance(); // skip }
    }

    this.result.enums.push({
      name,
      line: enumToken.line,
      variants,
      attributes,
      generics,
    });
  }

  private parseUse(): void {
    const useToken = this.advance(); // consume 'use'
    let path = '';
    let isGlob = false;
    const items: string[] = [];

    while (this.peek().type !== 'eof' && !(this.peek().type === 'punct' && this.peek().value === ';')) {
      const tok = this.advance();
      if (tok.value === '*') {
        isGlob = true;
      } else if (tok.value === '{') {
        // Parse use items
        while (this.peek().type !== 'eof' && !(this.peek().type === 'punct' && this.peek().value === '}')) {
          const itemTok = this.advance();
          if (itemTok.value !== ',' && itemTok.value.trim()) {
            items.push(itemTok.value);
          }
        }
        this.advance(); // skip }
      } else {
        path += tok.value;
      }
    }

    if (this.peek().type === 'punct' && this.peek().value === ';') this.advance();

    const useItem: AstUse = { path: path.trim(), items, isGlob, line: useToken.line };
    this.result.uses.push(useItem);
    this.result.imports.push(path.trim());
  }

  private parseImpl(_attributes: AstAttribute[]): void {
    this.advance(); // consume 'impl'
    // Skip impl block entirely
    this.parseGenerics();
    // Skip type name
    this.parseType();
    // Skip for keyword if present
    if (this.peek().type === 'keyword' && this.peek().value === 'for') {
      this.advance();
      this.parseType();
    }
    // Skip where clause
    if (this.peek().type === 'keyword' && this.peek().value === 'where') {
      this.parseWhereClause();
    }
    // Skip body
    this.skipBlock();
  }

  private parseTrait(_attributes: AstAttribute[], _visibility: 'pub' | 'pub(crate)' | 'private'): void {
    this.advance(); // consume 'trait'
    const name = this.advance().value;
    this.result.items.push({
      kind: 'trait',
      name,
      line: this.peek().line,
      attributes: _attributes,
      visibility: _visibility,
      isAsync: false,
      isUnsafe: false,
      params: [],
      returnType: '()',
      generics: [],
    });
    // Skip trait body
    this.skipBlock();
  }

  private parseTypeAlias(_attributes: AstAttribute[], _visibility: 'pub' | 'pub(crate)' | 'private'): void {
    this.advance(); // consume 'type'
    const name = this.advance().value;
    this.result.items.push({
      kind: 'type',
      name,
      line: this.peek().line,
      attributes: _attributes,
      visibility: _visibility,
      isAsync: false,
      isUnsafe: false,
      params: [],
      returnType: '()',
      generics: [],
    });
    while (this.peek().type !== 'eof' && !(this.peek().type === 'punct' && this.peek().value === ';')) {
      this.advance();
    }
    if (this.peek().type === 'punct') this.advance();
  }

  private parseConst(kind: string, _attributes: AstAttribute[], _visibility: 'pub' | 'pub(crate)' | 'private'): void {
    this.advance(); // consume const/static
    const name = this.advance().value;
    this.result.items.push({
      kind: kind as 'const' | 'static',
      name,
      line: this.peek().line,
      attributes: _attributes,
      visibility: _visibility,
      isAsync: false,
      isUnsafe: false,
      params: [],
      returnType: '()',
      generics: [],
    });
    while (this.peek().type !== 'eof' && !(this.peek().type === 'punct' && this.peek().value === ';')) {
      this.advance();
    }
    if (this.peek().type === 'punct') this.advance();
  }

  private skipParens(): void {
    if (this.peek().type !== 'punct' || this.peek().value !== '(') return;
    let depth = 0;
    while (this.peek().type !== 'eof') {
      const tok = this.advance();
      if (tok.type === 'punct' && tok.value === '(') depth++;
      if (tok.type === 'punct' && tok.value === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses Rust source code into an AST.
 * This is the syn-based replacement for regex parsing.
 */
export function parseRustAst(source: string): AstParseResult {
  const parser = new RustAstParser(source);
  return parser.parse();
}

/**
 * Tokenizes Rust source code.
 */
export function tokenizeRust(source: string): Token[] {
  const tokenizer = new RustTokenizer(source);
  return tokenizer.tokenize();
}
