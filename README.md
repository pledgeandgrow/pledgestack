# PledgeStack

[![npm version](https://img.shields.io/npm/v/pledgestack.svg)](https://www.npmjs.com/package/pledgestack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A full-stack React framework — like Next.js, but powered by PledgePack (Rust+Zig bundler) for maximum build performance.

## Install

```bash
npm install pledgestack
# or
pnpm add pledgestack
```

The CLI command is `pledge` (not `pledgestack`). After installing, use:

```bash
npx pledge dev      # Start dev server
npx pledge build    # Build for production
npx pledge start    # Start production server
```

## Vision

PledgeStack aims to be a production-grade full-stack React framework that uses PledgePack (a Rust+Zig bundler published on npm) for dramatically faster builds, HMR, and dev server. It follows familiar Next.js conventions (app directory, file-based routing, RSC, SSR/SSG/ISR) while being faster, leaner, and more opinionated.

## Features (Implemented)

- **File-based routing** — App directory with `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- **Server-Side Rendering (SSR)** — Server-rendered pages with layout chains, error boundaries, and Suspense loading states
- **Static Site Generation (SSG)** — Pre-render pages at build time with `generateStaticParams`
- **React Server Components (RSC)** — `react-server-dom-webpack` integration with streaming and client manifests
- **API Routes** — File-based API handlers with `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- **Middleware** — `middleware.ts` convention with redirect, rewrite, headers, and short-circuit
- **Edge Runtime** — Edge handler for Cloudflare Workers, Vercel Edge, Deno Deploy
- **HMR** — Dev server file watching with cache invalidation and module reloading
- **Tailwind CSS** — Built-in Tailwind v4 + PostCSS pipeline
- **Server Utilities** — `cookies()`, `headers()`, `searchParams()`, `params()`, `redirect()`, `notFound()`, `after()`, `connection()`, `draftMode()`
- **Data Fetching** — `cachedFetch()` with `force-cache`, `no-store`, `isr` modes, tag-based revalidation
- **Metadata API** — `generateMetadata()` export with OpenGraph, Twitter cards, canonical, icons
- **Client Routing** — `useRouter()`, `Link` with hover prefetch, scroll restoration, `replace`/`scroll` options
- **TypeScript** — First-class TypeScript with project references and end-to-end type safety
- **PledgePack** — Rust+Zig bundler with dev server, HMR, Oxc transforms, JS plugins (Boa engine), and built-in test runner ([npm: pledgepack](https://www.npmjs.com/package/pledgepack)) — used to build user apps, not the framework itself
- **Rust Native Addons** — 8 NAPI addon crates (`rust-html`, `rust-ssr`, `rust-rsc`, `rust-html-transformer`, `rust-dom-renderer`, `rust-rsc-deserializer`, `rust-ssr-profiler`, `rust-hydration`) compiled via Cargo workspace, with automatic JS fallback when not compiled
- **PSX Integrations with JS Fallbacks** — 15 Rust crate wrappers (SQLx, Redis, Auth, Image, PDF, Jobs, Cron, Email, HTTP, WebSocket, File Processing, Tracing, Crypto, ML) that gracefully degrade to Node.js packages when native addons are unavailable
- **PSX Audit Logging** — `PsxAuditLogger` wraps Rust calls with sanitized args, execution time, route tagging via AsyncLocalStorage, file rotation, and sample rate support
- **PSX CI/CD Pipeline** — GitHub Actions workflow with `cargo audit`, `cargo clippy`, `cargo fmt`, cross-compile for 6 targets, bundle analysis, and Vitest
- **PSX Production Checklist** — `pledge doctor --production` checks Rust toolchain, Cargo.lock, LTO, debug symbols, stripped addons, env vars
- **PSX Bundle Analysis** — `pledge analyze` CLI with per-module `.node` size breakdown, crate alternative suggestions, and build-to-build size tracking
- **Test Suite** — 100+ tests covering all render modules, PSX integrations, audit logging, and bundle analysis using Vitest

## Monorepo Structure

```
pledgestack/
├── packages/
│   ├── shared/              # Shared types, config, constants (private — bundled into CLI)
│   ├── core/                # Framework core — routing, rendering, FS scanner (private)
│   ├── server/              # Node.js + Edge server runtime (private)
│   ├── client/              # Client-side hydration + routing (private)
│   ├── auth/                # Authentication & security helpers (private)
│   ├── state/               # State management (private)
│   ├── api/                 # API route utilities (private)
│   ├── a11y/                # Accessibility audit tools (private)
│   ├── overlay/             # Error overlay & DevTools (private)
│   ├── seo/                 # SEO & structured data (private)
│   ├── sitemap/             # Sitemap generation (private)
│   ├── image/               # Image optimization (private)
│   ├── font/                # Font optimization (private)
│   ├── mdx/                 # MDX support (private)
│   ├── og/                  # OpenGraph image generation (private)
│   ├── rss/                 # RSS feed generation (private)
│   ├── ws/                  # WebSocket support (private)
│   ├── adapters/            # Cloudflare, Vercel, Deno, AWS, Netlify adapters (private)
│   ├── privacy/             # GDPR/CCPA compliance, PII redaction, encryption, consent (private)
│   ├── cli/                 # CLI tool — published as `pledgestack` on npm
│   ├── vscode-extension/    # VS Code extension — highlighting, IntelliSense
│   └── create-pledge-app/   # Scaffolding CLI for new PledgeStack apps
├── apps/
│   └── playground/          # Example app for development
├── examples/                # Starter templates (blog, tailwindcss, auth, api-routes)
├── test/                    # Test suites (unit, integration, e2e)
├── scripts/                 # Release, benchmark, workspace check scripts
├── docs/                    # Numbered documentation directories
├── pledge.config.ts         # Framework config (defineConfig from 'pledgestack')
└── pnpm-workspace.yaml
```

> **PledgePack** is installed from npm (`pledgepack@^0.1.8`), not as a workspace package. CLI command: `pledge`.
>
> Only the `pledgestack` package (CLI) is published to npm. All sub-packages are bundled into it via esbuild and marked as private. The framework itself uses esbuild to bundle the CLI package for npm publish — PledgePack is used to bundle **user apps** (the projects created with `pledge create`).

## Getting Started

```bash
# Create a new project
npx pledge create my-app
cd my-app
npm install

# Start dev server
npx pledge dev

# Build for production
npx pledge build

# Start production server
npx pledge start
```

## App Directory Conventions

```
app/
├── layout.tsx          # Root layout (wraps all pages)
├── page.tsx            # Home page (/)
├── about/
│   └── page.tsx        # About page (/about)
├── blog/
│   ├── layout.tsx      # Blog section layout
│   ├── page.tsx        # Blog listing (/blog)
│   └── [slug]/
│       └── page.tsx    # Blog post (/blog/:slug)
├── api/
│   └── hello/
│       └── route.ts    # API endpoint (/api/hello)
├── loading.tsx         # Loading UI (Suspense fallback)
├── error.tsx           # Error boundary (per-segment)
└── not-found.tsx       # 404 page
```

---

## Roadmap — 305 Goals Across 30 Phases (253 Complete)

> Full roadmap with progress tracking: [docs/05-community/roadmap.md](docs/05-community/roadmap.md)

### Phase 1: Core Runtime (1–10) ✅
Install, dev server, SSR, API routes, middleware, 404, HMR, server utilities — **complete**.

### Phase 2: Routing & Conventions (11–20) ✅
`head.tsx`, `template.tsx`, Pledge System, Server Actions, RSC streaming, parallel/intercepting routes, route groups, selective hydration, page transitions — **complete**.

### Phase 3: Data & Caching (21–28) ✅
Request context, revalidation, `generateStaticParams`, route config, ISR, RSC data fetching, cookie variants, fetch cache — **complete**.

### Phase 4: Developer Experience (29–38) ✅
Fast Refresh, error overlay, `create`/`info`/`doctor` commands, env vars, ESLint plugin, CI, VS Code extension, dev toolbar — **complete**.

### Phase 5: Framework Maturity (39–46) ✅
`loading.tsx`, `error.tsx`, middleware API, streaming responses, static export, custom error pages, i18n, route prefetching — **complete**.

### Phase 6: Framework API Completeness (47–58) ✅
Docker, standalone output, health checks, graceful shutdown, `redirect()`, `notFound()`, `global-error.tsx`, `instrumentation.ts`, `after()`, `connection()`, `viewport` export, middleware `matcher` — **complete**.

### Phase 7: Framework APIs (59–66) ✅
`useActionState`, `server-only`/`client-only` markers, per-route runtime config, Link prefetch strategies, `revalidateTag`/`revalidatePath` top-level, `unstable_cache` expose, route handler methods, `headers()`/`cookies()` mutation — **complete**.

### Phase 8: Testing & Quality (67–74) ✅
Unit tests, integration tests, E2E (Playwright), snapshot tests, benchmarks, bundle size budget, type safety audit, lint rule coverage — **complete**.

### Phase 9: Ecosystem & Integrations (75–84) ✅
Plugin system, auth, database adapters, image/font optimization, MDX, OG images, sitemaps, RSS, WebSocket — **complete**.

### Phase 10: Edge & Serverless (85–90) ✅
Cloudflare, Vercel Edge, Deno Deploy, AWS Lambda, Netlify, edge bundles — **complete**.

### Phase 11: Observability & Debugging (91–95) ✅
Structured logging, OpenTelemetry, dev profiler, cache inspector, route inspector — **complete**.

### Phase 12: Documentation & Community (96–99) ✅
Interactive tutorial, API reference auto-generation (TypeDoc), migration guide, example gallery (20+ examples) — **complete**.

### Phase 13: Security Hardening (100–116) ✅
CSP, security headers, XSS, CSRF, path traversal, clickjacking, MIME, DNS rebinding, ReDoS, Trusted Types, cross-origin isolation, CORP/COEP, referrer policy, permissions policy — **complete**.

### Phase 14: Authentication & Authorization (117–126) ✅
OAuth 2.1, session management, JWT, TOTP/2FA, WebAuthn, RBAC, ABAC, API keys, SAML SSO, audit log — **complete**.

### Phase 15: Performance & Optimization (127–138) ✅
Concurrent rendering, streaming SSR, edge cache, lazy loading, resource hints, ETag, connection pooling, query memo, image/font optimization, bundle budgets, Web Vitals — **complete**.

### Phase 16: Supply Chain & Dependency Security (139–146) ✅
Dependency audit CI, SBOM, license compliance, pinned deps, provenance attestation, Sigstore signing, dependency allowlist, secret scanning — **complete**.

### Phase 17: Privacy & Compliance (147–156) ✅
GDPR, CCPA, PII redaction, encryption, consent, data retention, compliance docs — **complete**.

### Phase 18: Observability & Monitoring (157–166) ✅
Structured JSON logging, distributed tracing, metrics export, error tracking (Sentry/Bugsnag), health check, graceful shutdown, request ID, slow request detection, cache logging, real-time dev profiler — **complete**.

### Phase 19: Developer Safety Net (167–176) ✅
Input validation, output serialization, rate limiting, bot detection, brute force protection, secure defaults, security lint rules, env types, error boundary telemetry, dev security warnings — **complete**.

### Phase 20: Edge & Runtime Security (177–184) ✅
Edge secrets, rate limiting, auth validation, CSP generation, geo-restriction, bot mitigation, cold start optimization, timeout enforcement — **complete**.

### Phase 21: API & Data Security (185–194) ✅
Schema validation, response typing, SQL/NoSQL injection prevention, SSRF, body limits, file uploads, GraphQL security, WS auth, API key rotation — **complete**.

### Phase 22: PSX Format Foundation (195–205) ✅
Rust workspace management, crate auto-detection, batch API, binary protocol (PSXB), Rust SSR, fallback support — **complete**.

### Phase 23: PSX Format Maturity (206–220) — In Progress
Source maps ✅, HMR ✅, error mapping ✅, `println!` bridge ✅, cargo profiles ✅, test runner ✅, crate pinning ✅, lint rules ✅, cross-compilation ✅, dead code elimination ✅, fmt integration ✅. Remaining: syn-based parser (#206), VS Code extension (#209), PSX debugger (#212), incremental compilation cache (#214).

### Phase 24: Developer Experience & Tooling (221–235) ✅
Route types, type-safe navigation, path aliases, env-aware config, route conflict detection, storybook, playground, codemods, plugin docs, dev overlay, upgrade command, streaming metadata, `pledge clean`, `pledge init`, `pledge why` — **complete**.

### Phase 25: Native Rendering Pipeline (236–245) ✅
Rust SSR for dynamic pages, RSC payload generation in Rust, HTML template engine, streaming HTML transformer, React DOM string renderer in Rust, hybrid SSR orchestration, RSC client deserializer in Rust, PPR via Rust SSR, SSR profiling with flamegraphs, native hydration script generator — **complete**.

### Phase 26: Data & State Advanced (246–255) ✅
`useInfiniteQuery`, `usePaginatedQuery`, optimistic updates, server-side prefetching, mutation queue, offline-first data layer, real-time `useSubscription()`, selective cache invalidation, cross-tab sync, Rust-backed `useRustQuery()` — **complete**.

### Phase 27: PSX Ecosystem & Integrations (256–270) ✅
SQLx compile-time queries, Sea-ORM integration, Redis integration, Rust auth helpers (Argon2/JWT), Rust image processing, Rust PDF generation, Rust background jobs (apalis), Rust cron scheduler, Rust email sending (lettre), Rust HTTP client (reqwest), Rust WebSocket server, Rust file processing (Excel/CSV), Rust observability (tracing/OpenTelemetry), Rust crypto helpers (AES-GCM/SHA-256), Rust ML inference (candle-core/ort) — **complete**.

## License

MIT © 2025 PledgeStack Contributors
