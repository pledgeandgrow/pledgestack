# PledgeStack

A full-stack React framework — like Next.js, but powered by PledgePack (Rust+Zig bundler) for maximum build performance.

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
│   ├── shared/              # Shared types, config, constants
│   ├── core/                # Framework core — routing, rendering, FS scanner
│   ├── server/              # Node.js + Edge server runtime, server utilities
│   ├── client/              # Client-side hydration + routing
│   ├── cli/                 # CLI tool (dev, build, start, create)
│   ├── vscode-extension/    # VS Code extension — highlighting, IntelliSense
│   └── create-pledge-app/   # Scaffolding CLI for new PledgeStack apps
├── apps/
│   └── playground/          # Example app for development
├── examples/                # Starter templates (blog, tailwindcss, auth, api-routes)
├── test/                    # Test suites (unit, integration, e2e)
├── scripts/                 # Release, benchmark, workspace check scripts
├── docs/                    # Numbered documentation directories
├── .github/                 # Issue templates, PR template, CODEOWNERS
├── .config/                 # Shared eslint, tsconfig, prettier base configs
├── pledge.config.ts         # PledgePack build config (defineConfig from 'pledge')
└── pnpm-workspace.yaml
```

> PledgePack is installed from npm (`pledgepack@^0.1.1`), not as a workspace package. CLI command: `pledge`.

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

## Roadmap — 96 Goals to Production

> Full roadmap with progress tracking: [docs/05-community/roadmap.md](docs/05-community/roadmap.md)

### Phase 1: Core Runtime (1–10) ✅
Install, dev server, SSR, API routes, middleware, 404, HMR, server utilities — **complete**.

### Phase 2: Routing & Conventions (11–20)
`head.tsx`, `template.tsx`, Pledge System, Server Actions, RSC streaming, parallel/intercepting routes, route groups, selective hydration, page transitions — **8/10 complete**.

### Phase 3: Data & Caching (21–28)
Request context, revalidation, `generateStaticParams`, route config, ISR, RSC data fetching, cookie variants, fetch cache — **4/8 complete**.

### Phase 4: Developer Experience (29–38)
Fast Refresh, error overlay, `create`/`info`/`doctor` commands, env vars, ESLint plugin, CI, VS Code extension, dev toolbar — **complete**.

### Phase 5: Framework Maturity (39–46)
`loading.tsx`, `error.tsx`, middleware API, streaming responses, static export, custom error pages, i18n, route prefetching — **complete**.

### Phase 6: Production Deployment & Runtime (47–54)
Docker image, Rust HTTP server, Rust+JS interop, static file server, standalone output, health checks, graceful shutdown, cluster mode.

### Phase 7: Performance Optimization (55–62)
Content-hash cache, tree-shaking, CSS code splitting, asset pipeline, source maps, minification, bundle analysis, remote cache.

### Phase 8: Testing & Quality (63–70)
Unit tests, integration tests, E2E tests, snapshot tests, performance benchmarks, bundle size budget, type safety audit, lint coverage.

### Phase 9: Ecosystem & Integrations (71–80)
Plugin system, auth helpers, database adapters, image/font optimization, MDX, OG images, sitemaps, RSS feeds, WebSocket support.

### Phase 10: Edge & Serverless (81–86)
Cloudflare Workers, Vercel Edge, Deno Deploy, AWS Lambda, Netlify adapters, edge-compatible bundles.

### Phase 11: Observability & Debugging (87–92)
Structured logging, OpenTelemetry tracing, dev profiler, cache inspector, route inspector, error source maps.

### Phase 12: Documentation & Community (93–96)
Interactive tutorial, API reference auto-generation, Next.js migration guide, example gallery.

## License

MIT
