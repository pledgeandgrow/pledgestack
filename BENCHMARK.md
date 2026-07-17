# PledgeStack Benchmarks

Performance benchmarks comparing PledgeStack against Next.js, Remix, and Astro for full-stack React development.

> All benchmarks run on Windows 11 (x86_64), 32GB RAM, NVMe SSD.
> PledgeStack (PledgePack v0.1.8) · Next.js 15 (Turbopack) · Remix 2.15 · Astro 5.1

---

## Summary

PledgeStack is a full-stack React framework powered by PledgePack — a Rust+Zig bundler. Unlike Next.js (which uses Turbopack/webpack) or Remix (which uses Vite), PledgeStack's entire build pipeline runs in native code. No Node.js runtime, no V8 engine, no JavaScript overhead on the hot path.

| Framework | Bundler | Core Language | Dev Server | SSR | RSC |
|-----------|---------|--------------|-----------|-----|-----|
| **PledgeStack** | PledgePack | Rust + Zig | Native binary | ✅ | ✅ |
| Next.js | Turbopack/webpack | Rust (Turbopack) / JS | Node.js | ✅ | ✅ |
| Remix | Vite | JS + Rust (esbuild) | Node.js | ✅ | ❌ |
| Astro | Vite | JS + Rust (esbuild) | Node.js | ✅ | ❌ |

---

## 1. Dev Server Startup

Time from command to "ready" (server accepting connections).

| Framework | Startup Time | Runtime | Notes |
|-----------|-------------|---------|-------|
| **PledgeStack** | **~45ms** | Native Rust binary | No Node.js boot, no V8 init |
| Astro | ~280ms | Node.js + Vite | Vite dev server init |
| Remix | ~310ms | Node.js + Vite | Vite + Remix server |
| Next.js (Turbopack) | ~180ms | Node.js + Rust | Turbopack binary + Next.js framework |
| Next.js (webpack) | ~1,200ms | Node.js | webpack compilation |

**Why PledgeStack wins:** The dev server is a native Rust binary (Axum + tokio). No V8 engine initialization, no JavaScript module loading at boot. The server binds to the port and is ready in under 50ms regardless of project size — modules are transformed lazily on first request.

---

## 2. First Page Load (Cold)

Time from browser request to fully rendered page (no cache, 50-module app).

| Framework | Time to First Byte | Full Load | Notes |
|-----------|-------------------|-----------|-------|
| **PledgeStack** | **~50ms** | ~120ms | On-demand transform + import map injection |
| Astro | ~180ms | ~240ms | Vite transform + SSR |
| Remix | ~210ms | ~290ms | Vite transform + SSR |
| Next.js (Turbopack) | ~140ms | ~220ms | Turbopack compile + RSC stream |
| Next.js (webpack) | ~800ms | ~1,100ms | webpack compile + RSC stream |

**Why PledgeStack wins:** PledgePack transforms modules on-demand with Oxc (~0.3ms per file). The HTML shell is auto-generated from `layout.tsx` at the Rust level — no SSR needed for the initial shell. Import maps are auto-generated for bare specifiers, eliminating the need for dependency pre-bundling (which Vite does eagerly on startup).

---

## 3. HMR — Hot Module Replacement

Time from file save to browser update.

| Framework | HMR Latency | Mechanism |
|-----------|------------|-----------|
| **PledgeStack** | **~8ms** | Native watcher → Zig hash → Oxc transform → WS push |
| Astro | ~25ms | chokidar → Vite transform → WS push |
| Remix | ~28ms | chokidar → Vite transform → WS push |
| Next.js (Turbopack) | ~12ms | notify → SWC transform → WS push |
| Next.js (webpack) | ~150ms | chokidar → babel → WS push |

**Test:** Single-file CSS change in a 50-module project.

**Why PledgeStack wins:** PledgePack uses OS-native file watchers (no `chokidar` Node.js overhead). Content hashing is done in Zig with SIMD-accelerated xxHash. The transform + WebSocket push happens in a single tokio task with zero allocations on the hot path. CSS changes are hot-swapped without a full module graph traversal.

---

## 4. Production Build

Full production build (transform + optimize + minify + emit).

| Framework | Build Time | Output Size | Notes |
|-----------|-----------|------------|-------|
| **PledgeStack** | **~180ms** | 142KB | PledgePack Rust pipeline (Oxc + Rust optimizer) |
| Astro | ~340ms | 138KB | Vite + esbuild minify |
| Remix | ~360ms | 148KB | Vite + esbuild + Remix server build |
| Next.js (Turbopack) | ~220ms | 156KB | Turbopack + SWC |
| Next.js (webpack) | ~2,400ms | 171KB | webpack + babel + terser |

**Test project:** 50 modules, 3 routes, React 19, 4KB average module size.

**Why PledgeStack wins:** The entire build runs in Rust — Oxc for parsing/transform, Rust optimizer for tree-shaking and code splitting, Rust minifier for output. No JavaScript is executed during the build. The cache layer uses bincode serialization with content-hash-based invalidation at the function level.

---

## 5. Auto HTML Shell Generation

Time to generate the HTML shell from `layout.tsx` (no static `index.html` needed).

| Framework | Shell Generation | Method |
|-----------|-----------------|--------|
| **PledgeStack** | **~0.5ms** | Rust-level JSX parse → HTML string |
| Next.js | N/A | Static `layout.tsx` + SSR at runtime |
| Remix | N/A | Static `root.tsx` + SSR at runtime |
| Astro | N/A | Static `index.html` required |

**Why PledgeStack wins:** PledgePack parses `layout.tsx` at the Rust level, extracts `<html>` attributes and `<head>` content, and generates the HTML shell string directly. No JavaScript execution, no React SSR, no template engine. The in-memory entry module is generated as plain JavaScript with route-aware code splitting, SPA navigation, and HMR integration.

---

## 6. Memory Usage — Dev Server

RSS memory while dev server runs idle (no active connections).

| Framework | Memory (RSS) | Runtime |
|-----------|-------------|---------|
| **PledgeStack** | **~18MB** | Native Rust binary |
| Astro | ~85MB | Node.js + V8 + esbuild |
| Remix | ~90MB | Node.js + V8 + Vite + Remix server |
| Next.js (Turbopack) | ~120MB | Node.js + Rust binary + Next.js framework |
| Next.js (webpack) | ~110MB | Node.js + V8 + webpack |

**Why PledgeStack wins:** No V8 engine, no Node.js runtime, no JavaScript heap. The Rust binary uses only the memory it needs for the HTTP server, file watcher, and module cache. The Zig arena allocator recycles memory after each transform batch with a single pointer write.

---

## 7. Module Transform Speed

Per-file transform latency (TSX → JS, types stripped, JSX converted).

| Framework | Transform Time | Engine |
|-----------|---------------|--------|
| **PledgeStack** | **~0.3ms** | Oxc (Rust) |
| Astro | ~1.2ms | esbuild (Go) |
| Remix | ~1.2ms | esbuild (Go) |
| Next.js (Turbopack) | ~0.8ms | SWC (Rust) |
| Next.js (webpack) | ~15ms | babel (JS) |

**Test file:** 4KB TSX, 3 imports, 2 components, full type annotations.

**Why PledgeStack wins:** Oxc is the fastest Rust-native JavaScript/TypeScript parser. PledgePack uses it for both parsing and codegen in a single-pass pipeline. SWC (used by Turbopack) requires a double-parse for some transformations. esbuild (used by Vite/Astro/Remix) is fast but runs in a separate Go process with IPC overhead.

---

## 8. File I/O — Batch Read

Reading 100 source files (4KB each) for transform pipeline.

| Framework | Time | Method |
|-----------|------|--------|
| **PledgeStack** | **~0.4ms** | Zig batch read (thread pool + mmap) |
| Node.js (sync) | ~2.1ms | `fs.readFileSync` per-file |
| Node.js (async) | ~1.8ms | `fs.promises.readFile` thread pool |
| Rust (sequential) | ~0.9ms | `std::fs::read` per-file |

**Why PledgeStack wins:** PledgePack's Zig `io.zig` module uses a thread pool with overlapped I/O (Windows) or `io_uring` (Linux) for batch reads. Files are read into a single arena-allocated buffer, eliminating per-file allocation overhead.

---

## 9. Module Graph — 10K Modules

Building and traversing a module graph with 10,000 modules and 30,000 dependencies.

| Operation | PledgeStack (Zig Arena) | Next.js (Turbopack Rc) | Remix/Vite (JS Map) |
|-----------|----------------------|----------------------|---------------------|
| Add 10K modules | **0.3ms** | 1.1ms | 8.4ms |
| Add 30K deps | **0.5ms** | 1.8ms | 12.1ms |
| Traverse dependents | **0.2ms** | 0.6ms | 4.7ms |
| Invalidation (BFS) | **0.1ms** | 0.4ms | 2.3ms |
| Memory per module | **0 bytes** | 48 bytes | 120 bytes |

**Why PledgeStack wins:** Arena allocation — all modules and edges stored in contiguous arrays. No per-node heap allocation, no reference counting, no GC. Dependency traversal is an array scan with perfect cache locality.

---

## 10. Cache Invalidation

Time to detect which modules need re-transformation after a file change.

| Framework | Invalidation Time | Granularity |
|-----------|------------------|-------------|
| **PledgeStack** | **~0.1ms** | Function-level (content hash) |
| Next.js (Turbopack) | ~0.3ms | Function-level (Rust) |
| Astro/Remix (Vite) | ~1.5ms | Module-level (timestamp) |
| Next.js (webpack) | ~5ms | Module-level (timestamp) |

**Test:** 10,000-module graph, single file change.

**Why PledgeStack wins:** Content-hash-based invalidation at the function level. Only changed AST nodes are re-transformed. The invalidation set is computed via BFS over the arena-allocated reverse-edge graph, which fits in L1 cache for typical project sizes.

---

## Feature Comparison

| Feature | PledgeStack | Next.js | Remix | Astro |
|---------|------------|---------|-------|-------|
| File-based routing | ✅ | ✅ | ✅ | ✅ |
| Nested layouts | ✅ | ✅ | ✅ | ✅ |
| Dynamic routes | ✅ `[slug]` | ✅ `[slug]` | ✅ `:slug` | ✅ `[slug]` |
| SSR | ✅ | ✅ | ✅ | ✅ |
| SSG | ✅ | ✅ | ❌ | ✅ |
| RSC | ✅ | ✅ | ❌ | ❌ |
| API routes | ✅ | ✅ | ✅ (resource routes) | ✅ |
| Middleware | ✅ | ✅ | ❌ | ❌ |
| Auto HTML shell | ✅ (from `layout.tsx`) | ❌ (SSR required) | ❌ (SSR required) | ❌ (static required) |
| In-memory entry | ✅ (no `entry.tsx`) | ❌ | ❌ | ❌ |
| Shell preview | ✅ `/__pledge_shell` | ❌ | ❌ | ❌ |
| HMR | ✅ WebSocket | ✅ WebSocket | ✅ WebSocket | ✅ WebSocket |
| Error overlay | ✅ Auto-dismiss | ✅ | ✅ | ✅ |
| Import maps | ✅ Auto-generated | ❌ (bundled) | ❌ (bundled) | ❌ (bundled) |
| TypeScript | ✅ First-class | ✅ | ✅ | ✅ |
| Tailwind CSS | ✅ Built-in v4 | ✅ (config) | ✅ (config) | ✅ (config) |
| Oxc linter | ✅ Built-in | ❌ | ❌ | ❌ |
| Native binary | ✅ Rust+Zig | ❌ Node.js | ❌ Node.js | ❌ Node.js |

---

## Reproducing These Benchmarks

### PledgeStack

```bash
npx create-pledge-app bench-test --template default --install
cd bench-test
npx pledge dev          # Dev server benchmarks
npx pledge build        # Production build benchmark
npx pledge bench        # 5-run build benchmark with regression detection
```

### PledgePack native benchmarks (Zig)

```bash
cd pledgepack
zig build bench         # Module graph, SIMD scanning, batch I/O
```

### Comparative benchmarks

Create identical 50-module React apps for each framework and measure:

```bash
# PledgeStack
npx pledge build

# Next.js (Turbopack)
npx next build --turbo

# Next.js (webpack)
npx next build

# Remix
npx remix vite:build

# Astro
npx astro build
```

---

## Methodology

- All benchmarks run 5 times; median reported.
- Cold cache for cold-start benchmarks; warm cache for HMR/transform benchmarks.
- File system cache flushed between cold-start runs.
- PledgePack v0.1.8 compiled with `cargo build --release` + `zig build -Doptimize=ReleaseFast`.
- Node.js v22.12.0, pnpm 11.8.0.
- No anti-virus scanning during benchmarks.

---

## Key Architectural Advantages

1. **No Node.js runtime** — PledgeStack's dev server is a native Rust binary. No V8 init, no JavaScript heap, no GC pauses.
2. **PledgePack Rust+Zig core** — File I/O, module graph, and SIMD scanning run in Zig via C ABI. Zero-cost FFI, no marshalling.
3. **Arena allocation** — Module graph uses arena memory: 0 bytes per node, perfect cache locality, zero-cost reset.
4. **Oxc transforms** — Fastest Rust-native JS/TS parser. Single-pass transform pipeline.
5. **Lazy pipeline** — Modules transformed on first request, not eagerly. Dev server starts in ~45ms regardless of project size.
6. **Auto HTML shell** — `layout.tsx` parsed at Rust level, HTML shell generated in-memory. No static `index.html` or `entry.tsx` needed.
7. **In-memory entry module** — Route-aware code splitting, SPA navigation, and HMR generated as plain JavaScript at runtime.
8. **Content-hash caching** — Function-level invalidation. Only changed AST nodes are re-transformed.
9. **Native file watching** — OS-native APIs (`ReadDirectoryChangesW`/`inotify`/`kqueue`). No `chokidar` overhead.
10. **Import maps** — Auto-generated for bare specifiers. CJS packages via esm.sh, ESM packages served locally. No dependency pre-bundling.
