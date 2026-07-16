# Pledgepack ↔ PledgeStack — Architecture Connection

## Project Split

### pledgepack (Bundler / Build Tool)
- **Role:** Framework-agnostic bundler, dev server, and build tool (like Turbopack/esbuild/SWC)
- **Repository:** `https://github.com/pledgeandgrow/pledgerepo`
- **npm package:** `pledgepack` (currently `0.1.1`)
- **Binary:** Native Rust binary (`pledge.exe` / `pledge`) distributed via GitHub Releases + postinstall download
- **Language:** Rust (Oxc parser, Lightning CSS, Boa JS runtime for tests)
- **CLI:** `pledge dev`, `pledge build`, `pledge serve`, `pledge test`, `pledge analyze`, `pledge create`, `pledge migrate`, `pledge doctor`, `pledge bench`, `pledge cache`, `pledge generate-env-types`, `pledge completions`, `pledge config`

### pledgestack (React Framework)
- **Role:** Opinionated React framework with SSR/SSG/RSC, file-based routing, API routes (like Next.js is to Turbopack)
- **Repository:** `https://github.com/pledgelabs/pledgestack` (monorepo)
- **npm package:** `pledgestack` (planned)
- **Language:** TypeScript/JavaScript (depends on pledgepack binary)
- **CLI:** `pledgestack dev`, `pledgestack build`, `pledgestack start` (wraps `pledge` binary)

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
    "pledgepack": "^0.1.1"
  }
}
```

---

## Responsibility Split

| Concern | pledgepack | pledgestack |
|---------|-----------|----------|
| Module bundling | ✅ | |
| Tree shaking / code splitting | ✅ | |
| Dev server (HTTP, WebSocket, HMR) | ✅ | |
| Transform pipeline (JS/TS/JSX/CSS) | ✅ | |
| Asset pipeline (images, fonts, SVG, MDX) | ✅ | |
| Plugin system (WASM + JS) | ✅ | |
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
| Data fetching (`loader`, `getServerSideProps`-equivalent) | | ✅ |
| API routes (`app/api/*/route.ts`) | | ✅ |
| Server actions | | ✅ |
| Head / metadata management | | ✅ |
| `<PledgeLink>`, `<PledgeImage>`, `<PledgeHead>` components | | ✅ |
| Framework conventions and types | | ✅ |
| Production SSR server | | ✅ |

---

## What pledgepack MUST NOT Handle (leave to pledgestack)

pledgepack is a **dumb bundler** — it transforms files and serves them. It does NOT know about React, routing semantics, or server rendering:

- **DO NOT** implement React-specific rendering logic (JSX → HTML string, hydration scripts)
- **DO NOT** implement route matching or route params (pledgepack scans `app/` for files, but route matching at runtime is pledgestack)
- **DO NOT** implement SSR server (Node.js HTTP server that renders React on request)
- **DO NOT** implement SSG page generation (calling React `renderToString` per route)
- **DO NOT** implement ISR (re-validation logic, stale-while-revalidate cache)
- **DO NOT** implement React Server Components protocol (RSC payload serialization/deserialization)
- **DO NOT** implement API route handlers (pledgepack provides the mechanism, pledgestack provides the handler)
- **DO NOT** implement server actions (form submission → server function call)
- **DO NOT** implement data fetching patterns (`loader`, `getServerSideProps`, `useLoaderData`)
- **DO NOT** implement `<Link>`, `<Image>`, `<Head>`, `<ErrorBoundary>` components
- **DO NOT** implement metadata/SEO management (`<meta>` tag injection, Open Graph, sitemaps)
- **DO NOT** implement i18n routing (locale detection, locale-prefixed routes)
- **DO NOT** implement authentication middleware (session, cookies, JWT)
- **DO NOT** implement production Node.js server (`pledgestack start` — this is pledgestack only)
- **DO NOT** implement framework-specific config (`pledgestack.config.ts` — pledgepack only reads `pledge.config.ts`)
- **DO NOT** implement Next.js-compatible APIs (`getStaticProps`, `getServerSideProps` — pledgestack wraps these)
- **DO NOT** implement HTML template generation for SSR (pledgestack provides the HTML shell, pledgepack just processes it)

**What pledgepack DOES provide for pledgestack to build on:**
- `appDir` config field → scans `app/` directory, generates `__pledge_router` virtual module with route table
- Plugin hooks (`resolveId`, `load`, `transform`, `renderChunk`, `generateBundle`) → pledgestack plugins use these
- Dev server middleware plugin hook → pledgestack injects SSR/API route middleware
- `ssr` config field (roadmap) → tells pledgepack to preserve server entry for SSR
- HTML processing (`html.rs`) → processes `<script>` and `<link>` tags in HTML entry
- Edge bundle generation → outputs edge-compatible bundle for Cloudflare/Vercel

---

## What pledgestack MUST NOT Handle (leave to pledgepack)

pledgestack is a **framework layer** — it orchestrates React rendering and routing. It does NOT do bundling or file transformation:

- **DO NOT** implement module bundling (concatenating modules, resolving imports, chunk splitting)
- **DO NOT** implement JS/TS/JSX transformation (Oxc parser, syntax lowering, JSX → JS)
- **DO NOT** implement CSS processing (Lightning CSS, Tailwind, CSS Modules, SCSS/SASS/LESS)
- **DO NOT** implement tree shaking (dead code elimination, side-effect detection)
- **DO NOT** implement code splitting (chunk graph, shared chunks, dynamic imports)
- **DO NOT** implement source map generation
- **DO NOT** implement asset pipeline (image optimization, font subsetting, SVG sprites, MDX)
- **DO NOT** implement HMR WebSocket (pledgepack handles WebSocket, HMR diff, module invalidation)
- **DO NOT** implement file watcher (pledgepack uses native inotify/FSEvents/ReadDirectoryChangesW)
- **DO NOT** implement build cache (memory cache, disk cache, remote cache, git-based invalidation)
- **DO NOT** implement test runner (pledgepack has full Vitest-compatible runner with Boa JS engine)
- **DO NOT** implement bundle analyzer (pledgepack generates interactive HTML treemap)
- **DO NOT** implement output format conversion (ESM → CJS/IIFE/UMD)
- **DO NOT** implement compression (gzip/brotli output generation)
- **DO NOT** implement plugin sandboxing (WASM limits, filesystem access control)
- **DO NOT** implement dependency pre-bundling (DepBundler in pledgepack handles this)
- **DO NOT** implement polyfills (pledgepack has 20 built-in Node.js polyfills)
- **DO NOT** implement define/compile-time constants (pledgepack handles `define` config)
- **DO NOT** implement binary distribution (pledgepack handles its own native binary via postinstall)
- **DO NOT** implement migration tooling (pledgepack migrates from Vite/webpack/Turbopack configs)
- **DO NOT** implement LSP server (pledgepack has built-in LSP for import resolution and diagnostics)

**What pledgestack DOES provide on top of pledgepack:**
- `pledgestack.config.ts` → user-facing framework config (SSR, i18n, images, experimental features)
- Auto-generates `pledge.config.ts` from `pledgestack.config.ts` with correct plugins and entry points
- pledgepack plugins: `pledgestack-plugin-rsc`, `pledgestack-plugin-ssr`, `pledgestack-plugin-router`
- React components: `<Link>`, `<Image>`, `<Head>`, `<ErrorBoundary>`, `<Loading>`
- Server runtime: Node.js HTTP server for `pledgestack start` (production SSR)
- Route matching: interprets `__pledge_router` virtual module, matches URLs to route components
- SSR rendering: calls React `renderToString` / `renderToPipeableStream` with route component
- SSG generation: iterates routes, calls SSR render, writes static HTML files
- API routes: resolves `app/api/*/route.ts` files, calls handlers for matching requests
- Server actions: deserializes form submissions, calls server functions, returns responses
- Data fetching: `loader` functions, `useLoaderData` hook, streaming data

---

## Integration Points

### 1. pledgestack calls pledgepack via CLI

pledgestack CLI wraps the `pledge` binary:

```typescript
// pledgestack CLI (simplified)
import { runPledgepack } from 'pledgepack';

// dev command
await runPledgepack(['dev', '--port', '3000']);

// build command
await runPledgepack(['build']);

// build with SSG
await runPledgepack(['build', '--ssg']);
```

### 2. pledgestack generates pledge.config.ts

pledgestack auto-generates or extends the pledgepack config:

```typescript
// pledgestack generates this pledge.config.ts
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
    // pledgestack injects its own plugins for RSC, SSR, routing
    { name: 'pledgestack-rsc', resolve: './plugins/rsc.js' },
    { name: 'pledgestack-ssr', resolve: './plugins/ssr.js' },
    { name: 'pledgestack-router', resolve: './plugins/router.js' },
  ],
});
```

### 3. pledgepack plugin hooks for pledgestack

pledgepack exposes these plugin hooks that pledgestack plugins use:

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

pledgepack already supports virtual modules. pledgestack uses these:

| Virtual module | Purpose |
|---------------|---------|
| `__pledge_router` | Auto-generated router from `app/` directory |
| `__pledge_manifest` | Build manifest for SSR asset injection |
| `__pledge_rsc_client` | RSC client renderer |
| `__pledge_rsc_server` | RSC server renderer |

### 5. pledgepack config fields pledgestack relies on

```typescript
{
  appDir: 'app',              // file-based routing directory
  framework: 'react',         // JSX transform mode
  entry: ['app/entry.tsx'],   // entry points
  htmlEntry: 'index.html',    // HTML template
  sourceMaps: true,           // source maps for dev
  plugins: [...],             // pledgestack plugins
  ssr: {                      // SSR config (roadmap #51)
    entry: 'app/entry.server.tsx',
    runtime: 'node',
  },
  edgeTarget: 'cloudflare',   // edge deployment
}
```

---

## Binary Distribution

### pledgepack binary
- Built in Rust, compiled for Windows x64 (currently), macOS/Linux planned via CI
- Distributed via GitHub Releases: `https://github.com/pledgeandgrow/pledgerepo/releases/latest/download/pledge-{target}.{ext}`
- `postinstall.js` downloads the correct binary automatically
- JS shim (`bin/pledge.js`) resolves binary from:
  1. `target/release/` (dev mode)
  2. `target/debug/` (dev mode)
  3. `bin/{platform-key}/` (downloaded by postinstall)
  4. `bin/platform/{platform-key}/` (CI staged)
  5. `bin/` (direct install)

### pledgestack does NOT have its own binary
- pledgestack is pure TypeScript/JavaScript
- It spawns the `pledge` binary (from pledgepack) for all build operations
- pledgestack adds framework middleware on top of pledgepack's dev server

---

## Package Structure

### pledgepack (published from pledgerepo)
```
pledgepack/
├── bin/
│   ├── pledge.js          # CLI shim (resolves native binary)
│   └── postinstall.js     # Downloads binary from GitHub Releases
├── pledgepack/
│   └── index.js           # Programmatic API (runPledgepack, resolveBinary)
├── package.json           # name: "pledgepack", version: "0.1.1"
├── README.md
└── LICENSE
```

### pledgestack (published from pledgelabs/pledgestack)
```
pledgestack/
├── packages/
│   ├── pledgestack/                  # Main framework package
│   │   ├── bin/
│   │   │   └── pledgestack.js        # CLI entry (wraps pledge binary)
│   │   ├── src/
│   │   │   ├── cli/               # CLI commands (dev, build, start)
│   │   │   ├── server/            # SSR server, RSC protocol
│   │   │   ├── router/            # File-based routing, layouts
│   │   │   ├── components/        # <Link>, <Image>, <Head>, <ErrorBoundary>
│   │   │   ├── plugins/           # pledgepack plugins (rsc, ssr, router)
│   │   │   ├── config/            # Config generation, validation
│   │   │   └── types/             # TypeScript types for framework
│   │   ├── package.json           # name: "pledgestack", deps: { pledgepack: "^0.1.1" }
│   │   └── README.md
│   └── pledgepack/                # Mirror of pledgepack JS shim (for monorepo dev)
│       ├── index.js
│       ├── bin/
│       │   └── pledgepack.js
│       ├── scripts/
│       │   └── postinstall.js
│       └── package.json
```

---

## Config Flow

```
User writes pledgestack.config.ts          pledgestack reads it
         │
         ▼
pledgestack generates pledge.config.ts     pledgepack reads it
         │
         ▼
pledgepack runs build/dev/test          native binary executes
```

### pledgestack.config.ts (user-facing, framework-specific)
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

### pledge.config.ts (generated by pledgestack, consumed by pledgepack)
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

pledgepack runs the HTTP server. pledgestack injects middleware:

```
HTTP Request
  → pledgepack dev server (axum)
    → pledgestack middleware (SSR, RSC, API routes)
      → pledgepack module transform (Oxc)
        → Response (HTML / module / HMR payload)
```

pledgestack plugins register as pledgepack dev server middleware via the plugin system:

```typescript
// pledgestack SSR plugin
export default {
  name: 'pledgestack-ssr',
  devServerMiddleware(app) {
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

| pledgestack command | What it does internally |
|-----------------|----------------------|
| `pledgestack dev` | Calls `pledge dev` + injects framework middleware |
| `pledgestack build` | Calls `pledge build` + runs SSG/SSR post-build |
| `pledgestack start` | Starts production SSR server (Node.js, not pledgepack) |
| `pledgestack test` | Calls `pledge test` (pledgepack handles test runner) |
| `pledgestack analyze` | Calls `pledge analyze` (pledgepack handles analyzer) |
| `pledgestack migrate` | Calls `pledge migrate` (pledgepack handles migration) |

---

## GitHub Release Binary Naming Convention

pledgepack postinstall expects binaries at:
```
https://github.com/pledgeandgrow/pledgerepo/releases/latest/download/pledge-{target}.{ext}
```

| Platform | Target | Extension | Filename |
|----------|--------|-----------|----------|
| Windows x64 | `x86_64-pc-windows-msvc` | `.zip` | `pledge-x86_64-pc-windows-msvc.zip` |
| macOS arm64 | `aarch64-apple-darwin` | `.tar.gz` | `pledge-aarch64-apple-darwin.tar.gz` |
| macOS x64 | `x86_64-apple-darwin` | `.tar.gz` | `pledge-x86_64-apple-darwin.tar.gz` |
| Linux x64 | `x86_64-unknown-linux-gnu` | `.tar.gz` | `pledge-x86_64-unknown-linux-gnu.tar.gz` |
| Linux arm64 | `aarch64-unknown-linux-gnu` | `.tar.gz` | `pledge-aarch64-unknown-linux-gnu.tar.gz` |

Inside each archive: a single binary named `pledge` (Unix) or `pledge.exe` (Windows).

---

## Key Files Reference

### pledgepack (pledge-dev repo)
- `crates/cli/src/main.rs` — CLI entry point, all commands
- `crates/core/src/config.rs` — PledgeConfig struct, all config fields
- `crates/core/src/config_validate.rs` — Config validation with "Did you mean?" suggestions
- `crates/core/src/pipeline.rs` — Build pipeline (parse → transform → optimize → emit)
- `crates/core/src/transform.rs` — Oxc-based JS/TS/JSX transform
- `crates/core/src/module_graph.rs` — Module dependency graph
- `crates/core/src/router.rs` — File-based routing scanner (`scan_app_dir`)
- `crates/core/src/plugin_system.rs` — Plugin hooks, WASM sandbox
- `crates/core/src/html.rs` — HTML entry processing
- `crates/core/src/edge.rs` — Edge bundle generation
- `bin/pledge.js` — JS shim that resolves and spawns native binary
- `bin/postinstall.js` — Downloads binary from GitHub Releases
- `package.json` — npm package definition (`pledgepack@0.1.1`)

### pledgestack (pledgelabs/pledgestack repo)
- `packages/pledgepack/` — Mirror of pledgepack JS shim for monorepo dev
- `packages/pledgestack/` — Main framework package (to be built)

---

## Versioning Strategy

- **pledgepack** and **pledgestack** version independently
- pledgestack `package.json` specifies `pledgepack: "^0.1.1"` (caret range)
- Breaking changes in pledgepack require pledgestack to update its dependency range
- pledgestack can pin pledgepack version for stability: `pledgepack: "0.1.1"` (exact)

---

## Publishing Flow

```
1. Build pledgepack binary:     cargo build --release
2. Create GitHub Release:       gh release create v0.1.1 pledge-x86_64-pc-windows-msvc.zip
3. Publish pledgepack to npm:   npm publish (from pledgerepo)
4. Update pledgestack dependency:  pledgestack package.json → pledgepack: "^0.1.1"
5. Publish pledgestack to npm:     npm publish (from pledgelabs/pledgestack)
```

---

## What pledgestack Agent Needs to Know

1. **pledgepack is the bundler** — don't reimplement bundling, transforming, or dev server in pledgestack
2. **pledgestack wraps pledgepack** — spawn `pledge` binary via `runPledgepack()` from `pledgepack` package
3. **Use pledgepack plugins** — all framework features (RSC, SSR, routing) are implemented as pledgepack plugins
4. **Virtual modules** — use `resolveId` + `load` plugin hooks for `__pledge_router`, `__pledge_manifest`, etc.
5. **Config generation** — pledgestack generates `pledge.config.ts` from `pledgestack.config.ts`
6. **No Rust needed** — pledgestack is pure TypeScript/JavaScript
7. **Binary is automatic** — `npm install pledgepack` handles binary download via postinstall
8. **Dev server** — pledgepack runs the HTTP server, pledgestack injects middleware via plugins
9. **SSR server** — pledgestack runs its own Node.js server for production SSR (`pledgestack start`)
10. **Test runner** — use `pledge test` directly, pledgepack has full Vitest-compatible runner
