# API Reference

## CLI Commands

```bash
pledge dev          # Start dev server with HMR
pledge build        # Build for production
pledge start        # Start production server (PledgePack Rust server, Node.js fallback)
pledge create       # Scaffold a new app
pledge add          # Add Rust crates to project (e.g., pledge add sqlx argon2)
pledge remove       # Remove a Rust crate from project
pledge list         # List installed Rust crates
pledge info         # Print environment diagnostics
pledge doctor       # Diagnose and fix common issues
```

> The CLI command is `pledge` (not `pledgestack`). The npm package is `pledgestack`.

## PledgePack CLI (via `pledge`)

```bash
pledge dev            # Dev server with HMR
pledge build          # Production build
pledge build --watch  # Watch mode build
pledge build --profile # Profile build performance
pledge serve          # Serve production build (port 4000)
pledge bench          # Benchmark build performance
pledge analyze        # Bundle size analyzer
pledge test           # Run tests
pledge test --watch   # Watch mode tests
pledge cache clear    # Clear disk cache
pledge create react my-app  # Scaffold React project
pledge generate-env-types   # Generate env type declarations
```

## Configuration

### `pledge.config.ts`

```typescript
import { defineConfig } from 'pledgestack';

export default defineConfig({
  appDir: 'app',           // App directory (default: 'app')
  publicDir: 'public',     // Static assets (default: 'public')
  outDir: '.pledge',       // Build output (default: '.pledge')
  rsc: true,               // Enable React Server Components (default: true)
  tailwind: true,          // Enable Tailwind CSS (default: true)
  defaultRuntime: 'node',  // 'node' or 'edge' (default: 'node')
  output: 'standalone',    // 'standalone' or 'export' for static HTML
  pledgepack: {            // PledgePack build/bundler config
    sourceMaps: true,
    compressGzip: true,
    compressBrotli: true,
    devServer: {
      port: 3001,
      hmr: true,
    },
  },
});
```

### Framework Config (`UserConfig` from `pledgestack`)

```typescript
interface UserConfig {
  appDir: string;           // default: 'app'
  publicDir: string;        // default: 'public'
  outDir: string;           // default: '.pledge'
  defaultRuntime: 'node' | 'edge';
  rsc: boolean;
  tailwind: boolean;
  output: 'standalone' | 'export';
  i18n?: I18nConfig;
  plugins?: PledgePlugin[];
  pledgepack?: PledgePackConfig;
}

interface PledgePackConfig {
  framework?: 'react';
  sourceMaps?: boolean;
  envPrefix?: string;
  compressGzip?: boolean;
  compressBrotli?: boolean;
  devServer?: { port?: number; host?: string; hmr?: boolean };
  server?: { workers?: number; maxBodySize?: number; timeout?: number };
  edge?: { target?: 'cloudflare' | 'vercel' | 'deno' | 'lambda' | 'netlify'; excludeNodeBuiltins?: boolean; polyfills?: string[] };
}
```

## Subpath Imports

All sub-packages are bundled into the `pledgestack` npm package:

| Import | Description |
|--------|-------------|
| `pledgestack` | Core routing, rendering, filesystem |
| `pledgestack/server` | Node/edge server runtime |
| `pledgestack/client` | Hydration, router, prefetch |
| `pledgestack/auth` | Sessions, OAuth 2.1/OIDC, JWT, TOTP/2FA, WebAuthn, RBAC, ABAC, API keys, SAML SSO, CSP, CSRF, XSS, ReDoS, Trusted Types, cross-origin, permissions policy |
| `pledgestack/state` | Store, URL state, optimistic UI |
| `pledgestack/api` | API routes, validation, OpenAPI, cron |
| `pledgestack/a11y` | Accessibility, RTL, i18n helpers |
| `pledgestack/overlay` | Error overlay, DevTools |
| `pledgestack/seo` | JSON-LD, meta tags, social cards |
| `pledgestack/image` | Responsive srcset, WebP/AVIF, lazy loading, blur placeholders |
| `pledgestack/font` | Subsetting, preloading, font-display, size-adjust fallbacks |
| `pledgestack/mdx` | MDX support |
| `pledgestack/og` | OpenGraph image generation |
| `pledgestack/sitemap` | sitemap.xml generation |
| `pledgestack/rss` | RSS/Atom/JSON feed generation |
| `pledgestack/ws` | WebSocket routes |
| `pledgestack/adapters` | Edge adapters (Cloudflare, Vercel, Deno, Lambda, Netlify) |
| `pledgestack/privacy` | GDPR/CCPA compliance, PII redaction, encryption, consent management |

## PSX APIs

The following APIs are available when using `.psx` or `.ps` files:

### Rust Workspace Management

```typescript
import {
  ensureRootCargoToml,        // Ensures root Cargo.toml workspace exists
  generateModuleCargoToml,    // Generates per-module Cargo.toml (inherits workspace)
  detectCratesFromImports,    // Auto-detects crates from Rust `use` statements
  addCrate,                   // Adds a crate to root Cargo.toml
  removeCrate,                // Removes a crate from root Cargo.toml
  listCrates,                 // Lists installed crates
} from 'pledgestack';
```

### Batch API

```typescript
// Batch multiple Rust calls with one NAPI boundary crossing
const [users, posts, stats] = await rust.batch([
  () => rust.get_users(),
  () => rust.get_posts(),
  () => rust.get_stats(),
]);

// Transaction — all queries succeed or all fail
await rust.transactionSql([
  "INSERT INTO users (name) VALUES ('Alice')",
  "INSERT INTO audit_log (action) VALUES ('user_created')",
]);

// Prepared statement — query plan cached on Rust side
const admins = await rust.prepared(
  'SELECT * FROM users WHERE active = $1 AND role = $2',
  [true, 'admin']
);
```

### Binary Protocol

The PSXB binary protocol is used automatically for Rust↔JS data transfer. No API changes needed — data returned from Rust functions uses the binary format internally, providing 4x faster serialization than JSON.

### Rust SSR

Build-time static HTML extraction is automatic. PledgeStack analyzes `.psx` component trees and compiles static segments to Rust string templates. No API changes needed — the `__ssr_{module}()` function is generated and used internally.

### Native Rendering Pipeline APIs

```typescript
import {
  isRustSSRAvailable,        // Check if Rust SSR native addon is loaded
  renderRustSSR,             // Render via Rust SSR with fallback to React
} from 'pledgestack';

import {
  isRustHtmlEngineAvailable, // Check if Rust HTML engine is loaded
  renderHead,                // Render <head> from metadata
  renderHtmlShell,           // Render full HTML shell
  escapeHtml,                // HTML entity escaping
} from 'pledgestack';

import {
  isRustProfilerAvailable,   // Check if Rust SSR profiler is loaded
  startProfiling,            // Begin SSR profiling session
  stopProfiling,             // End session, returns SSRProfileResult
  withProfiling,             // Wrapper for profiling individual components
  exportSpeedscope,          // Export flamegraph in speedscope format
} from 'pledgestack';

import {
  isRustRSCSerializerAvailable, // Check if Rust RSC serializer is loaded
  analyzeModule,                // Analyze module for client/server components
} from 'pledgestack';

import {
  isRustHydrationGeneratorAvailable, // Check if hydration generator is loaded
  generateHydrationScript,           // Generate hydration script for a route
  generateInlineHydrationScript,     // Generate inline hydration script
} from 'pledgestack';

import {
  isRustHtmlTransformerAvailable, // Check if HTML transformer is loaded
  transformHtml,                  // Transform HTML with injection options
} from 'pledgestack';

import {
  isRustDomRendererAvailable, // Check if DOM renderer is loaded
  canRenderInRust,            // Check if element can be rendered in Rust
  markRustSafe,               // Mark component as safe for Rust rendering
  renderSimpleHtml,           // Simple HTML rendering without React
  renderRustDomToString,      // Render React element to HTML string
  chunksToReadableStream,     // Convert string chunks to ReadableStream
} from 'pledgestack';
```

All native addon APIs automatically fall back to JavaScript implementations when `.node` files are not compiled. No errors are thrown — functionality is preserved with JS-level performance.

### PSX Integration APIs

All 15 PSX integration classes are available from `pledgestack` and automatically use native Rust addons when available, falling back to Node.js packages when not:

```typescript
import {
  SqlxPool,           // PostgreSQL/MySQL via SQLx (fallback: pg/mysql2)
  RedisClient,        // Redis via rust-side (fallback: ioredis)
  RustAuth,           // Argon2/JWT auth (fallback: argon2/bcryptjs/PBKDF2, HMAC-SHA256 JWT)
  RustCrypto,         // AES-GCM/SHA-256/random (fallback: node:crypto)
  RustHttpClient,     // HTTP client via reqwest (fallback: native fetch)
  FileProcessor,      // Excel/CSV processing (fallback: xlsx, built-in CSV)
  ImageProcessor,     // Image manipulation (fallback: sharp)
  PdfGenerator,       // PDF generation (fallback: puppeteer)
  JobQueue,           // Background jobs via apalis (fallback: in-memory queue)
  CronScheduler,      // Cron scheduling (fallback: setInterval)
  EmailSender,        // SMTP email via lettre (fallback: nodemailer)
  RustTracing,        // Tracing/OpenTelemetry (fallback: console-based)
} from 'pledgestack';
```

#### Auth Fallback Chain

The `RustAuth` class implements a tiered fallback for password hashing:

1. **Native Rust addon** (Argon2 via NAPI) — fastest
2. **`argon2` npm package** — native Node.js binding
3. **`bcryptjs` npm package** — pure JS bcrypt
4. **PBKDF2 via `node:crypto`** — always available, no dependencies

For JWT signing/verification:

1. **Native Rust addon** — fastest
2. **`jsonwebtoken` npm package** — full JWT support
3. **HMAC-SHA256 pure JS** — always available, HS256 algorithm only

## Client-Side Data Hooks

Available from `pledgestack/client`:

```typescript
import { useFetch, useSWR, useMutation, SWRConfig } from 'pledgestack/client';

// Simple fetch with caching and deduplication
const { data, error, isLoading } = useFetch('/api/users');

// SWR — stale-while-revalidate
const { data, mutate } = useSWR('/api/users', fetcher, {
  revalidateOnFocus: true,
  dedupingInterval: 2000,
});

// Mutation with optimistic updates
const [trigger, { isLoading }] = useMutation('/api/users', {
  onMutate: (data) => {
    // Optimistic update
    mutate((current) => [...current, data], false);
  },
  onSuccess: () => {
    // Revalidate after success
    mutate();
  },
});

// Global config
<SWRConfig value={{ revalidateOnFocus: true, refreshInterval: 5000 }}>
  <App />
</SWRConfig>
```

### Advanced Data Hooks

```typescript
import {
  useInfiniteQuery,        // Cursor-based infinite scroll with SSR initial data
  usePaginatedQuery,       // Offset/limit pagination with URL-synced page state
  useOptimisticMutation,   // Optimistic updates with automatic rollback
  useSubscription,         // WebSocket/SSE real-time data streams
  useRustQuery,            // Rust-backed queries via NAPI with caching
  useRustMutation,         // Rust-backed mutations with cache invalidation
  prefetchQuery,           // Server-side query prefetching for SSR
  prefetchRustQuery,       // Server-side Rust query prefetching
  dehydrate,               // Serialize cache for SSR→client transfer
  hydrateCache,            // Hydrate client cache from dehydrated state
  useHydrate,              // Hook for hydrating cache on client
  enqueueMutation,         // Queue concurrent mutations with deduplication
  useQueuedMutation,       // Hook for queued mutations
  invalidateCache,         // Fine-grained cache invalidation by key pattern
  revalidatePattern,       // Glob pattern cache invalidation (*, **)
  useCrossTabSync,         // Cross-tab state synchronization via BroadcastChannel
  useOnlineStatus,         // Online/offline status hook
  useOfflineMutation,      // Offline-first mutation with Background Sync API
} from 'pledgestack/client';
```

### Client-Side Revalidation

```typescript
import { revalidateTag, revalidatePath, mutate } from 'pledgestack/client';

// Invalidate cached fetches by tag
await revalidateTag('users');

// Invalidate by path
await revalidatePath('/users');

// Combined batch revalidation
await mutate(['users', 'posts', 'stats']);
```

## Server Utilities

All server utilities are request-scoped via `AsyncLocalStorage` and must be called during request handling:

- `cookies()` — Read request cookies, or pass a setter to set response cookies
- `headers()` — Read request headers, or pass a setter to set response headers
- `searchParams()` — Access URL search params
- `params()` — Access route params
- `redirect(destination, status?)` — Type-safe redirect from server components, route handlers, middleware
- `notFound()` — Trigger 404 rendering from server components and route handlers
- `after(callback)` — Defer non-critical work (analytics, logging) until after response is sent
- `connection()` — Connection state in server components for streaming/edge readiness checks
- `draftMode()` — Toggle draft/preview mode
- `cachedFetch()` — Cached fetch with revalidation
- `revalidateTag(tag)` — Invalidate cached fetches by tag
- `revalidatePath(path)` — Invalidate cached fetches by path

## PledgePack Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entry` | `string[]` | `['src/index.tsx']` | Entry points |
| `framework` | `string` | `'react'` | Framework adapter |
| `source_maps` | `boolean` | `false` | Generate source maps |
| `env_prefix` | `string` | `'PLEDGE_'` | Env var prefix for client exposure |
| `env_dts` | `boolean` | `false` | Generate env type declarations |
| `compress_gzip` | `boolean` | `false` | Generate .gz files |
| `compress_brotli` | `boolean` | `false` | Generate .br files |
| `node_polyfills` | `boolean` | `false` | Polyfill Node.js builtins for browser |
| `html_entry` | `string` | `'index.html'` | HTML entry point |
| `edge_target` | `string` | — | Edge target: `cloudflare`, `vercel`, `deno` |

## PSX Audit Logging

Available from `pledgestack`:

```typescript
import {
  PsxAuditLogger,
  createAuditedRust,
  setAuditContext,
  getAuditContext,
  getDefaultPsxAuditLogger,
  setDefaultPsxAuditLogger,
  sanitizeArg,
} from 'pledgestack';

// Wrap the `rust` namespace from PSX codegen with audit logging
import { rust as rawRust } from './__psx_module';
const rust = createAuditedRust(rawRust, 'user-service', {
  console: true,
  filePath: '.pledge/psx-audit.log',
  maxArgLength: 200,
  sampleRate: 1,
});
const users = await rust.get_users(); // automatically logged

// Tag all Rust calls within a request with the route
setAuditContext({ route: '/api/users', module: 'user-service' });
```

### PsxAuditLogger Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `filePath` | `string` | `'.pledge/psx-audit.log'` | Log file path |
| `console` | `boolean` | `true` in dev | Also log to console |
| `maxArgLength` | `number` | `200` | Max argument value length before truncation |
| `redactKeys` | `string[]` | `['password', 'secret', ...]` | Keys to redact from arguments |
| `sampleRate` | `number` | `1` | Sampling rate (0-1) |
| `maxFileSize` | `number` | `50MB` | Max file size before rotation |
| `enabled` | `boolean` | `true` | Enable/disable audit logging |

## PSX Bundle Analysis

Available from `pledgestack`:

```typescript
import {
  analyzeBundle,
  formatBundleReport,
  saveBundleReport,
  loadBundleReport,
  parseCargoDependencies,
  formatBytes,
} from 'pledgestack';

// Analyze all .node addons
const result = analyzeBundle(projectRoot, nativeDir, previousReport);
console.log(formatBundleReport(result));
await saveBundleReport(result, '.pledge/bundle-report.json');
```

### CLI

```bash
pledge analyze                # Analyze bundle sizes
pledge analyze --suggestions  # Show optimization recommendations
pledge doctor --production    # Run production readiness checks
```

### Bundle Analysis Result

| Field | Type | Description |
|-------|------|-------------|
| `totalSizeBytes` | `number` | Total size of all `.node` addons |
| `addons` | `AddonSizeInfo[]` | Per-addon breakdown (sorted by size) |
| `crates` | `CrateSizeInfo[]` | Per-crate estimated sizes and alternatives |
| `warnings` | `BundleWarning[]` | Size warnings with suggestions |
| `sizeDelta` | `SizeDelta[]?` | Size changes since last build |
| `timestamp` | `string` | ISO timestamp of analysis |
