# Changelog

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
- 194/194 goals complete across 21 phases
