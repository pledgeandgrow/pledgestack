# Changelog

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
