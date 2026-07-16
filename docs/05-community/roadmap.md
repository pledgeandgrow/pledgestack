# PledgeStack Goals

## North Star

Be the best full-stack React framework — familiar Next.js conventions, made better. Focus on developer experience, correctness, and clean architecture. Performance targets will come with PledgePack integration later.

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
- [ ] 19. Selective hydration — prioritize visible components
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

## Phase 6: Production Deployment & Runtime (47–54)

- [x] 47. Docker image — Minimal Rust binary + bundled JS for sub-10MB deployment images
- [ ] 48. `pledge serve` Rust HTTP server — Axum/Hyper-based production server with high throughput
- [ ] 49. Rust + JS interop layer — V8 isolate or Deno_core for executing server components from Rust
- [ ] 50. Rust static file server — Serve assets with proper cache headers, gzip/brotli compression
- [x] 51. Standalone output mode — Self-contained `.pledge/standalone/` directory with all deps bundled
- [x] 52. Health check endpoint — `/api/health` with readiness and liveness probes for Kubernetes
- [x] 53. Graceful shutdown — Drain in-flight requests on SIGTERM before closing server
- [ ] 54. Multi-process cluster mode — `pledge serve --workers N` for CPU-bound workloads

## Phase 7: Performance Optimization (55–62)

- [ ] 55. Content-hash build cache — Cache build outputs by hashing inputs (turbo-style remote cache)
- [ ] 56. Tree-shaking — Remove unused exports from production bundles via PledgePack
- [ ] 57. CSS code splitting — Extract per-route CSS chunks, inject only needed CSS per page
- [ ] 58. Asset pipeline — Image/font/static asset processing with content hashing and CDN-ready URLs
- [ ] 59. Source maps in production — Generate and serve source maps for debugging
- [ ] 60. Minification — Oxc-based minification for production bundles
- [ ] 61. Bundle analysis — `pledge analyze` with interactive treemap visualization
- [ ] 62. Remote cache server — Optional remote cache for CI/team cache sharing

## Phase 8: Testing & Quality (63–70)

- [x] 63. Unit test infrastructure — Vitest configured with per-package test setups
- [ ] 64. Integration test suite — Test framework end-to-end: route matching, SSR, API routes, middleware
- [ ] 65. E2E test suite — Playwright tests for playground app covering navigation, forms, API
- [ ] 66. Route snapshot tests — Snapshot SSR HTML output per route to catch regressions
- [ ] 67. Performance benchmarks — Automated benchmarks comparing requests/sec vs Next.js
- [ ] 68. Bundle size budget — Enforce max bundle size per route in CI
- [x] 69. Type safety audit — Zero `any` types across all packages, strict mode enforced
- [ ] 70. Lint rule coverage — Custom ESLint rules enforced in CI with zero warnings

## Phase 9: Ecosystem & Integrations (71–80)

- [x] 71. Plugin system — Hook into build, render, and server lifecycle via `plugins: []` in config
- [x] 72. Auth integration — Cookie/session-based auth helpers (`pledgestack/auth`)
- [x] 73. Database adapters — Prisma, Drizzle, Kysely integration examples and docs
- [x] 74. Image optimization — `pledgestack/image` component with responsive sizes, WebP/AVIF conversion
- [x] 75. Font optimization — `pledgestack/font` with automatic subsetting and preloading
- [x] 76. MDX support — `@pledgestack/mdx` package for Markdown/MDX pages and content
- [x] 77. OG image generation — `pledgestack/og` for dynamic OpenGraph image generation with Satori
- [x] 78. Sitemap generation — Automatic `sitemap.xml` generation from route tree at build time
- [x] 79. RSS feed generation — `generateFeed()` API for blog/content sites
- [x] 80. WebSocket support — Real-time routes with `ws` protocol in `route.ts`

## Phase 10: Edge & Serverless (81–86)

- [x] 81. Cloudflare Workers adapter — Deploy PledgeStack apps to Cloudflare Workers
- [x] 82. Vercel Edge adapter — Deploy to Vercel Edge Functions
- [x] 83. Deno Deploy adapter — Deploy to Deno Deploy
- [x] 84. AWS Lambda adapter — Serverless deployment with Lambda + API Gateway
- [x] 85. Netlify adapter — Deploy to Netlify Functions
- [x] 86. Edge-compatible bundle — PledgePack emits edge-safe bundle without Node.js builtins

## Phase 11: Observability & Debugging (87–92)

- [x] 87. Structured logging — `pledgestack/logger` with request-scoped logs and log levels
- [x] 88. Request tracing — OpenTelemetry integration for distributed tracing
- [ ] 89. Dev profiler — `pledgestack dev --profile` with per-route render time breakdown
- [x] 90. Cache inspector — Dev toolbar panel showing cached fetches, revalidation events, tags
- [x] 91. Route inspector — Dev toolbar panel showing matched route, params, layout chain, middleware
- [ ] 92. Error source maps — Production errors mapped back to original source via source maps

## Phase 12: Documentation & Community (93–96)

- [ ] 93. Interactive tutorial — Step-by-step guide with live code execution in the browser
- [ ] 94. API reference auto-generation — Extract API docs from TypeScript source with TypeDoc
- [x] 95. Migration guide — Next.js → PledgeStack migration documentation with codemods
- [ ] 96. Example gallery — 20+ examples covering auth, databases, i18n, streaming, edge, etc.

## Phase 13: Security Hardening (97–114)

- [x] 97. Strict Content Security Policy — Auto-generated nonce-based CSP headers per request, blocking inline scripts by default
- [x] 98. Security headers middleware — Automatic `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` headers on all responses
- [x] 99. XSS prevention layer — Automatic output escaping audit, `dangerouslySetInnerHTML` lint rule, DOMPurify integration for user content
- [x] 100. CSRF protection for server actions — Double-submit cookie + `Origin`/`Sec-Fetch-Site` validation on all state-changing requests
- [x] 101. Open redirect prevention — Validate all redirect URLs against an allowlist, block absolute URLs to external hosts in middleware
- [x] 102. Path traversal protection — Sandbox file access in module loader, reject `..` in route paths, validate all `fs` calls against `rootDir`
- [x] 103. Prototype pollution protection — Deep-merge sanitization, `Object.create(null)` for parsed JSON, block `__proto__` keys in query params and body
- [ ] 104. ReDoS prevention — Safe regex validation on all user inputs, timeout-based regex execution, detect catastrophic backtracking patterns at build time
- [x] 105. Clickjacking protection — `X-Frame-Options: DENY` by default, `frame-ancestors` in CSP, per-route override for embeddable pages
- [x] 106. MIME type sniffing prevention — `X-Content-Type-Options: nosniff` on all responses, correct `Content-Type` for static assets
- [x] 107. DNS rebinding protection — Validate `Host` header against allowlist in dev server, bind to `127.0.0.1` by default
- [ ] 108. Subresource Integrity (SRI) — Auto-generate `integrity` attributes for all external scripts and stylesheets in production
- [ ] 109. Trusted Types enforcement — CSP `require-trusted-types` directive, framework-level Trusted Types policy for all DOM sinks
- [ ] 110. Cross-origin isolation — `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` opt-in for `SharedArrayBuffer` support
- [ ] 111. CORP/COEP middleware — Per-route cross-origin resource policy headers, automatic `Cross-Origin-Resource-Policy: same-site` for static assets
- [ ] 112. Referrer policy control — Configurable `Referrer-Policy` per route, default `strict-origin-when-cross-origin`
- [ ] 113. Permission policy framework — `Permissions-Policy` header management, disable unused browser APIs (camera, microphone, geolocation) by default
- [x] 114. Security header validation in CI — Automated test asserting all security headers present and correctly configured on every route

## Phase 14: Authentication & Authorization (115–124)

- [ ] 115. OAuth 2.1 / OIDC integration — Built-in OAuth provider support with PKCE, state validation, and automatic token refresh
- [x] 116. Session management — Secure server-side sessions with `httpOnly`, `Secure`, `SameSite=Lax` cookies, configurable session expiry and rotation
- [ ] 117. JWT security — `jose`-based JWT signing/verification with RS256/ES256, short-lived access tokens + refresh tokens, `alg` confusion prevention
- [ ] 118. TOTP / 2FA support — Built-in TOTP enrollment, verification, and backup codes in `@pledgestack/auth`
- [ ] 119. Passkey / WebAuthn support — Passwordless authentication with platform authenticators, conditional UI mediation
- [ ] 120. Role-based access control (RBAC) — Declarative route-level `roles` config, middleware-level enforcement, `usePermissions()` hook
- [ ] 121. Attribute-based access control (ABAC) — Policy-based authorization with context-aware rules (IP, time, device, risk score)
- [ ] 122. API key management — Scoped API keys with rate limits, rotation, and revocation for programmatic access
- [ ] 123. SAML 2.0 enterprise SSO — Service provider metadata generation, signed assertions, IdP-initiated and SP-initiated flows
- [x] 124. Auth audit log — Immutable log of all auth events (login, logout, failed attempts, token refresh, password changes)

## Phase 15: Performance & Optimization (125–140)

- [ ] 125. React 19 concurrent rendering — Optimize `useDeferredValue`, `useTransition`, and `Suspense` for non-blocking UI updates
- [x] 126. Streaming SSR with backpressure — Pipe `renderToPipeableStream` directly to HTTP response with proper backpressure handling
- [ ] 127. Edge cache strategies — Stale-while-revalidate at edge with `Cache-Control` + `stale-while-revalidate` + `CDN-Cache-Control` headers
- [x] 128. Route-level lazy loading — Automatic dynamic import for non-critical routes with prefetch on hover/viewport
- [ ] 129. Critical CSS inlining — Extract above-the-fold CSS per route, inline in `<style>` tag, defer remaining CSS
- [ ] 130. Resource hints automation — Auto-generate `<link rel="preload">` for fonts/images, `<link rel="prefetch">` for likely-next routes, `<link rel="preconnect">` for external origins
- [ ] 131. Brotli compression — Brotli (level 11) for text assets in production, configurable compression level per content type
- [x] 132. ETag generation — Auto-generate weak ETags for SSR pages, `304 Not Modified` handling for cached responses
- [ ] 133. Database connection pooling — Built-in connection pool with configurable min/max/idle timeout, health checks, and graceful drain
- [ ] 134. Query memoization — Automatic deduplication of identical data fetches within a single request via React `cache()`
- [ ] 135. Image lazy loading + blur placeholder — Native `loading="lazy"` + `fetchpriority`, LQIP blur-up placeholder, responsive `srcset` auto-generation
- [ ] 136. Font display optimization — `font-display: swap` by default, `size-adjust` for fallback fonts, preload critical fonts with `crossorigin`
- [ ] 137. Service worker caching — Workbox-style runtime caching strategies (cache-first, network-first, stale-while-revalidate) with offline support
- [ ] 138. HTTP/2 server push — Optional `Link: <...>; rel=preload; as=...` headers for critical assets (deprecated but useful for HTTP/2 environments)
- [ ] 139. Bundle size budget enforcement — Per-route bundle size limits in CI, fail build if budget exceeded, suggest which imports to split
- [ ] 140. Web Vitals monitoring — Automatic CLS, LCP, FID, INP, TTFB reporting to analytics, route-level performance attribution

## Phase 16: Supply Chain & Dependency Security (141–148)

- [x] 141. Dependency audit CI — Automated `pnpm audit` on every PR, block merge on critical/high vulnerabilities
- [ ] 142. Software Bill of Materials (SBOM) — Generate CycloneDX/SPDX SBOM on every build, publish alongside release artifacts
- [ ] 143. License compliance check — Scan all dependencies for license compatibility, fail build on GPL/AGPL in production deps
- [ ] 144. Pinned dependency versions — All `@pledgestack/*` packages use exact versions for internal deps, `pnpm-lock.yaml` enforced in CI
- [ ] 145. Provenance attestation — SLSA Level 3 build provenance for all `@pledgestack/*` npm publishes, verifiable with `npm audit signatures`
- [ ] 146. Sigstore signing — All npm packages signed with Sigstore (`npm publish --provenance`), `cosign` verification in install script
- [ ] 147. Dependency allowlist — Configurable allowlist for third-party packages, block unauthorized transitive deps at install time
- [ ] 148. Secret scanning in CI — TruffleHog/Gitleaks scan on every PR, block merge on detected secrets in source or lockfiles

## Phase 17: Privacy & Compliance (149–158)

- [ ] 149. GDPR compliance helpers — Consent management API, `Right to be Forgotten` data deletion utility, cookie consent banner component
- [ ] 150. CCPA compliance — "Do Not Sell My Personal Information" endpoint, privacy policy generator, data category labeling
- [ ] 151. PII redaction middleware — Automatic redaction of sensitive fields (SSN, email, phone) from logs and error reports
- [ ] 152. Data retention policies — Configurable TTL for session data, audit logs, and cached responses with automatic purge
- [ ] 153. Encryption at rest — AES-256-GCM encryption for session store, optional field-level encryption for database adapters
- [ ] 154. Encryption in transit — Enforce HTTPS with HSTS preload, automatic `http://` → `https://` redirect, TLS 1.2+ minimum
- [ ] 155. Cookie consent framework — Granular consent categories (necessary, analytics, marketing), `SameSite=None` only with consent
- [ ] 156. Data export endpoint — User data export in machine-readable format (JSON/CSV) for GDPR/CCPA compliance
- [ ] 157. Privacy-by-default config — All analytics, telemetry, and tracking disabled by default, explicit opt-in required
- [ ] 158. Compliance documentation generator — Auto-generate data flow diagrams, processing records, and DPIA templates from config

## Phase 18: Observability & Monitoring (159–168)

- [ ] 159. Structured JSON logging — `@pledgestack/logger` with request-scoped context, log levels, redaction, and OpenTelemetry-compatible output
- [ ] 160. Distributed tracing — OpenTelemetry integration with auto-instrumentation for HTTP, React render, database, and fetch calls
- [x] 161. Metrics export — Prometheus-compatible `/metrics` endpoint with request count, latency histogram, error rate, and cache hit ratio
- [ ] 162. Error tracking integration — Sentry/Bugsnag adapter, automatic source map upload, request context enrichment, PII scrubbing
- [x] 163. Health check endpoint — `/api/health` with readiness (deps connected) and liveness (event loop responsive) probes for Kubernetes
- [x] 164. Graceful shutdown — Drain in-flight requests on `SIGTERM`, close DB pools, flush logs, exit within configurable timeout
- [x] 165. Request ID propagation — Auto-generate `X-Request-Id` header, propagate to all logs, traces, and downstream fetch calls
- [ ] 166. Slow request detection — Configurable threshold logging for requests exceeding N ms, with route attribution and stack trace
- [ ] 167. Cache hit/miss logging — Debug-level logging for cache decisions (hit, miss, stale, revalidate) with cache key and TTL
- [ ] 168. Real-time dev profiler — `pledgestack dev --profile` with flamegraph per route, React component render time, and data fetch waterfall

## Phase 19: Developer Safety Net (169–178)

- [x] 169. Input validation framework — Zod-based request body/query/params validation with automatic TypeScript inference and error responses
- [x] 170. Output serialization safety — Automatic JSON sanitization to prevent XSS in API responses, remove `__proto__` and constructor keys
- [x] 171. Rate limiting middleware — Token bucket / sliding window rate limiter with per-IP, per-user, and per-route configuration
- [ ] 172. Bot detection — Heuristic bot detection (User-Agent, request patterns, CAPTCHA challenge) for form submissions and auth endpoints
- [ ] 173. Brute force protection — Exponential backoff on failed auth attempts, account lockout after N failures, CAPTCHA after M attempts
- [x] 174. Secure defaults config — `pledgestack create` generates apps with security headers, CSP, HTTPS redirect, and secure cookies enabled by default
- [ ] 175. Security lint rules — ESLint plugin rules for `no-eval`, `no-implied-eval`, `no-new-func`, `react/no-danger`, and custom PledgeStack security rules
- [x] 176. Type-safe environment variables — `pledgestack generate-env-types` with Zod schema validation, fail fast on missing/invalid env at boot
- [ ] 177. Error boundary telemetry — Automatic error capture in `error.tsx` boundaries with sanitized stack traces and user context
- [ ] 178. Development security warnings — Console warnings for insecure patterns (HTTP in production, missing CSRF, loose CORS) in dev mode

## Phase 20: Edge & Runtime Security (179–186)

- [ ] 179. Edge secrets management — Integration with Cloudflare Secrets, Vercel Edge Config, and Deno KV for secure secret access at edge
- [ ] 180. Edge rate limiting — Distributed rate limiting using Cloudflare Durable Objects, Vercel Edge Config, or Upstash Redis
- [ ] 181. Edge auth validation — JWT verification at edge without origin round-trip, JWKS caching with automatic rotation
- [ ] 182. Edge CSP generation — Per-request nonce generation and CSP header injection in edge adapters
- [ ] 183. Edge geo-restriction — Block or allowlist requests by country/region using `CF-IPCountry` or `X-Vercel-IP-Country` headers
- [ ] 184. Edge bot mitigation — Edge-level bot detection before origin round-trip, challenge pages for suspicious requests
- [ ] 185. Cold start optimization — Minimize edge bundle size, lazy-load non-critical modules, pre-warm critical paths
- [ ] 186. Edge timeout enforcement — Configurable request timeout at edge with `504 Gateway Timeout` response, prevent long-running DoS

## Phase 21: API & Data Security (187–196)

- [x] 187. API route schema validation — Declarative `schema` export in `route.ts` with automatic request validation and `400` on invalid input
- [ ] 188. API response typing — Type-safe response helpers ensuring `Content-Type` and body match, prevent MIME confusion attacks
- [ ] 189. SQL injection prevention — Parameterized query enforcement in DB adapters, detect string concatenation in SQL at lint time
- [ ] 190. NoSQL injection prevention — Sanitize MongoDB/operator queries, block `$where`, `$function`, and `$expr` from user input
- [x] 191. SSRF prevention — Validate all outbound `fetch()` URLs against allowlist, block private IP ranges (RFC 1918), metadata endpoints (`169.254.169.254`)
- [x] 192. Request body size limit — Configurable max body size (default 1MB), `413 Payload Too Large` on exceed, streaming for large uploads
- [x] 193. File upload security — Magic number validation, file size limit, virus scan hook, sanitize filename, store outside web root
- [ ] 194. GraphQL security — Query depth limiting, query complexity analysis, introspection disabled in production, persisted queries
- [ ] 195. WebSocket authentication — Authenticate WebSocket upgrade request, reject unauthenticated connections, per-connection rate limit
- [ ] 196. API key rotation — Automatic API key rotation with grace period, old key invalidation, notification on key usage from new IP

## Success Metrics

| Metric | Target |
|--------|--------|
| Dev server cold start | < 500ms |
| HMR feedback loop | < 50ms |
| First contentful paint | < 1s on 3G |
| Route resolution time | < 1ms per route |
| Memory per route in dev | < 2MB |
| Production bundle (per route) | < 100KB gzipped |
| Docker image size | < 10MB |
| Requests/sec (Rust server) | > 50,000 |
| Build time (100 routes) | < 2s |
| Test coverage | > 80% |
| OWASP Top 10 coverage | 10/10 |
| Security headers score (securityheaders.com) | A+ |
| CSP coverage | 100% of routes |
| Time to first byte (edge) | < 50ms |
| Lighthouse performance score | > 95 |
