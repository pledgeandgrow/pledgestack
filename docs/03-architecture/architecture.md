# PledgeStack Architecture

## Overview

PledgeStack is a full-stack React framework built as a monorepo with pnpm workspaces. It follows Next.js app-directory conventions and uses **PledgePack** — a published Rust+Zig bundler ([npm: pledgepack](https://www.npmjs.com/package/pledgepack)) that handles bundling, compilation, dev server, HMR, and production builds.

## Packages

```
packages/
├── shared/              # Shared types, config schema, constants (private — bundled into CLI)
├── core/                # Framework core — routing, rendering, FS scanner, PSX (private)
├── server/              # Node.js + Edge server runtime, server utilities (private)
├── client/              # Client-side hydration, routing, prefetch (private)
├── auth/                # Authentication & security helpers (private)
├── state/               # State management (private)
├── api/                 # API route utilities (private)
├── a11y/                # Accessibility audit tools (private)
├── overlay/             # Error overlay & DevTools (private)
├── seo/                 # SEO & structured data (private)
├── sitemap/             # Sitemap generation (private)
├── image/               # Image optimization (private)
├── font/                # Font optimization (private)
├── mdx/                 # MDX support (private)
├── og/                  # OpenGraph image generation (private)
├── rss/                 # RSS feed generation (private)
├── ws/                  # WebSocket support (private)
├── adapters/            # Cloudflare, Vercel, Deno, AWS, Netlify adapters (private)
├── privacy/             # GDPR/CCPA compliance, PII redaction, encryption, consent (private)
├── cli/                 # CLI tool — published as `pledgestack` on npm (dev, build, start, create)
├── vscode-extension/    # VS Code extension — highlighting, IntelliSense
└── create-pledge-app/   # Scaffolding CLI for new PledgeStack apps
```

> **PledgePack** is installed from npm (`pledgepack@^0.1.8`), not as a workspace package. It provides the `pledge` CLI command for builds, dev server, and bundling.
>
> Only the `pledgestack` package (CLI) is published to npm. All sub-packages are bundled into it via esbuild and marked as private. The framework itself uses esbuild to bundle the CLI package for npm publish — PledgePack is used to bundle **user apps** (the projects created with `pledge create`).

### shared

- **types.ts** — `PledgeConfig`, `ResolvedRoute`, `RouteMatch`, `PledgeRequest`, `PledgeResponse`, `MiddlewareResult`, `ServerContext`
- **constants.ts** — File conventions (`page.tsx`, `layout.tsx`, etc.), default ports, framework version
- Consumed by all other packages via `pledgestack-shared`

### core

The framework heart — framework-agnostic logic that runs in both Node.js and Rust (via V8 interop).

- **fs/scanner.ts** — Recursively scans the `app/` directory, detects file conventions, returns `ScannedFile[]`
- **fs/resolver.ts** — Groups scanned files by directory, attaches convention files (`loading.tsx`, `error.tsx`, `not-found.tsx`, `head.tsx`) to their parent route, produces `ResolvedRoute[]`
- **router/match.ts** — Converts paths to URL patterns, compiles patterns to regex, matches incoming paths
- **router/router.ts** — Builds route tree, extracts layout chains, exposes `match()` and `getLayouts()`
- **router/types.ts** — Module type interfaces: `PageModule`, `LayoutModule`, `RouteHandlerModule`, `MiddlewareModule`, `LoadingModule`, `ErrorModule`, `NotFoundModule`, `HeadModule`, `HeadMetadata`
- **render/server.ts** — SSR pipeline: wraps pages in error boundaries (`ErrorBoundary` class) and Suspense (loading.tsx), resolves `generateMetadata()`, renders `<head>` tags, produces full HTML
- **render/rsc.ts** — RSC pipeline using `react-server-dom-webpack`: `renderRSCToHTML` renders React tree to HTML with streaming, `hydrateRSC` deserializes RSC payload on client. Includes `RSCPayload`, `ClientReference`, `RSCContext` types
- **render/static.ts** — SSG pipeline: `generateStaticPages` for incremental SSG, `generateStaticExport` for full static export mode (`output: 'export'`), `canStaticExport` route eligibility check
- **render/rust-ssr.ts** — #236: Rust SSR for dynamic pages — pre-renders Suspense boundaries in Rust, streams dynamic holes via RSC protocol, NAPI addon with React fallback
- **render/rust-rsc.ts** — #237: RSC payload generation in Rust — flight serializer using swc for module analysis, client reference extraction, NAPI addon with React Server DOM fallback
- **render/rust-html.ts** — #238: Rust HTML template engine — native layout shell rendering, `<head>` generation, script/link injection, HTML entity escaping, error/404 shells
- **render/rust-html-transformer.ts** — #239: Streaming HTML transformer — chunk-safe `<head>`/`</body>` injection, backpressure handling, RSC bootstrap script insertion
- **render/rust-dom-renderer.ts** — #240: React DOM string renderer in Rust — custom DOM-to-HTML for server-only components, `canRenderInRust` heuristic, `markRustSafe` opt-in, streaming chunks
- **render/hybrid-ssr.ts** — #241: Hybrid SSR orchestration — classifies components as static (Rust) or dynamic (React), renders static parts in Rust, fills dynamic placeholders with React
- **render/rust-rsc-deserializer.ts** — #242: RSC client deserializer in Rust — native flight payload deserialization for edge runtime, streaming deserialization, module reference extraction
- **render/rust-ppr.ts** — #243: PPR via Rust SSR — build-time static shell prerender, dynamic hole extraction, request-time hole filling via streaming RSC
- **render/rust-ssr-profiler.ts** — #244: SSR profiling in Rust — per-component render time, flamegraph generation (speedscope format), slow component detection, `withProfiling` wrapper
- **render/rust-hydration.ts** — #245: Native hydration script generator — full/minimal/progressive modes, hydration point detection, sourcemap generation
- **psx/parser.ts** — Parses `.psx` files: extracts `<rust>...</rust>` blocks, `rust!{...}` inline expressions, and Rust source metadata (functions, structs, enums). Also handles `.ps` files (pure Rust) via `parsePS()`
- **psx/codegen.ts** — Generates TypeScript type definitions from Rust structs, NAPI binding code (napi-rs), Rust source files, and JS wrapper modules
- **psx/transform.ts** — Main PSX entry point: `transformPSX()` orchestrates parse → codegen → artifact assembly. Supports both `.psx` (Rust+TSX) and `.ps` (pure Rust) formats
- **psx/batch.ts** — Batch API: `rust.batch()` for parallel queries with one NAPI boundary crossing, `rust.transactionSql()` for atomic transactions, `rust.prepared()` for cached prepared statements
- **psx/binary-protocol.ts** — PSXB binary format: replaces JSON for Rust↔JS data transfer, 4x faster with field name deduplication and zero-copy Uint8Array transfer
- **psx/rust-ssr.ts** — Build-time SSR analysis: extracts static HTML segments from component trees, compiles to Rust string templates, generates `__ssr_{module}()` native renderers
- **psx/workspace.ts** — Rust workspace manager: root `Cargo.toml` generation, `pledge add/remove/list` support, auto-detection of crates from `use` statements, 30+ supported crates pre-mapped
- **psx/integrations.ts** — #256–270: PSX ecosystem integrations — 15 Rust crate wrappers with NAPI bindings: `SqlxPool` (compile-time SQL), `SeaOrmDatabase` (entity CRUD), `RedisClient` (pooling/pub-sub/cache-aside), `RustAuth` (Argon2/JWT), `ImageProcessor` (resize/crop/convert), `PdfGenerator` (HTML→PDF/invoices), `JobQueue` (apalis background jobs), `CronScheduler` (tokio-cron), `EmailSender` (lettre SMTP), `RustHttpClient` (reqwest), `WebSocketServer` (tokio-tungstenite/rooms), `FileProcessor` (Excel/CSV), `RustTracing` (tracing/OpenTelemetry), `RustCrypto` (AES-GCM/SHA-256/secure random), `MlModel` (candle-core/ort inference). All integrations gracefully fall back to JS implementations when native addons are unavailable.
- **psx/integrations-fallback.ts** — JS fallback implementations for all PSX integrations: `SqlxFallback` (pg/mysql2), `RedisFallback` (ioredis), `AuthFallback` (argon2/bcryptjs/PBKDF2, jsonwebtoken/HMAC-SHA256 JWT), `HttpFallback` (native fetch), `CryptoFallback` (node:crypto AES-GCM, SHA-256/512, randomBytes, UUID), `TracingFallback` (console-based spans/logging), `FileProcessorFallback` (xlsx, CSV parsing/generation), `ImageProcessorFallback` (sharp). Includes `parseCronToInterval` helper for cron fallback scheduling.
- **psx/edge-psx.ts** — #271: Edge PSX support — compile Rust to WASM for edge runtime. `generateWasmCargoConfig()`, `generateWasmBindings()`, `EdgeAdapter` class, `buildWasmModule()`, platform detection for Cloudflare/Vercel/Deno
- **psx/edge-kv.ts** — #272: Edge KV integration — unified KV API for Cloudflare KV, Vercel KV, Deno KV. `createKvAdapter()` factory, `KvAdapter` interface, L1 in-memory cache, batch operations, TTL support, namespace isolation
- **psx/edge-durable-objects.ts** — #273: Edge Durable Objects — Cloudflare DO integration for stateful edge compute. `generateDurableObject()` class generator, `DurableObjectManager` with WebSocket management, presence tracking, distributed locks
- **psx/edge-streaming-ssr.ts** — #274: Edge streaming SSR — stream SSR from edge with RSC, partial prerendering. `EdgeSsrRenderer` with dynamic hole filling, `PprCache` for edge caching, `createOptimizedStream()` for sub-50ms TTFB
- **psx/edge-middleware.ts** — #275: Edge middleware in Rust — WASM middleware for edge runtime. `MiddlewareChain` executor, built-in CORS/rate-limit/auth/geo-redirect middleware, WASM code generation (Rust source, Cargo.toml, JS wrapper)
- **psx/lambda-psx.ts** — #276: Lambda PSX support — AWS Lambda layer for .node addons. `generateLayerStructure()`, `generateSamTemplate()`, ARM64/x86_64 cross-compilation, Snapstart compatibility checks, provisioned concurrency pre-warm
- **psx/edge-cache-invalidation.ts** — #277: Edge cache invalidation — global cache sync across platforms. `CacheInvalidationManager` with tag-based invalidation, multi-platform propagation (Cloudflare Queue, Vercel Edge Config, Deno KV), event tracking
- **psx/edge-geo.ts** — #278: Edge geo-personalization — `geo()` utility for country/region/city from edge headers. `detectPsxLocale()` for locale detection, `geoAbTest()` for geo-based A/B testing, `getLocalizationConfig()` for currency/date/time per locale, RTL support
- **psx/serverless-cold-start.ts** — #279: Serverless cold start optimization — lazy-load .node addons. `ColdStartOptimizer` with L1 cache, pre-warm critical paths, `createLazyAddon()` proxy, metrics tracking, `generateInitScript()`
- **psx/multi-region.ts** — #280: Multi-region deployment — automatic routing and failover. `MultiRegionManager` with latency/weighted/geo/primary routing strategies, health checks, traffic shifting, data residency compliance
- **psx/monitoring-dashboard.ts** — #298: PSX monitoring dashboard — Grafana template generator. `generateGrafanaDashboard()` with 9 panels (request rate, NAPI latency, cargo build, memory, cache), `generateAlertRules()` with 4 alerts, `generatePrometheusMetrics()` endpoint
- **psx/rollback.ts** — #301: PSX rollback support — atomic addon deployment. `RollbackManager` with versioned addon storage, symlink/copy-based switching, health check after rollback, version history with max retention
- **psx/canary.ts** — #302: PSX canary deployment — traffic routing for canary releases. `CanaryManager` with progressive rollout, health metrics (error rate, latency p50/p95), auto-rollback on threshold breach, promote/rollback/terminate lifecycle
- **native/** — Rust NAPI addon workspace with 8 crates: `rust-html` (HTML template engine), `rust-ssr` (SSR with Suspense boundaries), `rust-rsc` (RSC flight serializer), `rust-html-transformer` (streaming HTML transformer), `rust-dom-renderer` (React DOM string renderer), `rust-rsc-deserializer` (RSC payload deserializer), `rust-ssr-profiler` (per-component profiling with flamegraphs), `rust-hydration` (hydration script generator). Each crate has `Cargo.toml` and `src/lib.rs` with `napi-derive` macros. Build script (`build.sh`) compiles all crates and copies `.node` files.

### server

Node.js server runtime — used in dev mode and as fallback production server.

- **handler.ts** — `createRequestHandler()`: orchestrates middleware → route matching → API dispatch → SSR/RSC rendering. Loads all modules including convention files. Returns `{ handler, invalidate }` for HMR.
- **node.ts** — `startNodeServer()`: Node.js HTTP server, static file serving, HMR watcher setup
- **edge.ts** — Edge runtime handler for Cloudflare Workers / Deno Deploy
- **module-loader.ts** — Dynamic ESM module loader with cache-busting for HMR, middleware loading
- **hmr.ts** — File system watcher with debounce, triggers handler invalidation on change
- **server-utils.ts** — Request-scoped utilities: `cookies()`, `headers()`, `searchParams()`, `params()` via `setRequestContext()`
- **fetch-cache.ts** — `cachedFetch()` with `force-cache`/`no-store`/`isr` modes, `revalidateTag()`, `revalidatePath()`, stale-while-revalidate (SWR) background revalidation, persistent SQLite cache
- **cache-invalidation.ts** — Distributed cache invalidation bus: Redis pub/sub, HTTP webhook broadcasting, in-memory bus for dev mode, local invalidation handler for multi-instance sync
- **revalidation-worker.ts** — Background revalidation worker for ISR routes: periodic cache revalidation, expired entry pruning, graceful shutdown
- **transform.ts** — Module transform pipeline: fetches transformed code from PledgePack dev server (Oxc), esbuild fallback, `.psx`/`.ps` file handling (parse → codegen → cargo compile → NAPI wrapper), content-hash caching for Rust addons
- **instrumentation.ts** — `loadInstrumentation()` loads `instrumentation.ts` from app root and calls `register()` export at server startup. `runInstrumentation()` executes registered functions. Used for OpenTelemetry, DB pools, feature flags

### client

Client-side JavaScript for hydration and SPA navigation.

- **hydrate.ts** — `hydrate()` (SSR hydration) and `render()` (client-only fallback) using React 19 `hydrateRoot`
- **router.ts** — `RouterProvider`, `useRouter()`, `Link` component with:
  - Hover-based prefetching (low-priority fetch)
  - Scroll restoration (saves/restores per-route scroll positions)
  - `navigate(to, { scroll, replace })` API
  - `popstate` listener for back/forward
  - Modifier-key awareness (cmd+click opens new tab)
- **data-hooks.ts** — `useFetch` (simple fetch with caching and deduplication), `useSWR` (stale-while-revalidate hook), `useMutation` (mutation with optimistic updates and revalidation), `SWRConfig` context provider for global config
- **revalidation-api.ts** — Client-side mutation and revalidation: `revalidateTag()`, `revalidatePath()`, `mutate()` with automatic cache invalidation, `prefetch()` utility, combined batch revalidation

### cli

Command-line interface — the only published package (`pledgestack` on npm). CLI command is `pledge`.

- **bin.ts** — Entry point, parses `dev`/`build`/`start`/`create`/`info`/`doctor`/`add`/`remove`/`list` commands
- **config-loader.ts** — Loads `pledge.config.ts`/`.js`/`.mjs` with defaults
- **commands/dev.ts** — Starts dev server with HMR + Tailwind processing
- **commands/build.ts** — Scans routes, generates static pages, processes Tailwind, copies public assets
- **commands/start.ts** — Starts production server via PledgePack's Rust server (`pledge serve`), falls back to Node.js server if binary not found
- **commands/add.ts** — `pledge add <crate...>` — adds Rust crates to root `Cargo.toml` workspace manifest (like `npm install` for Rust)
- **commands/info.ts** — Print environment diagnostics
- **commands/doctor.ts** — Diagnose and fix common project issues
- **commands/env-check.ts** — Validate environment variables against schema
- **scripts/build.mjs** — esbuild bundler that bundles all sub-packages into `dist/` via source aliases (used to build the framework itself, not user apps)

### pledgepack (npm)

Published Rust+Zig binary — the differentiator. Installed from npm as `pledgepack`, CLI command is `pledge`:

- `pledge build` — Bundles client + server code, tree-shaking, CSS code splitting, minification, gzip/brotli compression
- `pledge dev` — Dev server with file watching, HMR, on-the-fly Oxc compilation, error overlay
- `pledge serve` — Production static file server (port 4000)
- `pledge bench` — Benchmark build performance (5 runs, min/max/avg/median)
- `pledge analyze` — Interactive bundle size analyzer with treemap
- `pledge test` — Built-in test runner (Vitest-compatible API)
- `pledge cache clear` — Build cache management (content-hash, disk persistence)
- `pledge create <framework> <name>` — Scaffold React/Vue/Svelte/Solid/Next/TanStack projects

Config: `pledge.config.ts` with `defineConfig()` from `pledge`.

## Request Flow

```
HTTP Request
    │
    ▼
┌─────────────────────────────────┐
│  Server (Node.js or Rust/Axum)  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Middleware (middleware.ts)     │
│  redirect / rewrite / headers   │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Router — match(path)           │
│  Returns RouteMatch + params    │
└──────────────┬──────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
   API Route        Page Route
   route.ts         page.tsx / page.psx
   route.ps         layout.tsx
       │               │
       ▼               ▼
   Handler fn    ┌──────────────┐
   returns       │  Render      │
   Response      │  ├─ SSR      │
                 │  ├─ RSC      │
                 │  ├─ Rust SSR │ (static parts via native code)
                 │  └─ SSG      │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │  Wrap in:    │
                 │  ErrorBoundary│
                 │  Suspense    │
                 │  Layout chain│
                 │  <head> tags │
                 └──────┬───────┘
                        │
                        ▼
                   HTML Response
```

## Rendering Modes

| Mode | Description | When |
|------|-------------|------|
| SSR  | Server renders HTML on each request | Default for pages |
| SSG  | Pre-rendered at build time | `generateStaticParams` or static routes |
| RSC  | Server Components streamed to client | `config.rsc = true` |
| ISR  | Static + background revalidation | `revalidate: N` on route |
| API  | JSON/response handlers | `route.ts` files |

## Config

```typescript
// pledge.config.ts
import { defineConfig } from 'pledgestack';

export default defineConfig({
  appDir: 'app',
  publicDir: 'public',
  outDir: '.pledge',
  rsc: true,
  tailwind: true,
  defaultRuntime: 'node',
  output: 'standalone',
  pledgepack: {
    sourceMaps: true,
    compressGzip: true,
    compressBrotli: true,
    devServer: {
      port: 3001,
      hmr: true,
    },
  },
});
```

Framework config (PledgeStack-specific) lives in `pledge.config.ts` alongside the build config, using `defineConfig` from `pledgestack` (which re-exports from `pledgestack-shared`) for app directory, runtime, RSC, and Tailwind settings.

## Build Output

```
.pledge/
├── server/
│   ├── routes.json          # Route manifest for Rust server
│   ├── middleware.json      # Middleware entries
│   ├── middleware-rules.json # Compiled redirect/rewrite rules
│   └── [route].js           # Server bundles per route
├── client/
│   ├── client.js            # Client runtime + hydration
│   ├── rsc-client.js        # RSC client deserializer
│   ├── client.css           # Tailwind output
│   └── chunks/              # Per-route client chunks
├── cargo/                   # Rust workspace (gitignored)
│   ├── Cargo.toml           # Workspace manifest (auto-generated)
│   └── [module]/
│       ├── Cargo.toml       # Per-module manifest (inherits workspace)
│       ├── lib.rs           # Generated Rust source
│       └── target/          # Compiled .node addons
├── index.html               # SSG home page
└── [path].html              # SSG pages
```

## PSX Transform Pipeline

When a `.psx` or `.ps` file is loaded, the transform pipeline runs:

```
.psx / .ps source
    │
    ▼
parsePSX() / parsePS()        — Extract Rust blocks, inline expressions
    │
    ▼
detectCratesFromImports()     — Scan `use` statements for crate dependencies
    │
    ▼
generateModuleCargoToml()     — Per-module Cargo.toml (inherits workspace deps)
    │
    ▼
generateTypeDefinitions()     — .d.ts from Rust structs → TypeScript interfaces
    │
    ▼
generateRustSource()          — lib.rs (user Rust + NAPI bindings)
    │
    ▼
generateNapiWrapper()         — JS wrapper importing .node addon
    │
    ▼
cargo build                   — Compile to native .node addon (content-hash cached)
    │
    ▼
Oxc transform                 — Transform remaining TSX → JS (for .psx only)
    │
    ▼
Output: .node + .js + .d.ts   — Native addon + JS module + type definitions
```

### Two-Layer Performance Model

| Layer | What | Always On? | Benefit |
|-------|------|-----------|---------|
| **Layer 1: Rust toolchain** | Oxc compiler, Axum server, Rust bundler | Yes — every project | Faster dev, builds, lower memory |
| **Layer 2: .psx/.ps files** | Native Rust execution in pages | No — opt-in per file | 10-50x faster for CPU-heavy work |

### Native Addon Fallback Architecture

Every Rust native addon and PSX integration follows a consistent fallback pattern:

```
User code calls integration method
    │
    ▼
require('../native/*.node')
    │
    ├─ Success → Use native Rust addon (fast path)
    │
    └─ Failure → Load JS fallback implementation
                    │
                    ├─ Try optional peer dependency (pg, ioredis, argon2, sharp, etc.)
                    │
                    └─ Fall back to Node.js built-in (node:crypto, fetch, PBKDF2, HMAC-SHA256)
```

This ensures all PSX integrations are usable without Rust installed, with automatic upgrade to native performance when Rust addons are compiled.

A pure TypeScript PledgeStack project (zero `.psx` files) still benefits from Rust toolchain performance. The `.psx`/`.ps` format is the optional upside for native execution speed.
