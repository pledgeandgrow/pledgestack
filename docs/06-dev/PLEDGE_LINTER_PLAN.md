# Pledge Linter — Rust-Based Unified Linter

## Project: `pledge-linter`

A single Rust binary that lints **JavaScript, TypeScript, CSS, HTML, and Rust** in one pass. Inspired by Biome (multi-language JS/TS/CSS/HTML linter) and Ruff (blazing-fast Python linter). Designed to be fast, extensible, and intuitive.

---

## 1. Goals

- **Single binary, zero runtime deps** — no Node.js, no Python, no JVM. Download and run.
- **Multi-language in one pass** — JS, TS, JSX, TSX, CSS, HTML, Rust, and PSX (mixed Rust+TSX).
- **10-100x faster than ESLint + stylelint + rustfmt --check combined** — target <50ms for 1000 files.
- **Plugin system** — users write custom rules in Rust (and eventually WASM).
- **Multiple output formats** — terminal (human-readable), JSON, SARIF (for CI/IDE integration).
- **Auto-fix capability** — like `eslint --fix` and `rustfmt`, but for all languages.
- **Configurable** — `pledge-linter.config.toml` or inline config comments.

---

## 2. Architecture

```
pledge-linter/
├── Cargo.toml
├── crates/
│   ├── pledge-linter-cli/          # CLI binary entry point
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs             # arg parsing, file discovery, output formatting
│   │       └── args.rs             # CLI flags (--fix, --format json, etc.)
│   │
│   ├── pledge-linter-core/         # Core linting engine
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── engine.rs           # Rule registry, execution pipeline
│   │       ├── config.rs           # Config parsing (TOML)
│   │       ├── fixer.rs            # Auto-fix applicator
│   │       ├── severity.rs         # Error/Warning/Info/Style
│   │       └── rule.rs             # Rule trait definition
│   │
│   ├── pledge-linter-parser/       # Multi-language parser
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── js.rs               # JS/TS parser (use oxc-parser or swc)
│   │       ├── css.rs              # CSS parser (use lightningcss or grass)
│   │       ├── html.rs             # HTML parser (use html5ever or lol_html)
│   │       ├── rust.rs             # Rust parser (use syn or rust-analyzer's parser)
│   │       ├── psx.rs              # PSX parser — extracts <rust> blocks from TSX
│   │       └── source.rs           # SourceFile abstraction (line/column mapping)
│   │
│   ├── pledge-linter-rules-js/     # JavaScript/TypeScript rules
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── no_unused_vars.rs
│   │       ├── no_console.rs
│   │       ├── no_implicit_any.rs
│   │       ├── prefer_const.rs
│   │       ├── eq_eq_eq.rs
│   │       ├── no_unreachable.rs
│   │       └── ... (30+ rules)
│   │
│   ├── pledge-linter-rules-css/    # CSS rules
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── no_unused_selectors.rs
│   │       ├── prefer_shorthand.rs
│   │       ├── no_duplicate_props.rs
│   │       ├── color_format.rs
│   │       └── ... (15+ rules)
│   │
│   ├── pledge-linter-rules-html/   # HTML rules
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── no_mismatched_tags.rs
│   │       ├── require_alt_attr.rs
│   │       ├── no_inline_styles.rs
│   │       └── ... (10+ rules)
│   │
│   ├── pledge-linter-rules-rust/   # Rust rules
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── no_unwrap.rs
│   │       ├── no_expect.rs
│   │       ├── require_result_return.rs
│   │       ├── no_panic_in_async.rs
│   │       ├── no_unused_fns.rs
│   │       └── ... (15+ rules)
│   │
│   ├── pledge-linter-rules-psx/    # Cross-language PSX-specific rules
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── napi_signature_check.rs   # #[napi] fn signatures are JS-compatible
│   │       ├── tsx_rust_bridge.rs        # TSX calls match #[napi] exports
│   │       ├── no_unused_rust_fn.rs      # Rust fn not called from TSX or #[napi]
│   │       ├── dead_code_elimination.rs  # Unreachable Rust items
│   │       └── ... (10+ rules)
│   │
│   └── pledge-linter-plugin/       # Plugin SDK for custom rules
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           └── wasm/               # WASM plugin host (future)
│
├── npm/                            # npm wrapper package (optional)
│   ├── package.json
│   └── index.js                    # spawns the native binary
│
└── tests/
    ├── fixtures/                   # Test files with expected lint results
    │   ├── js/
    │   ├── ts/
    │   ├── css/
    │   ├── html/
    │   ├── rust/
    │   └── psx/
    └── snapshots/                  # Expected output snapshots
```

---

## 3. Core Abstractions

### 3.1 SourceFile

```rust
pub struct SourceFile {
    pub path: PathBuf,
    pub content: String,
    pub language: Language,
    pub lines: Vec<LineInfo>,  // pre-computed line offsets for O(1) line/col lookup
}

pub enum Language {
    JavaScript,
    TypeScript,
    Jsx,
    Tsx,
    Css,
    Html,
    Rust,
    Psx,  // mixed Rust + TSX
    Markdown,
    Json,
}
```

### 3.2 Rule Trait

```rust
pub trait Rule: Send + Sync {
    /// Unique rule name, e.g. "js/no-unused-vars"
    fn name(&self) -> &str;

    /// Short description
    fn description(&self) -> &str;

    /// Default severity
    fn default_severity(&self) -> Severity;

    /// Which languages this rule applies to
    fn languages(&self) -> &[Language];

    /// Run the rule on a source file, returning diagnostics
    fn check(&self, ctx: &RuleContext) -> Vec<Diagnostic>;

    /// Whether this rule supports auto-fix
    fn fix(&self, ctx: &RuleContext) -> Option<Fix> { None }
}
```

### 3.3 Diagnostic

```rust
pub struct Diagnostic {
    pub rule: String,
    pub severity: Severity,
    pub message: String,
    pub span: Span,           // byte offset range
    pub file: PathBuf,
    pub suggestion: Option<String>,
    pub fix: Option<Fix>,
}

pub struct Span {
    pub start: usize,  // byte offset
    pub end: usize,
}

pub struct Fix {
    pub span: Span,
    pub replacement: String,
}
```

### 3.4 RuleContext

```rust
pub struct RuleContext<'a> {
    pub source: &'a SourceFile,
    /// Parsed AST (language-specific)
    pub ast: &'a Ast,
    /// Config for this rule
    pub config: &'a toml::Value,
    /// For PSX: cross-language info (Rust functions, TSX references)
    pub cross_lang: Option<&'a CrossLangContext>,
}
```

---

## 4. Parsing Strategy

### JS/TS/JSX/TSX
- Use **oxc-parser** (already a dependency of PledgeStack via PledgePack). It's the fastest JS/TS parser in Rust.
- Oxc produces a semantic model (scope analysis, symbol resolution) that rules can use for free.
- Fallback: **swc** if oxc lacks a feature.

### CSS
- Use **lightningcss** (Rust CSS parser/transformer by the Parcel team).
- Provides AST with selectors, declarations, at-rules.
- Fallback: **grass** (Sass compiler in Rust) for SCSS.

### HTML
- Use **html5ever** (Servo's HTML parser, used by Firefox).
- Produces a DOM tree that rules can traverse.
- Alternative: **lol_html** (Cloudflare's streaming HTML rewriter) for large files.

### Rust
- Use **syn** (standard Rust parser, used by every proc-macro).
- Full AST with items, expressions, patterns, types.
- For type-level analysis, integrate **rust-analyzer's** `hir` crate (optional, heavier).

### PSX
- Custom parser that:
  1. Splits file into `<rust>` blocks and TSX content
  2. Parses each `<rust>` block with `syn`
  3. Parses the TSX content with `oxc-parser`
  4. Builds a `CrossLangContext` linking NAPI exports to TSX call sites

---

## 5. Rule Execution Pipeline

```
1. File Discovery
   - Walk directory tree
   - Classify files by extension (.js, .ts, .jsx, .tsx, .css, .html, .rs, .psx, .ps)
   - Respect .gitignore + .pledgeignore

2. Parse Phase (parallel, per-file)
   - Parse each file into its AST
   - For PSX: parse both Rust and TSX, build cross-lang context
   - Cache parse results (content-hash → AST)

3. Rule Registration
   - Load built-in rules
   - Load plugin rules (from config)
   - Filter rules by file language and config enable/disable

4. Execution Phase (parallel, per-file × per-rule)
   - Run each applicable rule on each file
   - Collect diagnostics
   - Rules are read-only (no mutation during check phase)

5. Fix Phase (optional, if --fix)
   - Sort diagnostics by position
   - Apply non-overlapping fixes
   - Re-parse and re-lint to verify fixes don't introduce new issues
   - Write fixed content to disk

6. Output Phase
   - Format diagnostics (terminal / JSON / SARIF)
   - Print summary
   - Exit code: 0 = clean, 1 = errors, 2 = warnings only (configurable)
```

---

## 6. Configuration

```toml
# pledge-linter.config.toml

[lint]
# Global settings
fix = false
format = "terminal"  # terminal | json | sarif | github
exit-on-warnings = false
ignore = ["node_modules", "target", ".pledge", "dist"]

# Language-specific rule config
[lint.javascript]
"no-unused-vars" = "error"
"no-console" = "warn"
"prefer-const" = "error"
"eq-eq-eq" = "error"

[lint.typescript]
"no-explicit-any" = "warn"
"no-non-null-assertion" = "warn"

[lint.css]
"prefer-shorthand" = "warn"
"no-duplicate-props" = "error"

[lint.html]
"require-alt-attr" = "error"
"no-inline-styles" = "warn"

[lint.rust]
"no-unwrap" = "warn"
"require-result-return" = "warn"
"no-panic-in-async" = "error"

[lint.psx]
"napi-signature-check" = "error"
"tsx-rust-bridge" = "error"
"no-unused-rust-fn" = "warn"
"dead-code" = "info"

# Plugin rules
[[lint.plugins]]
name = "custom-rules"
path = "./plugins/custom-rules.wasm"
```

Inline config via comments:
```rust
// pledge-linter-disable-next-line no-unused-vars
const x = 1;
```

---

## 7. Initial Rule Set (MVP)

### JavaScript/TypeScript (20 rules)
| Rule | Description | Auto-fix |
|------|-------------|----------|
| `no-unused-vars` | Unused variables | Yes (remove) |
| `no-console` | console.log in production code | No |
| `prefer-const` | let where const suffices | Yes |
| `eq-eq-eq` | Use === instead of == | Yes |
| `no-unreachable` | Code after return/throw | Yes (remove) |
| `no-explicit-any` | `any` type usage | No |
| `no-non-null-assertion` | `foo!` non-null assertion | No |
| `no-empty-function` | Empty function bodies | No |
| `no-var` | Use let/const instead of var | Yes |
| `prefer-template` | Template literals over string concat | Yes |
| `prefer-arrow-callback` | Arrow functions for callbacks | Yes |
| `no-duplicate-imports` | Duplicate import statements | Yes (merge) |
| `no-useless-rename` | `import {a as a}` | Yes |
| `no-trailing-spaces` | Trailing whitespace | Yes |
| `semi` | Enforce semicolons | Yes |
| `indent` | Consistent indentation | Yes |
| `no-multiple-empty-lines` | Max consecutive empty lines | Yes |
| `no-irregular-whitespace` | Non-standard whitespace | Yes |
| `no-debugger` | debugger statements | Yes (remove) |
| `no-fallthrough` | Switch case fallthrough | No |

### CSS (10 rules)
| Rule | Description | Auto-fix |
|------|-------------|----------|
| `no-duplicate-props` | Duplicate properties in same block | Yes (remove) |
| `prefer-shorthand` | Use shorthand properties | Yes |
| `no-unused-selectors` | Selectors not matching any HTML | No |
| `color-format` | Consistent hex/rgb/hsl format | Yes |
| `no-important` | !important usage | No |
| `no-vendor-prefix` | Unnecessary vendor prefixes | Yes |
| `declaration-order` | Consistent property order | Yes |
| `no-empty-rules` | Empty CSS rules | Yes (remove) |
| `length-zero-no-unit` | `0px` → `0` | Yes |
| `max-nesting-depth` | Max SCSS nesting depth | No |

### HTML (8 rules)
| Rule | Description | Auto-fix |
|------|-------------|----------|
| `require-alt-attr` | `<img>` must have alt | No |
| `no-mismatched-tags` | Unclosed/mismatched tags | Yes |
| `no-inline-styles` | style="" attributes | No |
| `require-lang-attr` | `<html lang="">` | No |
| `no-obsolete-elements` | `<center>`, `<font>`, etc. | No |
| `require-viewport-meta` | Mobile viewport meta tag | No |
| `no-duplicate-ids` | Duplicate id attributes | No |
| `require-title` | `<title>` in `<head>` | No |

### Rust (12 rules)
| Rule | Description | Auto-fix |
|------|-------------|----------|
| `no-unwrap` | .unwrap() can panic | No |
| `no-expect` | .expect() can panic | No |
| `require-result-return` | Fallible fn should return Result | No |
| `no-panic-in-async` | Panic risk in async fns | No |
| `no-unused-fns` | Functions never called | No |
| `no-clone-on-ref` | Unnecessary .clone() | No |
| `prefer-borrow` | &T instead of T when possible | No |
| `no-string-format-args` | Inefficient format!() usage | No |
| `require-doc-comments` | Public items need docs | No |
| `no-todo-macro` | todo!() in production | No |
| `no-unimplemented-macro` | unimplemented!() | No |
| `prefer-iter-map` | .iter().map() over for loops | No |

### PSX Cross-Language (8 rules)
| Rule | Description | Auto-fix |
|------|-------------|----------|
| `napi-signature-check` | #[napi] fn has JS-compatible types | No |
| `tsx-rust-bridge` | TSX rust.* calls match #[napi] exports | No |
| `no-unused-rust-fn` | Rust fn not exported or called | No |
| `dead-code` | Unreachable Rust items | No |
| `no-mismatched-rust-block` | <rust> tag without closing | Yes |
| `require-error-handling` | rust.* calls must handle errors | No |
| `no-blocking-rust-in-render` | Sync rust.* calls in render path | No |
| `consistent-naming` | Rust snake_case ↔ TSX camelCase | No |

---

## 8. Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| 1000 files parse | <30ms | Parallel parsing, oxc for JS/TS |
| 1000 files lint | <50ms | Parallel rule execution, zero-allocation diagnostics |
| Incremental lint (changed files only) | <10ms | Content-hash cache, only re-lint changed files |
| Memory per file | <100KB | Arena allocation, reuse AST buffers |
| Binary size | <5MB | Strip debug info, LTO, minimal deps |

### Parallelism
- File parsing: Rayon work-stealing thread pool, one file per thread
- Rule execution: Per-file rules run in parallel, no shared mutable state
- Fix application: Sequential (file-level) to avoid conflicts

### Caching
- Content hash → parsed AST (in-memory LRU cache, 256MB max)
- File path → last lint result (on-disk cache in `.pledge-linter-cache/`)
- Only re-lint files whose content hash changed

---

## 9. CLI Interface

```bash
# Lint all files in current directory
pledge-linter

# Lint specific files/directories
pledge-linter src/ app/ --ext .ts,.tsx,.psx

# Auto-fix
pledge-linter --fix

# Output as JSON (for IDE integration)
pledge-linter --format json

# Output as SARIF (for GitHub Code Scanning)
pledge-linter --format sarif > results.sarif

# Only run specific rules
pledge-linter --rules js/no-unused-vars,psx/napi-signature-check

# Ignore specific rules
pledge-linter --ignore-rules css/prefer-shorthand

# Watch mode (re-lint on file change)
pledge-linter --watch

# Print config
pledge-linter --print-config

# Migrate from ESLint config
pledge-linter --migrate-eslint .eslintrc.json

# Show rule documentation
pledge-linter --explain js/no-unused-vars
```

---

## 10. NPM Distribution (optional)

```json
{
  "name": "@pledgestack/linter",
  "version": "0.1.0",
  "bin": {
    "pledge-linter": "bin/pledge-linter"
  },
  "optionalDependencies": {
    "@pledgestack/linter-darwin-arm64": "0.1.0",
    "@pledgestack/linter-darwin-x64": "0.1.0",
    "@pledgestack/linter-linux-x64-gnu": "0.1.0",
    "@pledgestack/linter-win32-x64-msvc": "0.1.0"
  }
}
```

Same pattern as `@napi-rs/napi` and `esbuild` — platform-specific optional deps with the native binary, wrapper package picks the right one.

---

## 11. Implementation Phases

### Phase 1 — Foundation (Week 1-2)
- [ ] Scaffold crate structure
- [ ] Implement `SourceFile`, `Diagnostic`, `Rule` trait
- [ ] Implement CLI arg parsing (use `clap`)
- [ ] Implement file discovery (use `ignore` crate for .gitignore)
- [ ] Implement terminal output formatter
- [ ] Wire up oxc-parser for JS/TS
- [ ] Implement first 5 JS rules: `no-unused-vars`, `prefer-const`, `eq-eq-eq`, `no-console`, `no-debugger`
- [ ] Integration tests with snapshot testing (use `insta` crate)

### Phase 2 — Multi-Language (Week 3-4)
- [ ] Integrate `lightningcss` for CSS parsing
- [ ] Implement first 5 CSS rules
- [ ] Integrate `html5ever` for HTML parsing
- [ ] Implement first 5 HTML rules
- [ ] Integrate `syn` for Rust parsing
- [ ] Implement first 5 Rust rules
- [ ] JSON and SARIF output formatters
- [ ] Config file parsing (TOML)

### Phase 3 — PSX Cross-Language (Week 5-6)
- [ ] PSX parser: extract `<rust>` blocks from TSX
- [ ] Build `CrossLangContext` linking NAPI exports to TSX calls
- [ ] Implement all 8 PSX-specific rules
- [ ] Dead code analysis (usage graph BFS)
- [ ] Integration with PledgeStack CLI (`pledge lint` delegates to `pledge-linter`)

### Phase 4 — Auto-Fix (Week 7-8)
- [ ] Implement `Fix` application pipeline
- [ ] Non-overlapping fix sorting
- [ ] Re-parse after fix to verify no new issues
- [ ] Implement auto-fix for top 10 fixable rules
- [ ] `--fix` CLI flag

### Phase 5 — Performance & Polish (Week 9-10)
- [ ] Parallel parsing with Rayon
- [ ] Content-hash AST cache
- [ ] On-disk incremental cache
- [ ] `--watch` mode (use `notify` crate for file watching)
- [ ] Benchmark against ESLint (target 50x faster)
- [ ] NPM wrapper package with platform-specific binaries
- [ ] Documentation site (rule reference, config guide, migration guide)

### Phase 6 — Plugin System (Future)
- [ ] Rust plugin SDK (compile-time macros to define rules)
- [ ] WASM plugin host (use `wasmtime` or `wasmer`)
- [ ] `--migrate-eslint` config converter
- [ ] Rule suppression comments (`// pledge-linter-disable`)
- [ ] IDE integration (LSP server mode)

---

## 12. Key Dependencies

| Crate | Purpose | Version |
|-------|---------|---------|
| `oxc` | JS/TS/JSX/TSX parser + semantic model | latest |
| `syn` | Rust parser | 2.x |
| `lightningcss` | CSS parser + transformer | 1.x |
| `html5ever` | HTML parser | 0.27 |
| `clap` | CLI arg parsing | 4.x |
| `rayon` | Parallel execution | 1.x |
| `ignore` | .gitignore-aware file walking | 0.4 |
| `serde` + `serde_json` | JSON output | 1.x |
| `toml` | Config parsing | 0.8 |
| `insta` | Snapshot testing | 1.x |
| `notify` | File watching (watch mode) | 6.x |
| `ariadne` | Beautiful diagnostic output (like rustc) | 0.4 |

---

## 13. Testing Strategy

- **Unit tests**: Each rule has test cases for pass, fail, and fix scenarios
- **Snapshot tests**: Use `insta` to lock expected diagnostic output
- **Fixture tests**: Real-world files in `tests/fixtures/` with expected results in `tests/snapshots/`
- **Benchmark tests**: Use `criterion` to track performance regressions
- **Fuzz testing**: Use `cargo-fuzz` on the parser to catch panics on malformed input

---

## 14. Unique Selling Points

1. **Only linter that understands PSX** — mixed Rust+TSX files with cross-language rules
2. **Single binary for 5 languages** — no ESLint + stylelint + rustfmt + html-validate
3. **Cross-language rules** — "TSX calls `rust.foo()` but no `#[napi] fn foo` exists"
4. **50x faster than ESLint** — Rust + parallel + cached
5. **Auto-fix for all languages** — not just JS, also CSS and HTML
6. **SARIF output** — integrates with GitHub Code Scanning out of the box
7. **Plugin system** — extend with custom rules in Rust or WASM
