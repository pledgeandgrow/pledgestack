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
