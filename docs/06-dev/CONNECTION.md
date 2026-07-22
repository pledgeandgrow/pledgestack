# PledgePack ↔ PledgeStack — Architecture Connection

## Project Split

### PledgePack (Bundler / Build Tool)
- **Role:** Framework-agnostic bundler, dev server, and build tool (like Turbopack/esbuild/SWC)
- **Repository:** `https://github.com/pledgeandgrow/pledgepack`
- **npm package:** `pledgepack` (currently `0.1.8`)
- **Binary:** Native Rust binary (`pledge.exe` / `pledge`) distributed via GitHub Releases + postinstall download
- **Language:** Rust (Oxc parser, Lightning CSS, Boa JS runtime for plugin host and tests)
- **CLI:** `pledge dev`, `pledge build`, `pledge serve`, `pledge test`, `pledge analyze`, `pledge create`, `pledge migrate`, `pledge doctor`, `pledge bench`, `pledge cache`, `pledge generate-env-types`, `pledge completions`, `pledge config`

### PledgeStack (React Framework)
- **Role:** Opinionated React framework with SSR/SSG/RSC, file-based routing, API routes (like Next.js is to Turbopack)
- **Repository:** `https://github.com/pledgeandgrow/pledgestack` (monorepo)
- **npm package:** `pledgestack` (published, currently `0.1.2`)
- **Language:** TypeScript/JavaScript (depends on pledgepack binary)
- **CLI:** `pledge dev`, `pledge build`, `pledge start` (wraps `pledge` binary)

---

## Dependency Relationship

```
User installs pledgestack (framework)
  └── pledgestack depends on pledgepack (bundler)
       └── pledgepack postinstall downloads native binary from GitHub Releases
```

**pledgestack `package.json`:**
```json
{
  "dependencies": {
    "pledgepack": "^0.1.8"
  }
}
```

---

## Responsibility Split

| Concern | PledgePack | PledgeStack |
|---------|-----------|----------|
| Module bundling | ✅ | |
| Tree shaking / code splitting | ✅ | |
| Dev server (HTTP, WebSocket, HMR) | ✅ | |
| Transform pipeline (JS/TS/JSX/CSS) | ✅ | |
| Asset pipeline (images, fonts, SVG, MDX) | ✅ | |
| Plugin system (JS, Boa engine) | ✅ | |
| Output formats (ESM, CJS, IIFE, edge) | ✅ | |
| Source maps | ✅ | |
| CSS processing (Tailwind, CSS Modules, Lightning CSS) | ✅ | |
| Test runner (Vitest-compatible) | ✅ | |
| Bundle analyzer | ✅ | |
| Cache (memory, disk, remote) | ✅ | |
| File-based routing (`app/` directory) | | ✅ |
| Layouts, error boundaries, loading states | | ✅ |
| SSR / SSG / ISR rendering | | ✅ |
| React Server Components (RSC) | | ✅ |
| Data fetching (`cachedFetch`, `serverCachedFetch`, `unstable_cache`) | | ✅ |
| API routes (`app/api/*/route.ts`) | | ✅ |
| Server actions (`serverAction()`) | | ✅ |
| Head / metadata management | | ✅ |
| `<PledgeLink>`, `<PledgeImage>`, `<PledgeHead>` components | | ✅ |
| Instrumentation lifecycle hooks (`loadInstrumentation`) | | ✅ |
| Static export mode (`generateStaticExport`) | | ✅ |
| PSX/PS format (`.psx`/`.ps` files) | | ✅ |
| Rust workspace management (`Cargo.toml`, `pledge add`) | | ✅ |
| Batch API, binary protocol, Rust SSR | | ✅ |
| Framework conventions and types | | ✅ |
| Production SSR server | | ✅ |

---

## What PledgePack MUST NOT Handle (leave to PledgeStack)

PledgePack is a **dumb bundler** — it transforms files and serves them. It does NOT know about React, routing semantics, or server rendering:

- **DO NOT** implement React-specific rendering logic (JSX → HTML string, hydration scripts)
- **DO NOT** implement route matching or route params (PledgePack scans `app/` for files, but route matching at runtime is PledgeStack)
- **DO NOT** implement SSR server (Node.js HTTP server that renders React on request)
- **DO NOT** implement SSG page generation (calling React `renderToString` per route)
- **DO NOT** implement ISR (re-validation logic, stale-while-revalidate cache)
- **DO NOT** implement React Server Components protocol (RSC payload serialization/deserialization)
- **DO NOT** implement API route handlers (PledgePack provides the mechanism, PledgeStack provides the handler)
- **DO NOT** implement server actions (`serverAction()` function — PledgeStack only)
- **DO NOT** implement data fetching patterns (`cachedFetch`, `serverCachedFetch`, `unstable_cache` — PledgeStack only)
- **DO NOT** implement `<PledgeLink>`, `<PledgeImage>`, `<PledgeHead>`, `<ErrorBoundary>` components
- **DO NOT** implement metadata/SEO management (`<meta>` tag injection, Open Graph, sitemaps)
- **DO NOT** implement i18n routing (locale detection, locale-prefixed routes)
- **DO NOT** implement authentication middleware (session, cookies, JWT)
- **DO NOT** implement production Node.js server (`pledge start` — this is PledgeStack only)
- **DO NOT** implement framework-specific config (PledgePack only reads `pledge.config.ts`)
- **DO NOT** implement Next.js-compatible APIs (`getStaticProps`, `getServerSideProps` — PledgeStack wraps these)
- **DO NOT** implement HTML template generation for SSR (PledgeStack provides the HTML shell, PledgePack just processes it)
- **DO NOT** implement instrumentation lifecycle hooks (`loadInstrumentation` — PledgeStack only)
- **DO NOT** implement static export mode (`generateStaticExport` — PledgeStack only)

**What PledgePack DOES provide for PledgeStack to build on:**
- `appDir` config field → scans `app/` directory, generates `__pledge_router` virtual module with route table
- Plugin hooks (`resolveId`, `load`, `transform`, `transformIndexHtml`, `configureServer`, `buildStart`, `buildEnd`, `generateBundle`) → PledgeStack plugins use these
- Dev server middleware plugin hook (`configureServer`) → PledgeStack injects SSR/API route middleware
- `ssr` config field → tells PledgePack to preserve server entry for SSR
- HTML processing (`html.rs`) → processes `<script>` and `<link>` tags in HTML entry
- Edge bundle generation → outputs edge-compatible bundle for Cloudflare/Vercel

---

## What PledgeStack MUST NOT Handle (leave to PledgePack)

PledgeStack is a **framework layer** — it orchestrates React rendering and routing. It does NOT do bundling or file transformation:

- **DO NOT** implement module bundling (concatenating modules, resolving imports, chunk splitting)
- **DO NOT** implement JS/TS/JSX transformation (Oxc parser, syntax lowering, JSX → JS)
- **DO NOT** implement CSS processing (Lightning CSS, Tailwind, CSS Modules, SCSS/SASS/LESS)
- **DO NOT** implement tree shaking (dead code elimination, side-effect detection)
- **DO NOT** implement code splitting (chunk graph, shared chunks, dynamic imports)
- **DO NOT** implement source map generation
- **DO NOT** implement asset pipeline (image optimization, font subsetting, SVG sprites, MDX)
- **DO NOT** implement HMR WebSocket (PledgePack handles WebSocket, HMR diff, module invalidation)
- **DO NOT** implement file watcher (PledgePack uses native inotify/FSEvents/ReadDirectoryChangesW)
- **DO NOT** implement build cache (memory cache, disk cache, remote cache, git-based invalidation)
- **DO NOT** implement test runner (PledgePack has full Vitest-compatible runner with Boa JS engine)
- **DO NOT** implement bundle analyzer (PledgePack generates interactive HTML treemap)
- **DO NOT** implement output format conversion (ESM → CJS/IIFE/UMD)
- **DO NOT** implement compression (gzip/brotli output generation)
- **DO NOT** implement plugin sandboxing (JS plugin limits, filesystem access control)
- **DO NOT** implement dependency pre-bundling (DepBundler in PledgePack handles this)
- **DO NOT** implement polyfills (PledgePack has 20 built-in Node.js polyfills)
- **DO NOT** implement define/compile-time constants (PledgePack handles `define` config)
- **DO NOT** implement binary distribution (PledgePack handles its own native binary via postinstall)
- **DO NOT** implement migration tooling (PledgePack migrates from Vite/webpack/Turbopack configs)
- **DO NOT** implement LSP server (PledgePack has built-in LSP for import resolution and diagnostics)

**What PledgeStack DOES provide on top of PledgePack:**
- `pledge.config.ts` → user-facing framework config (SSR, i18n, images, experimental features)
- React components: `<PledgeLink>`, `<PledgeImage>`, `<PledgeHead>`, `<ErrorBoundary>`, `<Loading>`
- Server runtime: Node.js HTTP server for `pledge start` (production SSR via `startNodeServer`)
- Edge runtime: `createEdgeHandler` for Cloudflare Workers / Vercel Edge / Deno Deploy
- Route matching: interprets `__pledge_router` virtual module, matches URLs to route components
- SSR rendering: `renderSSR`, `renderSSRStream` with layout chains, error boundaries, Suspense
- RSC rendering: `renderRSCToHTML`, `renderRSCStream` (no `renderRSC` — removed)
- SSG generation: `generateStaticExport` (full export mode), `generateStaticPages` (incremental SSG)
- API routes: resolves `app/api/*/route.ts` files, calls handlers for matching requests
- Server actions: `serverAction()` function with automatic client→server RPC via POST endpoint
- Data fetching: `cachedFetch`, `serverCachedFetch`, `unstable_cache`, `revalidateTag`, `revalidatePath`
- Instrumentation: `loadInstrumentation` loads `instrumentation.ts` at server startup, calls `register()`
- Server utilities: `cookies()`, `headers()`, `searchParams()`, `params()`, `redirect()`, `notFound()`, `draftMode()`, `after()`

---

## Integration Points

### 1. PledgeStack calls PledgePack via CLI

PledgeStack CLI wraps the `pledge` binary:

```typescript
// PledgeStack CLI (simplified)
import { runPledgepack } from 'pledgepack';

// dev command
await runPledgepack(['dev', '--port', '3000']);

// build command
await runPledgepack(['build']);

// build with SSG
await runPledgepack(['build', '--ssg']);
```

### 2. PledgeStack generates pledge.config.ts

PledgeStack auto-generates or extends the PledgePack config:

```typescript
// PledgeStack generates this pledge.config.ts
import { defineConfig } from 'pledge';

export default defineConfig({
  entry: ['app/entry.tsx'],
  framework: 'react',
  appDir: 'app',
  devServer: {
    port: 3000,
    hmr: true,
  },
  plugins: [
    // PledgeStack injects its own plugins for RSC, SSR, routing
    { name: 'pledgestack-rsc', resolve: './plugins/rsc.js' },
    { name: 'pledgestack-ssr', resolve: './plugins/ssr.js' },
    { name: 'pledgestack-router', resolve: './plugins/router.js' },
  ],
});
```

### 3. PledgePack plugin hooks for PledgeStack

PledgePack exposes these plugin hooks that PledgeStack plugins use:

```
buildStart       — called before first transform
resolveId        — intercept import resolution (for virtual modules like __pledge_router)
load             — provide virtual module content
transform        — modify source code (for RSC serialization, SSR transforms)
renderChunk      — modify chunk content before emit
generateBundle   — add extra files to output (SSG HTML pages, sitemap)
writeBundle      — post-build actions (submit to search engines, etc.)
```

### 4. Virtual modules

PledgePack already supports virtual modules. PledgeStack uses these:

| Virtual module | Purpose |
|---------------|---------|
| `__pledge_router` | Auto-generated router from `app/` directory |
| `__pledge_manifest` | Build manifest for SSR asset injection |
| `__pledge_rsc_client` | RSC client renderer |
| `__pledge_rsc_server` | RSC server renderer |

### 5. PledgePack config fields PledgeStack relies on

```typescript
{
  appDir: 'app',              // file-based routing directory
  framework: 'react',         // JSX transform mode
  entry: ['app/entry.tsx'],   // entry points
  htmlEntry: 'index.html',    // HTML template
  sourceMaps: true,           // source maps for dev
  plugins: [...],             // PledgeStack plugins
  ssr: {                      // SSR config
    entry: 'app/entry.server.tsx',
    runtime: 'node',
  },
  edgeTarget: 'cloudflare',   // edge deployment
}
```

---

## Binary Distribution

### PledgePack binary
- Built in Rust, cross-compiled for 6 platform targets via CI (Windows x64, Linux x64/arm64, macOS x64/arm64, Windows ARM64)
- Distributed via GitHub Releases: `https://github.com/pledgeandgrow/pledgepack/releases/latest/download/pledge-{target}.{ext}`
- `postinstall.js` downloads the correct binary automatically
- JS shim (`bin/pledge.js`) resolves binary from:
  1. `target/release/` (dev mode)
  2. `target/debug/` (dev mode)
  3. `bin/{platform-key}/` (downloaded by postinstall)
  4. `bin/platform/{platform-key}/` (CI staged)
  5. `bin/` (direct install)

### PledgeStack does NOT have its own binary
- PledgeStack is pure TypeScript/JavaScript
- It spawns the `pledge` binary (from PledgePack) for all build operations
- PledgeStack adds framework middleware on top of PledgePack's dev server

---

## Package Structure

### PledgePack (published from pledgepack repo)
```
pledgepack/
├── bin/
│   ├── pledge.js          # CLI shim (resolves native binary)
│   └── postinstall.js     # Downloads binary from GitHub Releases
├── pledgepack/
│   └── index.js           # Programmatic API (runPledgepack, resolveBinary)
├── package.json           # name: "pledgepack", version: "0.1.8"
├── README.md
└── LICENSE
```

### PledgeStack (published from pledgeandgrow/pledgestack)
```
pledgestack/
├── packages/
│   ├── cli/                       # Main framework package — published as `pledgestack` on npm
│   │   ├── src/
│   │   │   ├── commands/          # CLI commands (dev, build, start, create, info, doctor)
│   │   │   ├── config-loader.ts   # Loads pledge.config.ts
│   │   │   ├── index.ts           # Re-exports all sub-packages
│   │   │   └── ...
│   │   ├── scripts/build.mjs      # esbuild bundler (bundles all sub-packages into dist/)
│   │   ├── package.json           # name: "pledgestack", deps: { pledgepack: "^0.1.8" }
│   │   └── README.md
│   ├── shared/                    # Private — bundled into CLI via esbuild aliases
│   ├── core/                      # Private — bundled into CLI
│   ├── server/                    # Private — bundled into CLI
│   ├── client/                    # Private — bundled into CLI
│   ├── auth/                      # Private — bundled into CLI
│   ├── state/                     # Private — bundled into CLI
│   ├── api/                       # Private — bundled into CLI
│   ├── a11y/                      # Private — bundled into CLI
│   ├── overlay/                   # Private — bundled into CLI
│   ├── seo/                       # Private — bundled into CLI
│   └── ...                        # Other private sub-packages
```

---

## Config Flow

```
User writes pledge.config.ts          PledgeStack reads it
         │
         ▼
PledgeStack extends pledge.config.ts     PledgePack reads it
         │
         ▼
PledgePack runs build/dev/test          native binary executes
```

### pledge.config.ts (user-facing, framework-specific)
```typescript
import { defineConfig } from 'pledgestack';

export default defineConfig({
  ssr: true,
  ssg: false,
  isr: { revalidate: 60 },
  i18n: {
    locales: ['en', 'fr'],
    defaultLocale: 'en',
  },
  images: {
    domains: ['cdn.example.com'],
  },
  experimental: {
    serverActions: true,
    rsc: true,
  },
});
```

### pledge.config.ts (consumed by PledgePack)
```typescript
import { defineConfig } from 'pledge';

export default defineConfig({
  entry: ['app/entry.tsx'],
  framework: 'react',
  appDir: 'app',
  devServer: { port: 3000, hmr: true },
  sourceMaps: true,
  plugins: [
    { name: 'pledgestack-rsc', resolve: 'pledgestack-plugin-rsc' },
    { name: 'pledgestack-ssr', resolve: 'pledgestack-plugin-ssr' },
    { name: 'pledgestack-router', resolve: 'pledgestack-plugin-router' },
  ],
});
```

---

## Dev Server Integration

PledgePack runs the HTTP server. PledgeStack injects middleware:

```
HTTP Request
  → PledgePack dev server (axum)
    → PledgeStack middleware (SSR, RSC, API routes)
      → PledgePack module transform (Oxc)
        → Response (HTML / module / HMR payload)
```

PledgeStack plugins register as PledgePack dev server middleware via the plugin system:

```typescript
// PledgeStack SSR plugin
export default {
  name: 'pledgestack-ssr',
  configureServer(server) {
    app.use(async (req, res, next) => {
      if (req.url.startsWith('/api/')) {
        // Handle API route
        const handler = await resolveApiRoute(req.url);
        return handler(req, res);
      }
      if (req.headers.accept?.includes('text/html')) {
        // SSR render
        const html = await renderToString(req.url);
        return res.html(html);
      }
      next();
    });
  },
};
```

---

## CLI Command Mapping

| PledgeStack command | What it does internally |
|-----------------|----------------------|
| `pledge dev` | Calls `pledge dev` (PledgePack) + injects framework middleware |
| `pledge build` | Calls `pledge build` (PledgePack) + runs SSG/SSR post-build |
| `pledge start` | Starts production SSR server (Node.js, not PledgePack) |
| `pledge add <crate>` | Adds Rust crate to root `Cargo.toml` workspace manifest |
| `pledge remove <crate>` | Removes Rust crate from root `Cargo.toml` |
| `pledge list` | Lists installed Rust crates from `Cargo.toml` |
| `pledge test` | Calls `pledge test` (PledgePack handles test runner) |
| `pledge analyze` | Calls `pledge analyze` (PledgePack handles analyzer) |
| `pledge migrate` | Calls `pledge migrate` (PledgePack handles migration) |

---

## GitHub Release Binary Naming Convention

PledgePack postinstall expects binaries at:
```
https://github.com/pledgeandgrow/pledgepack/releases/latest/download/pledge-{target}.{ext}
```

| Platform | Target | Extension | Filename |
|----------|--------|-----------|----------|
| Windows x64 | `x86_64-pc-windows-msvc` | `.zip` | `pledge-x86_64-pc-windows-msvc.zip` |
| Windows ARM64 | `aarch64-pc-windows-msvc` | `.zip` | `pledge-aarch64-pc-windows-msvc.zip` |
| macOS arm64 | `aarch64-apple-darwin` | `.tar.gz` | `pledge-aarch64-apple-darwin.tar.gz` |
| macOS x64 | `x86_64-apple-darwin` | `.tar.gz` | `pledge-x86_64-apple-darwin.tar.gz` |
| Linux x64 | `x86_64-unknown-linux-gnu` | `.tar.gz` | `pledge-x86_64-unknown-linux-gnu.tar.gz` |
| Linux arm64 | `aarch64-unknown-linux-gnu` | `.tar.gz` | `pledge-aarch64-unknown-linux-gnu.tar.gz` |

Inside each archive: a single binary named `pledge` (Unix) or `pledge.exe` (Windows).

---

## Key Files Reference

### PledgePack (pledgepack repo)
- `crates/cli/src/main.rs` — CLI entry point, all commands
- `crates/core/src/config.rs` — PledgeConfig struct, all config fields
- `crates/core/src/config_validate.rs` — Config validation with "Did you mean?" suggestions
- `crates/core/src/pipeline.rs` — Build pipeline (parse → transform → optimize → emit)
- `crates/core/src/transform.rs` — Oxc-based JS/TS/JSX transform
- `crates/core/src/module_graph.rs` — Module dependency graph
- `crates/core/src/router.rs` — File-based routing scanner (`scan_app_dir`)
- `crates/core/src/plugin_system.rs` — Plugin hot reload, lifecycle hooks, parallel execution
- `crates/js-plugin-host/src/lib.rs` — JS plugin host (Boa engine) with Vite-compatible hooks
- `crates/core/src/html.rs` — HTML entry processing
- `crates/core/src/edge.rs` — Edge bundle generation
- `bin/pledge.js` — JS shim that resolves and spawns native binary
- `bin/postinstall.js` — Downloads binary from GitHub Releases
- `package.json` — npm package definition (`pledgepack@0.1.8`)

### PledgeStack (pledgeandgrow/pledgestack repo)
- `packages/cli/` — Main framework package (published as `pledgestack` on npm)
- `packages/core/` — Core rendering (SSR, RSC, SSG, static export)
- `packages/core/src/psx/` — PSX/PS format: parser, codegen, transform, batch API, binary protocol, Rust SSR, workspace manager
- `packages/server/` — Node.js + edge server runtime, instrumentation, HMR, server utilities, PSX transform pipeline
- `packages/shared/` — Shared types and config
- `packages/client/` — Client-side hydration, state, data hooks (useFetch, useSWR, useMutation)
- `packages/auth/` — Authentication middleware
- `packages/state/` — Client state management
- `packages/api/` — API route helpers
- `packages/seo/` — SEO and metadata
- `packages/a11y/` — Accessibility utilities
- `packages/overlay/` — Dev overlay UI

---

## Versioning Strategy

- **PledgePack** and **PledgeStack** version independently
- PledgeStack `package.json` specifies `pledgepack: "^0.1.8"` (caret range)
- Breaking changes in PledgePack require PledgeStack to update its dependency range
- PledgeStack can pin PledgePack version for stability: `pledgepack: "0.1.8"` (exact)

---

## Publishing Flow

```
1. Build PledgePack binary:     cargo build --release
2. Create GitHub Release:       gh release create v0.1.8 pledge-x86_64-pc-windows-msvc.zip
3. Publish PledgePack to npm:   npm publish (from pledgepack repo)
4. Update PledgeStack dependency:  pledgestack package.json → pledgepack: "^0.1.8"
5. Publish PledgeStack to npm:     npm publish (from packages/cli directory)
```

---

## What PledgeStack Agent Needs to Know

1. **PledgePack is the bundler** — don't reimplement bundling, transforming, or dev server in PledgeStack
2. **PledgeStack wraps PledgePack** — spawn `pledge` binary via `runPledgepack()` from `pledgepack` package
3. **Use PledgePack plugins** — framework features (RSC, SSR, routing) use PledgePack's JS plugin hooks
4. **Virtual modules** — use `resolveId` + `load` plugin hooks for `__pledge_router`, `__pledge_manifest`, etc.
5. **Config** — PledgeStack reads `pledge.config.ts` directly (no separate framework config)
6. **No Rust needed for framework** — PledgeStack is pure TypeScript/JavaScript. The PSX/PS format lets *user apps* embed Rust, but the framework itself is TS
7. **Binary is automatic** — `npm install pledgepack` handles binary download via postinstall
8. **Dev server** — PledgePack runs the HTTP server, PledgeStack injects middleware via `configureServer` hook
9. **SSR server** — PledgeStack runs its own Node.js server for production SSR (`pledge start` via `startNodeServer`)
10. **Edge server** — PledgeStack provides `createEdgeHandler` for Cloudflare/Vercel/Deno
11. **Test runner** — use `pledge test` directly, PledgePack has full Vitest-compatible runner
12. **PSX/PS format** — `.psx` files embed Rust in TSX via `<rust>` blocks, `.ps` files are pure Rust. Both compile to native `.node` addons via `cargo`. Types auto-generated from Rust structs. Workspace `Cargo.toml` at project root shared by all modules. `pledge add <crate>` adds Rust dependencies.
13. **Two-layer Rust** — Layer 1 (PledgePack toolchain) is always on for every project. Layer 2 (`.psx`/`.ps` native execution) is opt-in per file. Pure TypeScript projects still benefit from Rust toolchain speed.
