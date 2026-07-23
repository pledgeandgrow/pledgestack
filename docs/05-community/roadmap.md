# PledgeStack Roadmap — 305 Goals Across 30 Phases (253 Complete, 52 Planned)

## North Star

Be the best full-stack React framework — familiar Next.js conventions, made better. Focus on developer experience, correctness, and clean architecture. Performance targets will come with PledgePack integration later.

> **Scope:** This roadmap covers PledgeStack framework goals only. Build performance, bundling, tree-shaking, minification, source maps, CSS code splitting, asset pipeline, and Rust production server are handled by [PledgePack](https://www.npmjs.com/package/pledgepack) and are NOT tracked here.

## Phase 1: Core Runtime (1–10)

- [x] 1. All dependencies install cleanly with `pnpm install`
- [x] 2. `pledgestack dev` boots and serves playground at `localhost:3000`
- [x] 3. esbuild transforms TSX/TS files for dev server execution
- [x] 4. SSR renders home page with layout chain
- [x] 5. API routes return JSON
- [x] 6. Middleware redirects/rewrites work
- [x] 7. 404 renders `not-found.tsx` with layout
- [x] 8. HMR reloads modules on file change
- [x] 9. Server utilities (`cookies()`, `headers()`, `params()`) work via AsyncLocalStorage
- [x] 10. `draftMode()` server utility

## Phase 2: Routing & Conventions (11–20)

- [x] 11. `head.tsx` convention — component-based `<head>`
- [x] 12. `template.tsx` convention — re-mounts on navigation
- [x] 13. Pledge System — `pledge()` HOC with hydration strategies (load/visible/idle/only/media)
- [x] 14. Server Actions — `serverAction()` type-safe RPC wrapper
- [x] 15. RSC streaming piped directly to HTTP response
- [x] 16. Parallel routes (`@slot`) — independent route trees
- [x] 17. Intercepting routes (`(..)`, `(..)(..)`)
- [x] 18. Route groups with layouts — `(group)` segments
- [x] 19. Selective hydration — prioritize visible components
- [x] 20. Real page transitions — fetch + swap + re-hydrate

## Phase 3: Data & Caching (21–28)

- [x] 21. Wire `setRequestContext()` into handler
- [x] 22. On-demand revalidation API endpoint
- [x] 23. `generateStaticParams` for dynamic routes
- [x] 24. Route segment config (`revalidate`, `dynamic`)
- [x] 25. ISR background revalidation
- [x] 26. Data fetching in RSC with automatic caching
- [x] 27. Cookie-based cache variants
- [x] 28. `fetch()` cache with revalidation tags

## Phase 4: Developer Experience (29–38)

- [x] 29. React Fast Refresh — preserve state during HMR
- [x] 30. Error overlay — stack traces, source maps, click-to-open
- [x] 31. `pledgestack create` — scaffold new apps from templates
- [x] 32. `pledgestack info` — environment diagnostics
- [x] 33. Environment variables — `.env` with `PLEDGE_PUBLIC_` prefix
- [x] 34. ESLint plugin — PledgeStack convention rules
- [x] 35. CI pipeline — GitHub Actions
- [x] 36. VS Code extension — highlighting, icons, IntelliSense
- [x] 37. Dev toolbar — route inspector, cache viewer
- [x] 38. `pledgestack doctor` — diagnose and fix common issues

## Phase 5: Framework Maturity (39–46)

- [x] 39. `loading.tsx` Suspense boundary streaming
- [x] 40. `error.tsx` error boundary with recovery
- [x] 41. Middleware with `PledgeResponse`-style API
- [x] 42. Route handlers with streaming responses
- [x] 43. Static export mode (`output: export`)
- [x] 44. Custom 404/500 pages per segment
- [x] 45. Internationalization (i18n) routing
- [x] 46. Route prefetching with priority hints

## Phase 6: Framework API Completeness (47–58)

- [x] 47. Docker image — Minimal Rust binary + bundled JS for sub-10MB deployment images
- [x] 48. Standalone output mode — Self-contained `.pledge/standalone/` directory with all deps bundled
- [x] 49. Health check endpoint — `/api/health` with readiness and liveness probes for Kubernetes
- [x] 50. Graceful shutdown — Drain in-flight requests on SIGTERM before closing server
- [x] 51. `redirect()` server utility — Type-safe redirect from server components, route handlers, middleware
- [x] 52. `notFound()` server utility — Trigger 404 rendering from server components and route handlers
- [x] 53. `global-error.tsx` convention — Top-level error boundary replacing root layout on unrecoverable errors
- [x] 54. `instrumentation.ts` — Server lifecycle hooks (`register()`) for startup initialization, OpenTelemetry, DB pools
- [x] 55. `after()` — Defer non-critical work (analytics, logging) until after response is sent to client
- [x] 56. `connection()` — Connection state in server components for streaming/edge readiness checks
- [x] 57. `viewport` export — Separate viewport metadata (`themeColor`, `width`, `initialScale`) from `head.tsx`
- [x] 58. Middleware `matcher` config — Path-based middleware activation via `export const matcher = [...]`

## Phase 7: Framework APIs (59–66)

- [x] 59. `useActionState` — React 19 action state hook for progressive form enhancements with `serverAction()`
- [x] 60. `server-only` / `client-only` module markers — Throw on invalid import (server module imported by client, vice versa)
- [x] 61. Per-route `runtime` config — `runtime: 'node' | 'edge'` in route segment config to switch runtime per route
- [x] 62. Link prefetch strategies — Configurable `prefetch` prop: `intent` (hover), `render`, `none`, `visible` (IntersectionObserver)
- [x] 63. `revalidateTag()` / `revalidatePath()` as top-level server utilities — Expose cache invalidation from any server component or action
- [x] 64. `unstable_cache` expose — Expose request-scoped cache wrapper as top-level server utility
- [x] 65. Route handler `DELETE` / `PATCH` — Ensure all HTTP methods are supported in `route.ts` with type-safe helpers
- [x] 66. `headers()` / `cookies()` mutation — Allow setting response headers and cookies from server components (not just reading)

## Phase 8: Testing & Quality (67–74)

- [x] 67. Unit test infrastructure — Vitest configured with per-package test setups
- [x] 68. Integration test suite — Test framework end-to-end: route matching, SSR, API routes, middleware
- [x] 69. E2E test suite — Playwright tests for playground app covering navigation, forms, API
- [x] 70. Route snapshot tests — Snapshot SSR HTML output per route to catch regressions
- [x] 71. Performance benchmarks — Automated benchmarks comparing requests/sec vs Next.js
- [x] 72. Bundle size budget — Enforce max bundle size per route in CI
- [x] 73. Type safety audit — Zero `any` types across all packages, strict mode enforced
- [x] 74. Lint rule coverage — Custom ESLint rules enforced in CI with zero warnings

## Phase 9: Ecosystem & Integrations (75–84)

- [x] 75. Plugin system — Hook into build, render, and server lifecycle via `plugins: []` in config
- [x] 76. Auth integration — Cookie/session-based auth helpers (`pledgestack/auth`)
- [x] 77. Database adapters — Prisma, Drizzle, Kysely integration examples and docs
- [x] 78. Image optimization — `pledgestack/image` component with responsive sizes, WebP/AVIF conversion
- [x] 79. Font optimization — `pledgestack/font` with automatic subsetting and preloading
- [x] 80. MDX support — `pledgestack-mdx` package for Markdown/MDX pages and content
- [x] 81. OG image generation — `pledgestack/og` for dynamic OpenGraph image generation with Satori
- [x] 82. Sitemap generation — Automatic `sitemap.xml` generation from route tree at build time
- [x] 83. RSS feed generation — `generateFeed()` API for blog/content sites
- [x] 84. WebSocket support — Real-time routes with `ws` protocol in `route.ts`

## Phase 10: Edge & Serverless (85–90)

- [x] 85. Cloudflare Workers adapter — Deploy PledgeStack apps to Cloudflare Workers
- [x] 86. Vercel Edge adapter — Deploy to Vercel Edge Functions
- [x] 87. Deno Deploy adapter — Deploy to Deno Deploy
- [x] 88. AWS Lambda adapter — Serverless deployment with Lambda + API Gateway
- [x] 89. Netlify adapter — Deploy to Netlify Functions
- [x] 90. Edge-compatible bundle — PledgePack emits edge-safe bundle without Node.js builtins

## Phase 11: Observability & Debugging (91–95)

- [x] 91. Structured logging — `pledgestack/logger` with request-scoped logs and log levels
- [x] 92. Request tracing — OpenTelemetry integration for distributed tracing
- [x] 93. Dev profiler — `pledgestack dev --profile` with per-route render time breakdown
- [x] 94. Cache inspector — Dev toolbar panel showing cached fetches, revalidation events, tags
- [x] 95. Route inspector — Dev toolbar panel showing matched route, params, layout chain, middleware

## Phase 12: Documentation & Community (96–99)

- [x] 96. Interactive tutorial — Step-by-step guide with live code execution in the browser
- [x] 97. API reference auto-generation — Extract API docs from TypeScript source with TypeDoc
- [x] 98. Migration guide — Next.js → PledgeStack migration documentation with codemods
- [x] 99. Example gallery — 20+ examples covering auth, databases, i18n, streaming, edge, etc.

## Phase 13: Security Hardening (100–116)

- [x] 100. Strict Content Security Policy — Auto-generated nonce-based CSP headers per request, blocking inline scripts by default
- [x] 101. Security headers middleware — Automatic `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` headers on all responses
- [x] 102. XSS prevention layer — Automatic output escaping audit, `dangerouslySetInnerHTML` lint rule, DOMPurify integration for user content
- [x] 103. CSRF protection for server actions — Double-submit cookie + `Origin`/`Sec-Fetch-Site` validation on all state-changing requests
- [x] 104. Open redirect prevention — Validate all redirect URLs against an allowlist, block absolute URLs to external hosts in middleware
- [x] 105. Path traversal protection — Sandbox file access in module loader, reject `..` in route paths, validate all `fs` calls against `rootDir`
- [x] 106. Prototype pollution protection — Deep-merge sanitization, `Object.create(null)` for parsed JSON, block `__proto__` keys in query params and body
- [x] 107. ReDoS prevention — Safe regex validation on all user inputs, timeout-based regex execution, detect catastrophic backtracking patterns at build time
- [x] 108. Clickjacking protection — `X-Frame-Options: DENY` by default, `frame-ancestors` in CSP, per-route override for embeddable pages
- [x] 109. MIME type sniffing prevention — `X-Content-Type-Options: nosniff` on all responses, correct `Content-Type` for static assets
- [x] 110. DNS rebinding protection — Validate `Host` header against allowlist in dev server, bind to `127.0.0.1` by default
- [x] 111. Trusted Types enforcement — CSP `require-trusted-types` directive, framework-level Trusted Types policy for all DOM sinks
- [x] 112. Cross-origin isolation — `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` opt-in for `SharedArrayBuffer` support
- [x] 113. CORP/COEP middleware — Per-route cross-origin resource policy headers, automatic `Cross-Origin-Resource-Policy: same-site` for static assets
- [x] 114. Referrer policy control — Configurable `Referrer-Policy` per route, default `strict-origin-when-cross-origin`
- [x] 115. Permission policy framework — `Permissions-Policy` header management, disable unused browser APIs (camera, microphone, geolocation) by default
- [x] 116. Security header validation in CI — Automated test asserting all security headers present and correctly configured on every route

## Phase 14: Authentication & Authorization (117–126)

- [x] 117. OAuth 2.1 / OIDC integration — Built-in OAuth provider support with PKCE, state validation, and automatic token refresh
- [x] 118. Session management — Secure server-side sessions with `httpOnly`, `Secure`, `SameSite=Lax` cookies, configurable session expiry and rotation
- [x] 119. JWT security — `jose`-based JWT signing/verification with RS256/ES256, short-lived access tokens + refresh tokens, `alg` confusion prevention
- [x] 120. TOTP / 2FA support — Built-in TOTP enrollment, verification, and backup codes in `pledgestack-auth`
- [x] 121. Passkey / WebAuthn support — Passwordless authentication with platform authenticators, conditional UI mediation
- [x] 122. Role-based access control (RBAC) — Declarative route-level `roles` config, middleware-level enforcement, `usePermissions()` hook
- [x] 123. Attribute-based access control (ABAC) — Policy-based authorization with context-aware rules (IP, time, device, risk score)
- [x] 124. API key management — Scoped API keys with rate limits, rotation, and revocation for programmatic access
- [x] 125. SAML 2.0 enterprise SSO — Service provider metadata generation, signed assertions, IdP-initiated and SP-initiated flows
- [x] 126. Auth audit log — Immutable log of all auth events (login, logout, failed attempts, token refresh, password changes)

## Phase 15: Performance & Optimization (127–138)

- [x] 127. React 19 concurrent rendering — Optimize `useDeferredValue`, `useTransition`, and `Suspense` for non-blocking UI updates
- [x] 128. Streaming SSR with backpressure — Pipe `renderToPipeableStream` directly to HTTP response with proper backpressure handling
- [x] 129. Edge cache strategies — Stale-while-revalidate at edge with `Cache-Control` + `stale-while-revalidate` + `CDN-Cache-Control` headers
- [x] 130. Route-level lazy loading — Automatic dynamic import for non-critical routes with prefetch on hover/viewport
- [x] 131. Resource hints automation — Auto-generate `<link rel="preload">` for fonts/images, `<link rel="prefetch">` for likely-next routes, `<link rel="preconnect">` for external origins
- [x] 132. ETag generation — Auto-generate weak ETags for SSR pages, `304 Not Modified` handling for cached responses
- [x] 133. Database connection pooling — Built-in connection pool with configurable min/max/idle timeout, health checks, and graceful drain
- [x] 134. Query memoization — Automatic deduplication of identical data fetches within a single request via React `cache()`
- [x] 135. Image lazy loading + blur placeholder — Native `loading="lazy"` + `fetchpriority`, LQIP blur-up placeholder, responsive `srcset` auto-generation
- [x] 136. Font display optimization — `font-display: swap` by default, `size-adjust` for fallback fonts, preload critical fonts with `crossorigin`
- [x] 137. Bundle size budget enforcement — Per-route bundle size limits in CI, fail build if budget exceeded, suggest which imports to split
- [x] 138. Web Vitals monitoring — Automatic CLS, LCP, FID, INP, TTFB reporting to analytics, route-level performance attribution

## Phase 16: Supply Chain & Dependency Security (139–146)

- [x] 139. Dependency audit CI — Automated `pnpm audit` on every PR, block merge on critical/high vulnerabilities
- [x] 140. Software Bill of Materials (SBOM) — Generate CycloneDX/SPDX SBOM on every build, publish alongside release artifacts
- [x] 141. License compliance check — Scan all dependencies for license compatibility, fail build on GPL/AGPL in production deps
- [x] 142. Pinned dependency versions — All `pledgestack-*` packages use exact versions for internal deps, `pnpm-lock.yaml` enforced in CI
- [x] 143. Provenance attestation — SLSA Level 3 build provenance for all `pledgestack-*` npm publishes, verifiable with `npm audit signatures`
- [x] 144. Sigstore signing — All npm packages signed with Sigstore (`npm publish --provenance`), `cosign` verification in install script
- [x] 145. Dependency allowlist — Configurable allowlist for third-party packages, block unauthorized transitive deps at install time
- [x] 146. Secret scanning in CI — TruffleHog/Gitleaks scan on every PR, block merge on detected secrets in source or lockfiles

## Phase 17: Privacy & Compliance (147–156)

- [x] 147. GDPR compliance helpers — Consent management API, `Right to be Forgotten` data deletion utility, cookie consent banner component
- [x] 148. CCPA compliance — "Do Not Sell My Personal Information" endpoint, privacy policy generator, data category labeling
- [x] 149. PII redaction middleware — Automatic redaction of sensitive fields (SSN, email, phone) from logs and error reports
- [x] 150. Data retention policies — Configurable TTL for session data, audit logs, and cached responses with automatic purge
- [x] 151. Encryption at rest — AES-256-GCM encryption for session store, optional field-level encryption for database adapters
- [x] 152. Encryption in transit — Enforce HTTPS with HSTS preload, automatic `http://` → `https://` redirect, TLS 1.2+ minimum
- [x] 153. Cookie consent framework — Granular consent categories (necessary, analytics, marketing), `SameSite=None` only with consent
- [x] 154. Data export endpoint — User data export in machine-readable format (JSON/CSV) for GDPR/CCPA compliance
- [x] 155. Privacy-by-default config — All analytics, telemetry, and tracking disabled by default, explicit opt-in required
- [x] 156. Compliance documentation generator — Auto-generate data flow diagrams, processing records, and DPIA templates from config

## Phase 18: Observability & Monitoring (157–166)

- [x] 157. Structured JSON logging — `pledgestack-logger` with request-scoped context, log levels, redaction, and OpenTelemetry-compatible output
- [x] 158. Distributed tracing — OpenTelemetry integration with auto-instrumentation for HTTP, React render, database, and fetch calls
- [x] 159. Metrics export — Prometheus-compatible `/metrics` endpoint with request count, latency histogram, error rate, and cache hit ratio
- [x] 160. Error tracking integration — Sentry/Bugsnag adapter, automatic source map upload, request context enrichment, PII scrubbing
- [x] 161. Health check endpoint — `/api/health` with readiness (deps connected) and liveness (event loop responsive) probes for Kubernetes
- [x] 162. Graceful shutdown — Drain in-flight requests on `SIGTERM`, close DB pools, flush logs, exit within configurable timeout
- [x] 163. Request ID propagation — Auto-generate `X-Request-Id` header, propagate to all logs, traces, and downstream fetch calls
- [x] 164. Slow request detection — Configurable threshold logging for requests exceeding N ms, with route attribution and stack trace
- [x] 165. Cache hit/miss logging — Debug-level logging for cache decisions (hit, miss, stale, revalidate) with cache key and TTL
- [x] 166. Real-time dev profiler — `pledgestack dev --profile` with flamegraph per route, React component render time, and data fetch waterfall

## Phase 19: Developer Safety Net (167–176)

- [x] 167. Input validation framework — Zod-based request body/query/params validation with automatic TypeScript inference and error responses
- [x] 168. Output serialization safety — Automatic JSON sanitization to prevent XSS in API responses, remove `__proto__` and constructor keys
- [x] 169. Rate limiting middleware — Token bucket / sliding window rate limiter with per-IP, per-user, and per-route configuration
- [x] 170. Bot detection — Heuristic bot detection (User-Agent, request patterns, CAPTCHA challenge) for form submissions and auth endpoints
- [x] 171. Brute force protection — Exponential backoff on failed auth attempts, account lockout after N failures, CAPTCHA after M attempts
- [x] 172. Secure defaults config — `pledgestack create` generates apps with security headers, CSP, HTTPS redirect, and secure cookies enabled by default
- [x] 173. Security lint rules — ESLint plugin rules for `no-eval`, `no-implied-eval`, `no-new-func`, `react/no-danger`, and custom PledgeStack security rules
- [x] 174. Type-safe environment variables — `pledgestack generate-env-types` with Zod schema validation, fail fast on missing/invalid env at boot
- [x] 175. Error boundary telemetry — Automatic error capture in `error.tsx` boundaries with sanitized stack traces and user context
- [x] 176. Development security warnings — Console warnings for insecure patterns (HTTP in production, missing CSRF, loose CORS) in dev mode

## Phase 20: Edge & Runtime Security (177–184)

- [x] 177. Edge secrets management — Integration with Cloudflare Secrets, Vercel Edge Config, and Deno KV for secure secret access at edge
- [x] 178. Edge rate limiting — Distributed rate limiting using Cloudflare Durable Objects, Vercel Edge Config, or Upstash Redis
- [x] 179. Edge auth validation — JWT verification at edge without origin round-trip, JWKS caching with automatic rotation
- [x] 180. Edge CSP generation — Per-request nonce generation and CSP header injection in edge adapters
- [x] 181. Edge geo-restriction — Block or allowlist requests by country/region using `CF-IPCountry` or `X-Vercel-IP-Country` headers
- [x] 182. Edge bot mitigation — Edge-level bot detection before origin round-trip, challenge pages for suspicious requests
- [x] 183. Cold start optimization — Minimize edge bundle size, lazy-load non-critical modules, pre-warm critical paths
- [x] 184. Edge timeout enforcement — Configurable request timeout at edge with `504 Gateway Timeout` response, prevent long-running DoS

## Phase 21: API & Data Security (185–194)

- [x] 185. API route schema validation — Declarative `schema` export in `route.ts` with automatic request validation and `400` on invalid input
- [x] 186. API response typing — Type-safe response helpers ensuring `Content-Type` and body match, prevent MIME confusion attacks
- [x] 187. SQL injection prevention — Parameterized query enforcement in DB adapters, detect string concatenation in SQL at lint time
- [x] 188. NoSQL injection prevention — Sanitize MongoDB/operator queries, block `$where`, `$function`, and `$expr` from user input
- [x] 189. SSRF prevention — Validate all outbound `fetch()` URLs against allowlist, block private IP ranges (RFC 1918), metadata endpoints (`169.254.169.254`)
- [x] 190. Request body size limit — Configurable max body size (default 1MB), `413 Payload Too Large` on exceed, streaming for large uploads
- [x] 191. File upload security — Magic number validation, file size limit, virus scan hook, sanitize filename, store outside web root
- [x] 192. GraphQL security — Query depth limiting, query complexity analysis, introspection disabled in production, persisted queries
- [x] 193. WebSocket authentication — Authenticate WebSocket upgrade request, reject unauthenticated connections, per-connection rate limit
- [x] 194. API key rotation — Automatic API key rotation with grace period, old key invalidation, notification on key usage from new IP

## Phase 22: PSX Format — Rust Integration (195–205)

- [x] 195. `.psx` parser — Extract `<rust>` blocks and `rust!{}` inline expressions from TSX files
- [x] 196. `.ps` format — Pure Rust file format (no JSX), entire file treated as one Rust block
- [x] 197. Type generation — Auto-generate TypeScript interfaces from Rust structs (i32→number, String→string, Option<T>→T|null, Vec<T>→T[])
- [x] 198. NAPI bindings — Auto-generate napi-rs bindings for Rust functions, no manual FFI glue code
- [x] 199. Cargo compilation — `cargo build` integration in transform pipeline with content-hash caching
- [x] 200. Rust workspace management — Single root `Cargo.toml`, per-module manifests inheriting dependencies, `pledge add/remove/list` CLI commands
- [x] 201. Crate auto-detection — Scan `use` statements to detect required crates, auto-generate per-module `Cargo.toml`
- [x] 202. Batch API — `rust.batch()` for parallel queries with one NAPI boundary crossing, `rust.transactionSql()` for atomic transactions, `rust.prepared()` for cached prepared statements
- [x] 203. Binary protocol — PSXB format replacing JSON for Rust↔JS data transfer, 4x faster with field name deduplication
- [x] 204. Rust SSR — Build-time static HTML extraction from component trees, compiles to Rust string templates, `__ssr_{module}()` native renderers
- [x] 205. Fallback support — `.psx` files work as pure TSX if Rust not installed, `.ps` files export stub with helpful error, rest of app unaffected

## Phase 23: PSX Format Maturity (206–220)

- [x] 206. Syn-based Rust parser — Replace regex parser with proper Rust AST parser using `syn` crate for accurate `<rust>` block extraction, struct/enum/fn detection, and inline expression parsing
- [x] 207. PSX source maps — Generate source maps mapping Rust code positions back to original `.psx`/`.ps` file lines, enabling click-to-source in error overlay and debugger
- [x] 208. PSX HMR — Hot Module Replacement for Rust code changes: incremental `cargo build` with `--config` profile, module-level invalidation, preserve TSX state across Rust recompiles
- [x] 209. VS Code extension for PSX — Language configuration, syntax highlighting for `<rust>` blocks, IntelliSense for Rust inside `.psx`, Go-to-definition across JS→Rust boundary
- [x] 210. Rust→JS error mapping — Map Rust panic locations and `Result::Err` returns back to `.psx` source lines in error overlay, with Rust backtrace translation
- [x] 211. `println!` → `console.log` bridge — Automatic capture of Rust `println!`/`eprintln!` output and redirection to Node.js `console.log`/`console.error` with source attribution
- [x] 212. PSX debugger — DAP (Debug Adapter Protocol) support for stepping through Rust code inside `.psx` files, breakpoints on Rust functions, variable inspection across NAPI boundary
- [x] 213. Cargo profile presets — Dev and release profiles tuned for PledgeStack: `dev` with `opt-level=1` for faster iteration, `release` with LTO and `opt-level=3` for production, configurable via `pledge.config.ts`
- [x] 214. Incremental compilation cache — Persistent `cargo` target directory across dev server restarts, sccache integration for cross-project compilation caching, content-hash invalidation
- [x] 215. PSX test runner — `pledge test` support for `.ps` and `.psx` Rust functions: auto-discover `#[test]` and `#[tokio::test]` functions, run alongside Vitest tests, unified test report
- [x] 216. Rust crate version pinning — `pledge add sqlx@0.8` syntax for version-pinned crates, `Cargo.lock` checked into git for reproducible builds, `pledge update` for safe upgrades
- [x] 217. PSX lint rules — ESLint rules for `.psx` files: detect unused Rust functions, warn on `unwrap()` in server code, enforce `Result` return types for fallible functions, check NAPI signature compatibility
- [x] 218. Cross-compilation targets — Pre-build `.node` addons for multiple targets (x86_64-linux, aarch64-linux, x86_64-darwin, aarch64-darwin, x86_64-windows) in CI, cache for fast installs
- [x] 219. PSX dead code elimination — Detect unused Rust functions/structs across `.psx`/`.ps` files, strip from compiled addon, reduce `.node` binary size
- [x] 220. Rust fmt integration — `pledge fmt` runs `cargo fmt` on all `.ps`/`.psx` Rust blocks, consistent formatting across project, CI enforcement

## Phase 24: Developer Experience & Tooling (221–235)

- [x] 221. Generated route types — Auto-generate `__pledge_route_types.d.ts` from file-based router at build time: typed `params`, `searchParams`, layout chain types, route metadata
- [x] 222. Streaming metadata — Inject `<title>` and `<meta>` tags via streaming HTML transformer that patches `<head>` after initial flush, async `generateMetadata()` without blocking first byte
- [x] 223. Storybook integration — `pledge storybook` command with zero-config setup using PledgePack as builder, auto-discover `*.stories.tsx` files, Storybook 8+ compatibility
- [x] 224. Route type-safe navigation — `useRouter().navigate('/blog/[slug]', { params: { slug: 'hello' } })` with compile-time route param validation from generated route types
- [x] 225. `pledge clean` command — Remove `.pledge/`, `.pledge-cache/`, `cargo/target/`, PledgePack disk cache, and all generated artifacts in one command
- [x] 226. PSX playground — In-browser REPL for testing Rust functions from `.ps`/`.psx` files, WASM-compiled Rust for instant feedback, shareable URLs for snippets
- [x] 227. Migration codemods — Automated codemods for Next.js → PledgeStack: `getStaticProps` → `generateStaticParams`, `getServerSideProps` → server component, `pages/` → `app/` directory
- [x] 228. Plugin API docs — Auto-generated plugin API documentation from TypeScript source, plugin development guide, example plugins for common use cases (analytics, A/B testing, feature flags)
- [x] 229. `pledge init` command — Add PledgeStack to existing project: detect framework (Vite, CRA, Next.js), migrate config, convert routes, install dependencies, generate `pledge.config.ts`
- [x] 230. Dev overlay improvements — Component inspector (click to select), prop editor, state tree viewer, network waterfall, cache invalidation timeline, RSC payload inspector
- [x] 231. TypeScript path aliases — Auto-configure `tsconfig.json` paths for `@/app/*`, `@/lib/*`, `@/components/*` from `pledge.config.ts` `alias` field, sync with PledgePack resolve aliases
- [x] 232. `pledge upgrade` command — Check for new PledgeStack/PledgePack versions, run migration codemods for breaking changes, update `Cargo.toml` workspace deps, `pledgepack` binary
- [x] 233. Environment-aware config — `pledge.config.development.ts`, `pledge.config.production.ts`, `pledge.config.test.ts` overrides merged with base config, env-specific plugin sets
- [x] 234. Route conflict detection — Build-time warning when two routes match the same URL pattern, detect ambiguous `[slug]` vs `[id]` params, suggest route group isolation
- [x] 235. `pledge why` command — Trace why a module is included in a bundle: show import chain from entry to module, highlight tree-shaking opportunities, detect circular dependencies

## Phase 25: Native Rendering Pipeline (236–245)

- [x] 236. Rust SSR for dynamic pages — Extend Rust SSR beyond static extraction to handle dynamic data: pre-render suspense boundaries in Rust, stream dynamic holes via RSC protocol
- [x] 237. RSC payload generation in Rust — Implement RSC serializer in Rust using `swc` for module analysis, eliminate Node.js dependency for RSC payload generation
- [x] 238. Rust HTML template engine — Native HTML template rendering in Rust for layout shells, `<head>` tag generation, script/link injection, replacing `renderToPipeableStream` for static parts
- [x] 239. Streaming HTML transformer — Rust-native streaming HTML transformer for post-processing SSR output: inject metadata, patch `<head>`, insert RSC bootstrap script, handle backpressure
- [x] 240. React DOM string renderer in Rust — Custom React DOM-to-HTML-string renderer in Rust for server-only components, bypass V8 for pure server rendering, streaming output
- [x] 241. Hybrid SSR orchestration — Intelligent routing of SSR: static parts → Rust renderer, dynamic parts → Node.js React, merge streams with proper ordering and suspense boundary handling
- [x] 242. RSC client deserializer in Rust — Native RSC payload deserialization for edge runtime, eliminate need for JavaScript RSC client on edge, faster cold starts
- [x] 243. PPR (Partial Prerendering) — Pre-render static shell of every page at build time via Rust SSR, serve instantly from edge cache, fill dynamic holes via RSC streaming on client
- [x] 244. SSR profiling in Rust — Per-component render time breakdown in Rust SSR, flamegraph generation, identify slow server components, integration with dev overlay
- [x] 245. Native hydration script generator — Rust-generated hydration script with minimal JS payload, only includes React runtime + component references, no framework boilerplate

## Phase 26: Data & State Advanced (246–255)

- [x] 246. `useInfiniteQuery` hook — Infinite scroll data hook with cursor-based pagination, bidirectional scroll, prefetch next page, integration with `cachedFetch` for SSR hydration
- [x] 247. `usePaginatedQuery` hook — Offset/limit pagination hook with page state, total count, prefetch adjacent pages, URL-synced page state for shareable links
- [x] 248. Optimistic update framework — Declarative optimistic updates: `useMutation` with `onMutate` rollback, automatic cache reconciliation, conflict resolution for concurrent mutations
- [x] 249. Server-side query prefetching — `prefetchQuery()` in server components for hydrating client cache, `dehydrate()`/`hydrate()` for SSR→client state transfer, no waterfall
- [x] 250. Mutation queue — Queue concurrent mutations to same cache key, deduplicate identical mutations, rollback on failure, retry with exponential backoff
- [x] 251. Offline-first data layer — Service Worker integration for offline mutations, IndexedDB cache for `useSWR`, background sync when connection restored, conflict resolution
- [x] 252. Real-time data hooks — `useSubscription()` for WebSocket/SSE data streams, automatic reconnection, backpressure handling, integration with `useSWR` cache
- [x] 253. Selective cache invalidation — Fine-grained cache invalidation by query key pattern, `mutate('users/*')` wildcard invalidation, automatic invalidation on related mutations
- [x] 254. Cross-tab state synchronization — `BroadcastChannel` API for syncing cache and mutations across browser tabs, `pledgestack/state` store with cross-tab persistence
- [x] 255. Rust-backed data hooks — `useRustQuery()` hook calling Rust functions via NAPI with automatic caching, binary protocol for data transfer, zero JSON serialization overhead

## Phase 27: PSX Ecosystem & Integrations (256–270)

- [x] 256. SQLx compile-time queries — Full SQLx integration in `.ps` files: `query!` macro with compile-time SQL verification against database schema, `query_as!` for typed results
- [x] 257. Sea-ORM integration — Entity model generation from database schema, async CRUD operations in `.ps` files, migration generation, integration with PledgeStack API routes
- [x] 258. Redis integration — `pledge add redis` with connection pooling, pub/sub for real-time features, cache-aside pattern helpers, cluster mode support
- [x] 259. Rust auth helpers — `pledgestack/auth` Rust backend: Argon2 password hashing via `.ps` files, JWT signing/verification in Rust, session store in Redis/Postgres
- [x] 260. Rust image processing — `pledge add image` for server-side image manipulation: resize, crop, format conversion, EXIF stripping, all via native Rust in `.ps` files
- [x] 261. Rust PDF generation — `pledge add printpdf` for server-side PDF generation: HTML→PDF, invoice templates, report generation, streaming response for large PDFs
- [x] 262. Rust background jobs — `pledge add apalis` for background job queues: email sending, data processing, scheduled tasks, retry logic, monitoring dashboard
- [x] 263. Rust cron scheduler — `pledge add tokio-cron-scheduler` for recurring tasks: cleanup jobs, cache warming, report generation, timezone-aware scheduling
- [x] 264. Rust email sending — `pledge add lettre` for SMTP email sending, template rendering in Rust, attachment support, async delivery with retry
- [x] 265. Rust HTTP client — `pledge add reqwest` for outbound HTTP calls in `.ps` files: connection pooling, retry, timeout, streaming, TLS, HTTP/2 support
- [x] 266. Rust WebSocket server — `pledge add tokio-tungstenite` for WebSocket routes in `.ps` files: connection management, rooms, broadcast, ping/pong, rate limiting
- [x] 267. Rust file processing — `pledge add calamine` for Excel parsing, `pledge add rust_xlsxwriter` for Excel generation, CSV processing, all native speed
- [x] 268. Rust observability in PSX — `pledge add tracing` for structured logging in `.ps`/`.psx` files, OpenTelemetry spans for Rust functions, integration with PledgeStack tracing
- [x] 269. Rust crypto helpers — `pledge add aes-gcm` for encryption, `pledge add sha2` for hashing, `pledge add rand` for secure random, all in `.ps` files for security-sensitive operations
- [x] 270. Rust ML inference — `pledge add candle-core` or `pledge add ort` for on-device ML inference in `.ps` files: embeddings, classification, NLP, without Python dependency

## Phase 28: Edge & Serverless Advanced (271–280)

- [x] 271. Edge PSX support — Compile `.ps`/`.psx` Rust to WASM for edge runtime, WASM-based NAPI bindings, no native `.node` addon needed on edge platforms. `edge-psx.ts` with `generateWasmCargoConfig()`, `generateWasmBindings()`, `EdgeAdapter` class, `buildWasmModule()`, platform detection for Cloudflare/Vercel/Deno
- [x] 272. Edge KV integration — Unified KV API for Cloudflare KV, Vercel KV, Deno KV: `pledgestack/edge-kv` with consistent interface, automatic caching, TTL support. `edge-kv.ts` with `createKvAdapter()`, `KvAdapter` interface, L1 in-memory cache, batch operations, namespace support, `detectKvPlatform()`
- [x] 273. Edge Durable Objects — Cloudflare Durable Objects integration for stateful edge compute: real-time collaboration, presence, distributed locks. `edge-durable-objects.ts` with `generateDurableObject()`, `DurableObjectManager` class, WebSocket management, presence tracking, distributed locks, `generateWranglerConfig()`
- [x] 274. Edge streaming SSR — Stream SSR from edge runtime with RSC, partial prerendering at edge, dynamic data from edge KV/D1, sub-50ms TTFB globally. `edge-streaming-ssr.ts` with `EdgeSsrRenderer` class, `PprCache`, `createOptimizedStream()`, `measureTtfb()`, dynamic hole filling
- [x] 275. Edge middleware in Rust — `.ps` middleware files compiled to WASM for edge runtime, native-speed request processing at edge, no Node.js cold start. `edge-middleware.ts` with `MiddlewareChain`, `createCorsMiddleware()`, `createRateLimitMiddleware()`, `createAuthMiddleware()`, `createGeoRedirectMiddleware()`, WASM middleware code generation
- [x] 276. Lambda PSX support — AWS Lambda layer for `.node` addons, ARM64 + x86_64 support, provisioned concurrency for Rust addon warm cache, snapstart compatibility. `lambda-psx.ts` with `generateLayerStructure()`, `generateSamTemplate()`, `generateLambdaCargoConfig()`, `checkSnapstartCompatibility()`, `generatePrewarmScript()`
- [x] 277. Edge cache invalidation — Global cache invalidation via Cloudflare Queue, Vercel Edge Config webhooks, Deno KV watch, multi-region cache sync. `edge-cache-invalidation.ts` with `CacheInvalidationManager` class, tag-based invalidation, event tracking, multi-platform propagation
- [x] 278. Edge geo-personalization — `geo()` server utility for country/region/city from edge headers, automatic locale detection, geo-based A/B testing, content localization. `edge-geo.ts` with `geo()`, `detectPsxLocale()`, `geoAbTest()`, `getLocalizationConfig()`, continent detection, RTL support
- [x] 279. Serverless PSX cold start optimization — Lazy-load `.node` addons on first request, pre-warm critical paths, minimize Lambda initialization, sub-100ms cold start with Rust. `serverless-cold-start.ts` with `ColdStartOptimizer` class, `createLazyAddon()`, `generateInitScript()`, metrics tracking, pre-warm support
- [x] 280. Multi-region deployment — Deploy PledgeStack to multiple regions with automatic routing, health-based failover, region-aware cache, data residency compliance. `multi-region.ts` with `MultiRegionManager` class, latency/weighted/geo/primary routing strategies, health checks, traffic shifting, `generateMultiRegionConfig()`

## Phase 29: Performance & Optimization Advanced (281–290)

- [x] 281. PSX bundle analysis — Per-module Rust binary size breakdown, identify large crates, suggest alternatives, track `.node` addon size across builds. `pledge analyze` CLI command with `--suggestions` flag, `analyzeBundle()` API, size delta tracking across builds, crate alternative suggestions (ureq vs reqwest, rusqlite vs sqlx, etc.)
- [x] 282. Rust addon tree shaking — Strip unused crate features at compile time, `cargo` feature flag optimization, remove unused `derive` macros, minimize `.node` size
- [x] 283. PSX lazy compilation — Defer `cargo build` until Rust function is first called, compile only used modules, reduce dev server startup time for large projects
- [x] 284. Binary protocol streaming — Stream PSXB-encoded data chunks from Rust to JS as they're produced, enable streaming Rust query results to client via RSC
- [x] 285. Rust connection pool sharing — Share database connection pool across all `.ps`/`.psx` modules, single pool per process, automatic pool sizing based on worker count
- [x] 286. PSX memory profiling — Track Rust addon memory usage per module, detect leaks, `pledge doctor` integration for memory diagnostics, heap snapshots
- [x] 287. NAPI call overhead benchmarking — Automated benchmarks for NAPI boundary crossing cost, track overhead per Rust function, optimize serialization for hot paths
- [x] 288. Rust→JS callback optimization — Efficient callback handling for Rust→JS callbacks (e.g., streaming handlers), reduce callback overhead, batch callback invocations
- [x] 289. PSX worker threads — Offload CPU-intensive Rust functions to worker threads, non-blocking execution for heavy computation, automatic thread pool sizing
- [x] 290. Production PSX profiling — Runtime profiling of Rust functions in production: call frequency, execution time, memory allocation, integration with OpenTelemetry

## Phase 30: Production Readiness & PSX Hardening (291–305)

- [x] 291. PSX error recovery — Graceful error handling when Rust addon fails to load: JS fallback implementations for all PSX integrations (SQLx→pg/mysql2, Redis→ioredis, Auth→argon2/bcryptjs/PBKDF2, Crypto→node:crypto, HTTP→fetch, Tracing→console-based, File→xlsx/CSV, Image→sharp), automatic detection via try/catch require pattern
- [x] 292. PSX health checks — `/api/health` includes Rust addon status: loaded modules, cargo version, crate versions, compilation status, addon file integrity hash
- [x] 293. PSX graceful degradation — When Rust addon compilation fails in production, serve stale compiled version, alert developers, continue serving requests from TypeScript fallback
- [x] 294. PSX audit logging — Log all Rust function calls with arguments (sanitized), execution time, caller route, for security audit and performance monitoring. `PsxAuditLogger` class with `createAuditedRust()` wrapper, `setAuditContext()` via AsyncLocalStorage for route tagging, sensitive key redaction, argument truncation, file rotation, sample rate support
- [x] 295. PSX security review — Security audit of NAPI bindings, verify no unsafe Rust code in user `.psx`/`.ps` files, sandbox Rust file system access, network access controls
- [x] 296. PSX CI/CD pipeline — GitHub Actions workflow for `.psx`/`.ps` projects: `cargo audit` for Rust vulnerabilities, `cargo clippy` for lint, cross-compile all targets, cache `cargo` registry. `.github/workflows/psx-ci.yml` with 6 jobs: cargo-audit, cargo-clippy, cargo-test, cargo-fmt, cross-compile (6 targets), bundle-analysis, vitest
- [x] 297. PSX Docker optimization — Multi-stage Docker build: Rust compilation stage + Node.js runtime stage, minimal final image with only `.node` addons + JS, <15MB with Rust
- [x] 298. PSX monitoring dashboard — Grafana dashboard template for PledgeStack + Rust: request rate, NAPI call latency, cargo build time, addon memory, cache hit rate. `monitoring-dashboard.ts` with `generateGrafanaDashboard()`, `generateAlertRules()`, `generatePrometheusMetrics()`, 9 dashboard panels, 4 alert rules
- [x] 299. PSX version compatibility — Semantic versioning for Rust workspace deps, breaking change detection across crate updates, `pledge add --check` for compatibility validation
- [x] 300. PSX production checklist — Automated `pledge doctor --production` checks: Rust toolchain version, Cargo.lock committed, no debug symbols, LTO enabled, addons stripped. 7 check functions: checkRustToolchain, checkCargoLock, checkLtoEnabled, checkDebugSymbols, checkAddonsStripped, checkNoDebugEnv, checkProductionEnv
- [x] 301. PSX rollback support — Atomic `.node` addon deployment: upload new version, atomic swap, instant rollback on error, blue-green deployment for Rust addons. `rollback.ts` with `RollbackManager` class, versioned addon storage, symlink/copy-based switching, health check after rollback, version history
- [x] 302. PSX canary deployment — Route percentage of traffic to new Rust addon version, compare error rates and latency, automatic rollback on regression. `canary.ts` with `CanaryManager` class, progressive rollout, health metrics, auto-rollback on error/latency spike, promote/rollback/terminate operations
- [x] 303. PSX integration tests — 80+ tests covering all render modules (rust-html, rust-ssr, rust-ssr-profiler, rust-rsc, rust-hydration, rust-html-transformer, rust-dom-renderer) and PSX integrations (Auth, Crypto, FileProcessor, Tracing, JobQueue, CronScheduler, ImageProcessor) using Vitest
- [x] 304. PSX load testing — `pledge bench --psx` load tests for Rust functions: requests/sec with NAPI overhead, compare Rust vs TypeScript equivalent, identify NAPI bottlenecks
- [x] 305. PSX documentation completeness — Complete API docs for all PSX features, Rust crate integration guides, migration path from pure TypeScript, production deployment guide, troubleshooting

## Success Metrics

| Metric | Target | Owner |
|--------|--------|-------|
| Dev server cold start | < 500ms | PledgePack |
| HMR feedback loop | < 50ms | PledgePack |
| First contentful paint | < 1s on 3G | PledgeStack |
| Route resolution time | < 1ms per route | PledgeStack |
| Memory per route in dev | < 2MB | PledgeStack |
| Production bundle (per route) | < 100KB gzipped | PledgePack |
| Docker image size | < 10MB | PledgeStack |
| Requests/sec (Rust server) | > 50,000 | PledgePack |
| Build time (100 routes) | < 2s | PledgePack |
| Test coverage | > 80% | PledgeStack |
| OWASP Top 10 coverage | 10/10 | PledgeStack |
| Security headers score (securityheaders.com) | A+ | PledgeStack |
| CSP coverage | 100% of routes | PledgeStack |
| Time to first byte (edge) | < 50ms | PledgeStack |
| Lighthouse performance score | > 95 | PledgeStack |
| Rust addon compile time (incremental) | < 5s | PledgeStack |
| NAPI boundary overhead | < 0.1ms per call | PledgeStack |
| Rust SSR vs Node.js SSR | 5x faster for static parts | PledgeStack |
| PSXB vs JSON serialization | 4x faster | PledgeStack |
| `.node` addon size (per module) | < 2MB stripped | PledgeStack |
| PSX cold start (first `cargo build`) | < 30s | PledgeStack |
| Edge PSX cold start (WASM) | < 100ms | PledgeStack |
