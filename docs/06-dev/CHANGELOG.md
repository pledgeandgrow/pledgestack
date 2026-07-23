# Changelog

## 0.1.8 (2026-07-25)

### PSX Edge & Serverless + Production Tools (Batch 3)

#### Edge PSX Support (#271)
- **`edge-psx.ts`** — Compile Rust to WASM for edge runtime (Cloudflare/Vercel/Deno)
- **`generateWasmCargoConfig()`** — Cargo.toml for WASM targets with SIMD, size optimization
- **`generateWasmBindings()`** — Platform-specific JS bindings for WASM modules
- **`EdgeAdapter`** — Edge platform adapter with entry point generation
- **`buildWasmModule()`** — Build orchestration for WASM compilation

#### Edge KV Integration (#272)
- **`edge-kv.ts`** — Unified KV API across Cloudflare KV, Vercel KV, Deno KV
- **`createKvAdapter()`** — Factory with platform detection and L1 in-memory cache
- **`KvAdapter`** — Consistent interface: get/put/delete/list + JSON variants + batch ops
- **TTL support** — Automatic key expiration with L1 cache invalidation
- **Namespace support** — Key prefixing for multi-tenant isolation

#### Edge Durable Objects (#273)
- **`edge-durable-objects.ts`** — Cloudflare Durable Objects integration
- **`generateDurableObject()`** — DO class generator with WebSocket, presence, locks
- **`DurableObjectManager`** — Client-side manager with presence tracking, distributed locks
- **`generateWranglerConfig()`** — Wrangler.toml generation for DO bindings

#### Edge Streaming SSR (#274)
- **`edge-streaming-ssr.ts`** — Stream SSR from edge with RSC, partial prerendering
- **`EdgeSsrRenderer`** — Dynamic hole filling from edge KV/D1 with timeout support
- **`PprCache`** — Edge cache for partial prerendering with TTL
- **`createOptimizedStream()`** — Sub-50ms TTFB streaming with immediate head flush

#### Edge Middleware in Rust (#275)
- **`edge-middleware.ts`** — WASM middleware for edge runtime
- **`MiddlewareChain`** — Chain executor with short-circuit support
- **Built-in middleware** — CORS, rate limiting, auth, geo-redirect
- **WASM code generation** — Rust source, Cargo.toml, JS wrapper generation

#### Lambda PSX Support (#276)
- **`lambda-psx.ts`** — AWS Lambda layer for .node addons
- **`generateLayerStructure()`** — Layer directory with addon loader
- **`generateSamTemplate()`** — SAM/CloudFormation template generation
- **Snapstart compatibility** — `checkSnapstartCompatibility()` + `generateSnapstartWrapper()`
- **Provisioned concurrency** — Pre-warm script generation

#### Edge Cache Invalidation (#277)
- **`edge-cache-invalidation.ts`** — Global cache invalidation across platforms
- **`CacheInvalidationManager`** — Multi-platform propagation (Cloudflare/Vercel/Deno)
- **Tag-based invalidation** — Associate keys with tags for group invalidation
- **Event tracking** — Invalidation event history and status tracking

#### Edge Geo-Personalization (#278)
- **`edge-geo.ts`** — `geo()` utility for country/region/city from edge headers
- **`detectPsxLocale()`** — Locale detection from Accept-Language + geo data
- **`geoAbTest()`** — Geo-based A/B testing with country-specific variants
- **`getLocalizationConfig()`** — Currency, date format, time format per locale
- **RTL support** — Automatic RTL detection for Arabic, Hebrew, Farsi, etc.

#### Serverless Cold Start Optimization (#279)
- **`serverless-cold-start.ts`** — Lazy addon loading with deferred require
- **`ColdStartOptimizer`** — Module loader with L1 cache, pre-warm, metrics
- **`createLazyAddon()`** — Proxy-based lazy loading for .node addons
- **`generateInitScript()`** — Serverless initialization script generation

#### Multi-Region Deployment (#280)
- **`multi-region.ts`** — Multi-region routing with automatic failover
- **`MultiRegionManager`** — Latency/weighted/geo/primary routing strategies
- **Health checks** — Periodic health monitoring with failover threshold
- **Traffic shifting** — Region weight adjustment for canary deployments
- **Data residency** — Compliance-aware routing with residency constraints

#### PSX Monitoring Dashboard (#298)
- **`monitoring-dashboard.ts`** — Grafana dashboard template generator
- **`generateGrafanaDashboard()`** — 9 panels: request rate, NAPI latency, cargo build, memory, cache
- **`generateAlertRules()`** — 4 alert rules: error rate, latency, cache hit, memory leak
- **`generatePrometheusMetrics()`** — Prometheus-format metrics endpoint

#### PSX Rollback Support (#301)
- **`rollback.ts`** — Atomic addon deployment with instant rollback
- **`RollbackManager`** — Versioned addon storage with symlink/copy-based switching
- **Health check** — Post-rollback health verification
- **Version history** — Deployment history with max version retention

#### PSX Canary Deployment (#302)
- **`canary.ts`** — Traffic routing for canary releases
- **`CanaryManager`** — Progressive rollout with percentage-based traffic shifting
- **Auto-rollback** — Automatic rollback on error rate or latency threshold breach
- **Health metrics** — Error rate, latency p50/p95, request count tracking
- **Promote/rollback/terminate** — Full canary lifecycle management

#### Tests
- 13 new test files, 96 new tests covering all features above
- All 315 PSX tests passing
- TypeScript compilation clean

## 0.1.6 (2026-07-24)

### PSX Performance & Optimization (Batch 2)

#### Rust Addon Tree Shaking (#282)
- **`tree-shake.ts`** — Analyzes Cargo.toml feature flags, detects unused features and crates, generates optimized Cargo.toml
- **`treeShakeAnalysis()`** — Full project analysis with crate usage tracking and size savings estimates
- **`formatTreeShakeResult()`** — Formatted report with warnings and recommendations

#### PSX Lazy Compilation (#283)
- **`lazy-compile.ts`** — Defers `cargo build` until first Rust function call, reducing dev server startup time
- **`LazyCompilationManager`** — Proxy-based lazy loading with compilation state tracking
- **Module-level invalidation** — Only recompiles changed modules

#### Binary Protocol Streaming (#284)
- **`streaming.ts`** — PSXB binary protocol streaming encoder/decoder for Rust→JS data transfer
- **`PSXBEncoder`/`PSXBDecoder`** — Node.js Transform streams for encoding/decoding PSXB chunks
- **`deserializePSXBPayload()`** — Utility for deserializing PSXB payloads

#### Rust Connection Pool Sharing (#285)
- **`pool.ts`** — Singleton connection pool registry, single pool per process
- **`ConnectionPoolRegistry`** — Process-wide pool management with acquire/release tracking
- **`calculateOptimalPoolSize()`** — Automatic pool sizing based on CPU cores and max connections

#### PSX Memory Profiling (#286)
- **`memory-profile.ts`** — Per-module memory tracking with leak detection
- **`PsxMemoryProfiler`** — Records allocations/deallocations, detects growing memory as leaks
- **Heap snapshot export** — JSON-formatted memory reports for analysis

#### NAPI Call Overhead Benchmarking (#287)
- **`napi-bench.ts`** — Automated NAPI boundary crossing cost measurement
- **`measureFunctionOverhead()`** — Per-function overhead with serialization cost analysis
- **`benchmarkSerialization()`** — Compares JSON, PSXB, and raw buffer serialization formats

#### Rust→JS Callback Optimization (#288)
- **`callback-opt.ts`** — Batched callback queue for high-frequency Rust→JS calls
- **`BatchedCallbackQueue`** — Microtask-based flushing with configurable batch size
- **`DebouncedCallback`/`ThrottledCallback`** — Debounce and throttle utilities for callbacks
- **`CallbackRegistry`** — Central registry for managing all Rust→JS callbacks

#### PSX Worker Threads (#289)
- **`worker-pool.ts`** — Worker thread pool for offloading CPU-intensive Rust functions
- **`PsxWorkerPool`** — Priority-based task queue with automatic pool sizing
- **Graceful shutdown** — Drains queue and terminates workers cleanly

#### Production PSX Profiling (#290)
- **`prod-profile.ts`** — Runtime profiling with OpenTelemetry integration
- **`PsxProductionProfiler`** — Per-function call frequency, execution time, p50/p95/p99 percentiles
- **OTLP export** — Exports spans in OTLP JSON format for distributed tracing
- **Slow function detection** — Automatic identification of functions exceeding threshold

### PSX Format Maturity (Batch 3)

#### Syn-based Rust Parser (#206)
- **`syn-parser.ts`** — TypeScript implementation of a Rust AST parser inspired by the `syn` crate
- **`RustTokenizer`** — Full Rust source tokenizer with keyword, lifetime, string, and attribute support
- **`RustAstParser`** — AST parser for items (fn, struct, enum, impl, trait, use, type, const)
- **`parseRustAst()`** — Public API replacing regex-based parsing with accurate AST extraction

#### VS Code Extension for PSX (#209)
- **Added commands**: Build Rust Addons, Security Audit, Analyze Bundle Size
- **Existing features**: Syntax highlighting, IntelliSense, formatting, linting, debug adapter

#### PSX Debugger (#212)
- **`debug-session.ts`** — DAP (Debug Adapter Protocol) support for stepping through Rust in .psx files
- **`PsxSourceMapManager`** — Bidirectional source mapping between .psx and generated Rust
- **`PsxDebugSession`** — Full debug session with breakpoints, stepping, variable inspection
- **`DapProtocolHandler`** — Handles DAP protocol messages for VS Code integration

#### Incremental Compilation Cache (#214)
- **`sccache.ts`** — sccache integration for cross-project compilation caching
- **`SccacheManager`** — Detect, start/stop, configure sccache with S3/GCS/Redis shared cache support
- **CI cache key generation** — GitHub Actions and GitLab CI cache configurations
- **Cache statistics** — Hit rate, cache size, compiled items tracking

### PSX Hardening (Batch 1)

#### PSX Security Review (#295)
- **`security.ts`** — Security audit for NAPI bindings and Rust source code
- **`scanRustSource()`** — Detects unsafe blocks, raw pointers, unwrap(), FFI, subprocess, filesystem, network access
- **`auditNapiBindings()`** — NAPI-specific security checks
- **`auditProjectSecurity()`** — Full project audit with sandbox configuration

#### PSX Docker Optimization (#297)
- **`docker.ts`** — Multi-stage Dockerfile generation with Rust builder + Node.js runtime
- **`generateDockerfile()`** — Alpine or slim images, non-root user, health checks, <15MB target
- **`generateDockerignore()`** — Optimized .dockerignore for minimal build context
- **`estimateImageSize()`** — Image size estimation with breakdown

#### PSX Version Compatibility (#299)
- **`version-compat.ts`** — Semantic versioning for Rust workspace dependencies
- **`parseSemver()`/`satisfiesVersion()`** — Semver parsing and range checking
- **`detectBreakingChanges()`** — Known breaking changes database for common crates
- **`checkCompatibility()`** — Project-level compatibility validation

#### PSX Load Testing (#304)
- **`bench.ts`** — Benchmarking utilities for Rust vs TypeScript performance comparison
- **`benchmarkFn()`** — High-precision function benchmarking with percentiles
- **`compareRustVsTs()`** — Side-by-side comparison with speedup calculation
- **CLI command**: `pledge bench --psx --compare -i 1000`

## 0.1.5 (2026-07-23)

### Production Readiness & PSX Hardening

#### PSX Audit Logging (#294)
- **`PsxAuditLogger`** — Logs all Rust function calls with sanitized arguments, execution time, caller route, and success/failure status
- **`createAuditedRust()`** — Wraps the `rust` namespace from PSX codegen with automatic audit logging
- **`setAuditContext()`** — AsyncLocalStorage-based route tagging for all Rust calls within a request
- **Sensitive key redaction** — Automatically redacts password, secret, token, key, auth, cookie, session fields
- **Argument truncation** — Long values truncated to configurable max length (default 200 chars)
- **File rotation** — Log file rotates at configurable max size (default 50MB)
- **Sample rate** — Configurable sampling for high-throughput production environments

#### PSX CI/CD Pipeline (#296)
- **`.github/workflows/psx-ci.yml`** — 7-job GitHub Actions workflow:
  - `cargo-audit` — Security vulnerability scanning with `cargo audit --deny warnings`
  - `cargo-clippy` — Lint with `cargo clippy --all-targets --all-features -- -D warnings`
  - `cargo-test` — Run Rust unit tests
  - `cargo-fmt` — Format checking with `cargo fmt -- --check`
  - `cross-compile` — Build `.node` addons for all 6 targets (Windows x64/ARM64, Linux x64/ARM64, macOS x64/ARM64)
  - `bundle-analysis` — Automated bundle size analysis with artifact upload
  - `vitest` — JS/TS test suite
- **Cargo registry caching** — All jobs cache `~/.cargo/registry` and `~/.cargo/git`
- **Path-based triggers** — Only runs when native/ or psx/ files change

#### PSX Production Checklist (#300)
- **`pledge doctor --production`** — 7 production readiness checks:
  - `checkRustToolchain` — Rust toolchain version, minimum 1.70+
  - `checkCargoLock` — Cargo.lock committed and up to date
  - `checkLtoEnabled` — LTO and opt-level in Cargo.toml
  - `checkDebugSymbols` — `.node` files stripped of debug symbols
  - `checkAddonsStripped` — `strip = true` in Cargo.toml
  - `checkNoDebugEnv` — NODE_ENV=production, no debug env vars
  - `checkProductionEnv` — `.env.production` exists, `.gitignore` excludes `.env*`

#### PSX Bundle Analysis (#281)
- **`pledge analyze`** CLI command — Per-module `.node` binary size breakdown
- **`pledge analyze --suggestions`** — Detailed optimization recommendations
- **`analyzeBundle()`** API — Programmatic bundle analysis with crate-level size estimation
- **Crate alternative suggestions** — Recommends lighter alternatives (ureq vs reqwest, rusqlite vs sqlx, rustls vs openssl, etc.)
- **Size delta tracking** — Compares addon sizes across builds using saved reports
- **`formatBundleReport()`** — Human-readable report with color-coded warnings
- **`saveBundleReport()` / `loadBundleReport()`** — JSON report persistence for build-to-build tracking

#### Files Added
- `packages/core/src/psx/audit.ts` — PSX audit logger with `PsxAuditLogger`, `createAuditedRust()`, `setAuditContext()`
- `packages/core/src/psx/audit.test.ts` — 15 tests for audit logging (sanitization, wrapping, context, sampling)
- `packages/core/src/psx/bundle-analysis.ts` — Bundle analysis with `analyzeBundle()`, `formatBundleReport()`, crate suggestions
- `packages/core/src/psx/bundle-analysis.test.ts` — 14 tests for bundle analysis (parsing, formatting, save/load, size delta)
- `packages/cli/src/commands/analyze.ts` — `pledge analyze` CLI command
- `.github/workflows/psx-ci.yml` — PSX CI/CD pipeline with 7 jobs

#### Files Modified
- `packages/cli/src/commands/doctor.ts` — Added 7 production check functions and `--production` flag support
- `packages/cli/src/bin.ts` — Added `analyze` command, `--production` and `--suggestions` flags, updated help text
- `packages/core/src/psx/index.ts` — Export `audit` and `bundle-analysis` modules

### Roadmap
- 253/305 goals complete across 30 phases

---

## 0.1.4 (2026-07-23)

### Native Rendering Pipeline & PSX Integration Fallbacks

#### Rust Native Addons (8 crates)
- **`rust-html`** — HTML template engine with escaping, `<head>` rendering, shell rendering
- **`rust-ssr`** — SSR with virtual DOM, Suspense boundaries, static shell extraction
- **`rust-rsc`** — RSC flight serializer with swc-based module analysis, client reference extraction
- **`rust-html-transformer`** — Streaming HTML transformer with chunk processing and injection
- **`rust-dom-renderer`** — React DOM string renderer with void element support, `canRenderInRust` heuristic, `markRustSafe` opt-in
- **`rust-rsc-deserializer`** — RSC payload deserializer with validation and module reference extraction
- **`rust-ssr-profiler`** — Per-component profiling, flamegraph generation (speedscope format), `withProfiling` wrapper
- **`rust-hydration`** — Hydration script generator with full/minimal/progressive modes, hydration point detection

All crates use `napi-derive` macros and are built via Cargo workspace at `packages/core/native/`. Build script (`build.sh`) compiles all crates and copies `.node` files.

#### PSX Integration JS Fallbacks
All 15 PSX integration classes now gracefully fall back to Node.js packages when native Rust addons are unavailable:
- **SqlxPool** → `pg` (PostgreSQL) or `mysql2` (MySQL)
- **RedisClient** → `ioredis`
- **RustAuth** → `argon2` → `bcryptjs` → PBKDF2 (via `node:crypto`), JWT via `jsonwebtoken` → HMAC-SHA256 pure JS
- **RustHttpClient** → native `fetch` (Node 18+)
- **RustCrypto** → `node:crypto` (AES-256-GCM, SHA-256/512, randomBytes, UUID)
- **RustTracing** → console-based spans and structured logging
- **FileProcessor** → `xlsx` for Excel, built-in CSV parsing/generation
- **ImageProcessor** → `sharp`
- **JobQueue** → in-memory job queue with retry
- **CronScheduler** → `setInterval` with `parseCronToInterval` helper
- **EmailSender** → `nodemailer`
- **PdfGenerator** → `puppeteer`
- **WebSocketServer** → `ws`

#### Bug Fixes
- Fixed PBKDF2 password hashing — was using `hash.digest()` in a loop (which finalizes the hash). Replaced with `pbkdf2Sync` from `node:crypto`.
- Added pure JS JWT sign/verify fallback using HMAC-SHA256 when `jsonwebtoken` is not installed. Previously threw an error.

#### Test Suite (80+ tests)
- `rust-html.test.ts` — 15 tests (escapeHtml, renderHead, renderHtmlShell)
- `rust-ssr.test.ts` — 3 tests (availability check)
- `rust-ssr-profiler.test.ts` — 5 tests (profiling lifecycle, nesting, aggregation)
- `rust-rsc.test.ts` — 5 tests (module analysis, "use client" detection)
- `rust-hydration.test.ts` — 8 tests (script generation, hydration points)
- `rust-html-transformer.test.ts` — 8 tests (head/body injection, CSS/preload)
- `rust-dom-renderer.test.ts` — 15 tests (canRenderInRust, renderSimpleHtml, streaming)
- `integrations.test.ts` — 21 tests (auth, crypto, CSV, tracing, job queue, cron, image)

#### Files Added
- `packages/core/native/Cargo.toml` — Cargo workspace manifest for all native addon crates
- `packages/core/native/{crate}/Cargo.toml` — Per-crate manifests (8 crates)
- `packages/core/native/{crate}/src/lib.rs` — Rust NAPI implementations (8 crates)
- `packages/core/native/build.sh` — Build script for all native addons
- `packages/core/src/psx/integrations-fallback.ts` — JS fallback implementations for all PSX integrations
- `packages/core/src/render/rust-html.test.ts` — Tests for Rust HTML engine
- `packages/core/src/render/rust-ssr.test.ts` — Tests for Rust SSR
- `packages/core/src/render/rust-ssr-profiler.test.ts` — Tests for SSR profiler
- `packages/core/src/render/rust-rsc.test.ts` — Tests for RSC serializer
- `packages/core/src/render/rust-hydration.test.ts` — Tests for hydration generator
- `packages/core/src/render/rust-html-transformer.test.ts` — Tests for HTML transformer
- `packages/core/src/render/rust-dom-renderer.test.ts` — Tests for DOM renderer
- `packages/core/src/psx/integrations.test.ts` — Tests for PSX integration fallbacks

#### Files Modified
- `packages/core/src/psx/integrations.ts` — Wired all integration classes to use JS fallbacks when native addons unavailable
- `packages/core/src/declarations.d.ts` — Added type declarations for optional peer dependencies (pg, mysql2, ioredis, argon2, bcryptjs, jsonwebtoken, xlsx, sharp, puppeteer, nodemailer)

### Roadmap
- 249/305 goals complete across 30 phases

---

## 0.1.3 (2026-07-22)

### Mass Adoption Goals

#### Frictionless Install
- **#218 Cross-compilation CI workflow** — `.github/workflows/cross-compile.yml` builds `.node` addons for all 6 targets (Windows x64/ARM64, Linux x64/ARM64, macOS x64/ARM64) via matrix strategy, uploads artifacts, generates `manifest.json`, and attaches to GitHub releases
- **#231 TypeScript path aliases** — `pledge sync-aliases` command auto-configures `tsconfig.json` paths from `pledge.config.ts` `alias` field

#### Type Safety
- **#221 Generated route types** — Auto-generates `__pledge_route_types.d.ts` with typed `params`, `searchParams`, layout chain types, and route metadata from file-based router
- **#224 Route type-safe navigation** — `TypedRouter` interface with compile-time route param validation from generated route types

#### Developer Experience
- **#208 PSX HMR** — `PSXHMRManager` with incremental `cargo build`, content-hash change detection, module-level invalidation, serialized compile queue, addon hot-swap, and HMR client code generation
- **#207 PSX source maps** — Source map generation and lookup mapping Rust code positions back to `.psx`/`.ps` source lines
- **#210 Rust→JS error mapping** — `mapRustErrors()`, `mapPanicToOriginal()`, `formatMappedError()` for translating Rust panics and compiler errors to readable JS errors with source attribution
- **#233 Environment-aware config** — `pledge.config.development.ts`, `pledge.config.production.ts`, `pledge.config.test.ts` overrides with deep merge
- **#234 Route conflict detection** — Build-time warnings for ambiguous routes, detecting `[slug]` vs `[id]` param conflicts

#### Data & State Hooks
- **#246 `useInfiniteQuery`** — Cursor-based infinite scroll with SSR initial data, background prefetch, revalidate-on-focus, and reset
- **#247 `usePaginatedQuery`** — Offset/limit pagination with URL-synced page state (`?page=N`), adjacent page prefetch, `goToPage`/`nextPage`/`prevPage`
- **#248 `useOptimisticMutation`** — Optimistic updates with `onMutate` context, automatic rollback on error, retry with exponential backoff, cache revalidation
- **#249 Server-side query prefetching** — `prefetchQuery()` for SSR, `dehydrate()`/`hydrateCache()` for SSR→client state transfer, `DehydrateState` component, `useHydrate()` hook
- **#250 Mutation queue** — `enqueueMutation()` and `useQueuedMutation()` with per-key serialization, deduplication of identical mutations, retry with exponential backoff
- **#252 Real-time data hooks** — `useSubscription()` for WebSocket/SSE streams with auto-reconnect, exponential backoff, transform pipeline, and send/close controls
- **#253 Selective cache invalidation** — `invalidateCache()` and `revalidatePattern()` with glob pattern matching (`*`, `**`), `useCacheInvalidation()` hook
- **#254 Cross-tab state sync** — `useCrossTabSync()` via BroadcastChannel, `broadcastInvalidate()`/`broadcastUpdate()`/`broadcastClear()`, `useCrossTabCache()` hook
- **#251 Offline-first data layer** — IndexedDB persistent cache, offline mutation queue with Background Sync API, `useOnlineStatus()`, `useOfflineMutation()`, `useOfflineInit()`, conflict resolution strategies, `registerServiceWorker()`
- **#255 Rust-backed data hooks** — `useRustQuery()` with NAPI caching and dedup, `useRustMutation()` with cache invalidation, `prefetchRustQuery()` for SSR, `batchRustQueries()`/`useBatchRustQueries()`, `dehydrateRustCache()`/`hydrateRustCache()`

### Files Added
- `.github/workflows/cross-compile.yml` — Cross-compilation CI workflow
- `packages/core/src/psx/hmr.ts` — PSX HMR manager
- `packages/client/src/advanced-hooks.ts` — Advanced data hooks (infinite query, paginated query, optimistic mutation, prefetch/dehydrate, mutation queue, subscription, cache invalidation, cross-tab sync)
- `packages/client/src/offline-hooks.ts` — Offline-first data layer (IndexedDB cache, offline mutation queue, background sync, conflict resolution)
- `packages/client/src/rust-hooks.ts` — Rust-backed data hooks (useRustQuery, useRustMutation, batch queries, SSR prefetch/hydrate)

### Files Modified
- `packages/server/src/hmr.ts` — Added `.psx`/`.ps` to watchable file extensions
- `packages/core/src/psx/index.ts` — Exported HMR module
- `packages/client/src/data-hooks.ts` — Exported `responseCache` and `dedupFetch`
- `packages/client/src/index.ts` — Exported advanced hooks, offline hooks, rust hooks

### Roadmap
- 233/305 goals complete across 30 phases

---

## 0.1.2 (2026-07-17)

### Changes
- **Wired `loadInstrumentation` into server startup** — `instrumentation.ts` `register()` export is now called during `startNodeServer()` and `createEdgeHandler()` startup, before any requests are handled. Previously documented but not wired.
- **Wired `generateStaticExport` into `pledge build`** — When `config.output === 'export'`, the build command now uses `generateStaticExport` to pre-render all routes (including dynamic routes via `generateStaticParams`) to static HTML files. Regular builds still use `generateStaticPages` for incremental SSG.
- **Removed `renderRSC` function** — The redundant `renderRSC` wrapper in `packages/core/src/render/rsc.ts` has been removed. It was superseded by `renderRSCToHTML` and `renderRSCStream`, which are the supported RSC rendering entry points. `hydrateRSC` and related types are preserved.

### Migration
No migration required. `renderRSC` was an internal function not part of the public API. The `instrumentation.ts` and `output: 'export'` features are additive.

---

## 0.1.0 (2025-07-17)

### First Public Release

PledgeStack — a full-stack React framework with familiar Next.js conventions, made better.

#### Core Framework
- File-based routing with `app/` directory conventions
- SSR, SSG, and RSC (React Server Components) support
- API routes with all HTTP methods
- Middleware with path-based matcher config
- Server Actions with type-safe RPC
- Pledge System — selective hydration via `pledge()` HOC (load/visible/idle/only/media strategies)
- Parallel routes, intercepting routes, route groups
- `loading.tsx` Suspense streaming, `error.tsx` error boundaries
- `global-error.tsx`, `not-found.tsx`, `template.tsx`, `head.tsx` conventions
- `generateStaticParams`, ISR, route segment config (`revalidate`, `dynamic`)
- `fetch()` cache with revalidation tags, `revalidateTag()` / `revalidatePath()`
- Server utilities: `cookies()`, `headers()`, `searchParams()`, `params()`, `draftMode()`
- `redirect()`, `notFound()`, `after()`, `connection()`
- `instrumentation.ts` server lifecycle hooks
- `viewport` export, `useActionState` hook
- `server-only` / `client-only` module markers
- Per-route `runtime` config (node/edge)
- Link prefetch strategies (intent, render, none, visible)
- i18n routing
- Static export mode (`output: export`)

#### Developer Experience
- React Fast Refresh with state preservation
- Error overlay with stack traces and source maps
- `pledgestack create` — scaffold new apps
- `pledgestack info` — environment diagnostics
- `pledgestack doctor` — diagnose and fix issues
- ESLint plugin with convention and security rules
- VS Code extension
- Dev toolbar with route inspector and cache viewer
- Environment variables with `PLEDGE_PUBLIC_` prefix

#### Edge & Serverless
- Cloudflare Workers, Vercel Edge, Deno Deploy, AWS Lambda, Netlify adapters
- Edge-compatible bundle without Node.js builtins
- Docker image support
- Standalone output mode
- Health check endpoint with readiness/liveness probes
- Graceful shutdown with request draining

#### Security (OWASP Top 10 Coverage)
- CSP with nonce-based headers, security headers middleware
- XSS prevention, CSRF protection, open redirect prevention
- Path traversal protection, prototype pollution protection
- ReDoS prevention, clickjacking protection
- DNS rebinding protection, Trusted Types enforcement
- Cross-origin isolation (COOP/COEP/CORP)
- OAuth 2.1/OIDC, session management, JWT, TOTP/2FA, WebAuthn/passkeys
- RBAC, ABAC, API key management, SAML SSO, auth audit log
- SSRF prevention, SQL/NoSQL injection prevention
- Request body size limits, file upload security
- GraphQL security (depth limiting, complexity analysis)
- WebSocket authentication
- API key rotation
- Rate limiting (token bucket / sliding window)
- Bot detection, brute force protection
- Supply chain security: SBOM, license compliance, pinned deps, provenance attestation, Sigstore signing, dependency allowlist, secret scanning

#### Privacy & Compliance
- GDPR/CCPA compliance helpers
- PII redaction middleware
- Data retention policies with automatic purge
- Encryption at rest (AES-256-GCM) and in transit (HSTS)
- Cookie consent framework
- Data export endpoint
- Privacy-by-default config
- Compliance documentation generator

#### Observability
- Structured JSON logging with request-scoped context
- OpenTelemetry distributed tracing
- Prometheus metrics export
- Sentry/Bugsnag error tracking integration
- Request ID propagation
- Slow request detection with route attribution
- Cache hit/miss logging
- Real-time dev profiler with flamegraph
- Web Vitals monitoring (CLS, LCP, INP, TTFB)

#### Performance
- React 19 concurrent rendering
- Streaming SSR with backpressure
- Edge cache strategies (stale-while-revalidate)
- Route-level lazy loading with prefetch
- Resource hints automation (preload, prefetch, preconnect)
- ETag generation with 304 handling
- Database connection pooling
- Query memoization via React `cache()`
- Image lazy loading + blur placeholder
- Font display optimization
- Bundle size budget enforcement

#### Documentation
- Interactive tutorial (10 steps)
- API reference auto-generation via TypeDoc
- Next.js migration guide with codemods
- 20+ example gallery (beginner to advanced)

#### Testing
- Vitest unit test infrastructure
- Integration tests (route matching, SSR, API, middleware)
- Playwright E2E tests
- Route snapshot tests
- Performance benchmarks
- Bundle size budget CI
- ESLint CI with zero warnings

#### Roadmap
- 194/194 goals complete across 21 phases (at release)
