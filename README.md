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
- **Server Utilities** — `cookies()`, `headers()`, `searchParams()`, `params()`
- **Data Fetching** — `cachedFetch()` with `force-cache`, `no-store`, `isr` modes, tag-based revalidation
- **Metadata API** — `generateMetadata()` export with OpenGraph, Twitter cards, canonical, icons
- **Client Routing** — `useRouter()`, `Link` with hover prefetch, scroll restoration, `replace`/`scroll` options
- **TypeScript** — First-class TypeScript with project references and end-to-end type safety
- **PledgePack** — Rust+Zig bundler with dev server, HMR, Oxc transforms, WASM plugins, and built-in test runner ([npm: pledgepack](https://www.npmjs.com/package/pledgepack))

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
│   ├── cli/                 # CLI tool — published as `pledgestack` on npm
│   ├── vscode-extension/    # VS Code extension — highlighting, IntelliSense
│   └── create-pledge-app/   # Scaffolding CLI for new PledgeStack apps
├── apps/
│   └── playground/          # Example app for development
├── examples/                # Starter templates (blog, tailwindcss, auth, api-routes)
├── test/                    # Test suites (unit, integration, e2e)
├── scripts/                 # Release, benchmark, workspace check scripts
├── docs/                    # Numbered documentation directories
├── pledge.config.ts         # PledgePack build config (defineConfig from 'pledge')
└── pnpm-workspace.yaml
```

> **PledgePack** is installed from npm (`pledgepack@^0.1.1`), not as a workspace package. CLI command: `pledge`.
>
> Only the `pledgestack` package (CLI) is published to npm. All sub-packages are bundled into it via esbuild and marked as private.

## Getting Started

```bash
# Install dependencies
pnpm install

# Run the playground in dev mode
cd apps/playground
pledgestack dev

# Build for production
pledgestack build

# Start production server
pledgestack start
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

## Roadmap — 196 Goals to Production

> Full roadmap with progress tracking: [docs/05-community/roadmap.md](docs/05-community/roadmap.md)

### Phase 1: Core Runtime (1–10) ✅
Install, dev server, SSR, API routes, middleware, 404, HMR, server utilities — **complete**.

### Phase 2: Routing & Conventions (11–20)
`head.tsx`, `template.tsx`, Pledge System, Server Actions, RSC streaming, parallel/intercepting routes, route groups, selective hydration, page transitions — **9/10 complete**.

### Phase 3: Data & Caching (21–28) ✅
Request context, revalidation, `generateStaticParams`, route config, ISR, RSC data fetching, cookie variants, fetch cache — **complete**.

### Phase 4: Developer Experience (29–38) ✅
Fast Refresh, error overlay, `create`/`info`/`doctor` commands, env vars, ESLint plugin, CI, VS Code extension, dev toolbar — **complete**.

### Phase 5: Framework Maturity (39–46) ✅
`loading.tsx`, `error.tsx`, middleware API, streaming responses, static export, custom error pages, i18n, route prefetching — **complete**.

### Phase 6: Production Deployment & Runtime (47–54)
Docker image, standalone output, health checks, graceful shutdown — **5/8 complete**.

### Phase 7: Performance Optimization (55–62)
Content-hash cache, tree-shaking, CSS code splitting, asset pipeline, source maps, minification, bundle analysis, remote cache.

### Phase 8: Testing & Quality (63–70)
Unit tests, type safety audit — **2/8 complete**.

### Phase 9: Ecosystem & Integrations (71–80) ✅
Plugin system, auth, database adapters, image/font optimization, MDX, OG images, sitemaps, RSS, WebSocket — **complete**.

### Phase 10: Edge & Serverless (81–86) ✅
Cloudflare, Vercel Edge, Deno Deploy, AWS Lambda, Netlify, edge bundles — **complete**.

### Phase 11: Observability & Debugging (87–92)
Structured logging, OpenTelemetry, cache inspector, route inspector — **4/6 complete**.

### Phase 12: Documentation & Community (93–96)
Migration guide — **1/4 complete**.

### Phase 13: Security Hardening (97–114)
CSP, security headers, XSS prevention, CSRF, path traversal, clickjacking, MIME sniffing, DNS rebinding — **11/18 complete**.

### Phase 14: Authentication & Authorization (115–124)
Session management, audit log — **2/10 complete**.

### Phase 15: Performance & Optimization (125–140)
Streaming SSR, lazy loading, ETag — **3/16 complete**.

### Phase 16: Supply Chain & Dependency Security (141–148)
Dependency audit CI — **1/8 complete**.

### Phase 17: Privacy & Compliance (149–158)
GDPR, CCPA, PII redaction, encryption — **not started**.

### Phase 18: Observability & Monitoring (159–168)
Metrics export, health check, graceful shutdown, request ID — **4/10 complete**.

### Phase 19: Developer Safety Net (169–178)
Input validation, output serialization, rate limiting, secure defaults, env types — **5/10 complete**.

### Phase 20: Edge & Runtime Security (179–186)
Edge secrets, rate limiting, auth validation — **not started**.

### Phase 21: API & Data Security (187–196)
Schema validation, SSRF prevention, body size limit, file upload security — **4/10 complete**.

## License

MIT © 2025 PledgeStack Contributors
