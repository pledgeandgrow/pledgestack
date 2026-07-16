# PledgeStack Architecture

## Overview

PledgeStack is a full-stack React framework built as a monorepo with pnpm workspaces. It follows Next.js app-directory conventions and uses **PledgePack** — a published Rust+Zig bundler ([npm: pledgepack](https://www.npmjs.com/package/pledgepack)) that handles bundling, compilation, dev server, HMR, and production builds.

## Packages

```
packages/
├── shared/              # Shared types, config schema, constants (private — bundled into CLI)
├── core/                # Framework core — routing, rendering, FS scanner (private)
├── server/              # Node.js + Edge server runtime, server utilities (private)
├── client/              # Client-side hydration, routing, prefetch (private)
├── auth/                # Authentication & security helpers (private)
├── state/               # State management (private)
├── api/                 # API route utilities (private)
├── a11y/                # Accessibility audit tools (private)
├── overlay/             # Error overlay & DevTools (private)
├── seo/                 # SEO & structured data (private)
├── cli/                 # CLI tool — published as `pledgestack` on npm (dev, build, start, create)
├── vscode-extension/    # VS Code extension — highlighting, IntelliSense
└── create-pledge-app/   # Scaffolding CLI for new PledgeStack apps
```

> **PledgePack** is installed from npm (`pledgepack@^0.1.1`), not as a workspace package. It provides the `pledge` CLI command for builds, dev server, and bundling.
>
> Only the `pledgestack` package (CLI) is published to npm. All sub-packages are bundled into it via esbuild and marked as private.

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
- **render/rsc.ts** — RSC pipeline using `react-server-dom-webpack`: serializes React tree, wraps in HTML shell with client manifest
- **render/static.ts** — SSG pipeline: pre-renders pages with `generateStaticParams` to static HTML files

### server

Node.js server runtime — used in dev mode and as fallback production server.

- **handler.ts** — `createRequestHandler()`: orchestrates middleware → route matching → API dispatch → SSR/RSC rendering. Loads all modules including convention files. Returns `{ handler, invalidate }` for HMR.
- **node.ts** — `startNodeServer()`: Node.js HTTP server, static file serving, HMR watcher setup
- **edge.ts** — Edge runtime handler for Cloudflare Workers / Deno Deploy
- **module-loader.ts** — Dynamic ESM module loader with cache-busting for HMR, middleware loading
- **hmr.ts** — File system watcher with debounce, triggers handler invalidation on change
- **server-utils.ts** — Request-scoped utilities: `cookies()`, `headers()`, `searchParams()`, `params()` via `setRequestContext()`
- **fetch-cache.ts** — `cachedFetch()` with `force-cache`/`no-store`/`isr` modes, `revalidateTag()`, `revalidatePath()`, background revalidation

### client

Client-side JavaScript for hydration and SPA navigation.

- **hydrate.ts** — `hydrate()` (SSR hydration) and `render()` (client-only fallback) using React 19 `hydrateRoot`
- **router.ts** — `RouterProvider`, `useRouter()`, `Link` component with:
  - Hover-based prefetching (low-priority fetch)
  - Scroll restoration (saves/restores per-route scroll positions)
  - `navigate(to, { scroll, replace })` API
  - `popstate` listener for back/forward
  - Modifier-key awareness (cmd+click opens new tab)

### cli

Command-line interface — the only published package (`pledgestack` on npm).

- **bin.ts** — Entry point, parses `dev`/`build`/`start`/`create`/`info`/`doctor` commands
- **config-loader.ts** — Loads `pledge.config.ts`/`.js`/`.mjs` with defaults
- **commands/dev.ts** — Starts dev server with HMR + Tailwind processing
- **commands/build.ts** — Scans routes, generates static pages, processes Tailwind, copies public assets
- **commands/start.ts** — Starts production server
- **commands/info.ts** — Print environment diagnostics
- **commands/doctor.ts** — Diagnose and fix common project issues
- **commands/env-check.ts** — Validate environment variables against schema
- **scripts/build.mjs** — esbuild bundler that bundles all sub-packages into `dist/` via source aliases

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
   route.ts         page.tsx
       │               │
       ▼               ▼
   Handler fn    ┌──────────────┐
   returns       │  Render      │
   Response      │  ├─ SSR      │
                 │  ├─ RSC      │
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
import { defineConfig } from 'pledge';

export default defineConfig({
  framework: 'react',
  source_maps: true,
  env_prefix: 'PLEDGE_',
  compress_gzip: true,
  compress_brotli: true,
  dev_server: {
    port: 3000,
    host: 'localhost',
    hmr: true,
  },
});
```

Framework config (PledgeStack-specific) lives in `pledge.config.ts` alongside the build config, using `UserConfig` from `pledgestack-shared` for app directory, runtime, RSC, and Tailwind settings.

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
├── index.html               # SSG home page
└── [path].html              # SSG pages
```
