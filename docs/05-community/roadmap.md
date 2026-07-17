# PledgeStack Roadmap — 194 Goals Across 21 Phases (194 Complete)

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
