# PledgeStack Limitations

Known limitations, trade-offs, and areas for improvement.

---

## Bundler — PledgePack

All previously listed PledgePack limitations have been resolved. See [pledgepack/LIMITATIONS.md](../pledgepack/LIMITATIONS.md) for the full list of resolved items.

---

## SSR — Server-Side Rendering (Node.js Runtime)

### Current State
SSR is implemented for page rendering with layout chains, error boundaries, and Suspense loading states. SSR runs in Node.js via the PledgeStack server runtime, not in the native Rust binary. However, 8 Rust native addon crates (`rust-html`, `rust-ssr`, `rust-rsc`, `rust-html-transformer`, `rust-dom-renderer`, `rust-rsc-deserializer`, `rust-ssr-profiler`, `rust-hydration`) provide native rendering for static parts. All addons have automatic JS fallback when not compiled.

### Impact
SSR performance for static parts is accelerated by Rust native addons. Dynamic React rendering still runs in V8. When native addons are unavailable, the framework falls back to JavaScript implementations seamlessly — no errors, just JS-level performance.

### Plan
Continue optimizing the hybrid SSR orchestration to classify more components as static (Rust-renderable) and reduce the dynamic portion that requires V8.

---

## RSC — React Server Components (Node.js Runtime)

### Current State
RSC is integrated via `react-server-dom-webpack` with streaming and client manifests. `renderRSCToHTML` and `renderRSCStream` are the supported RSC rendering entry points. The `rust-rsc` native addon provides flight serialization with swc-based module analysis, with React Server DOM fallback. The `rust-rsc-deserializer` native addon handles client-side deserialization.

### Impact
RSC rendering performance is accelerated by Rust native addons for serialization. The Rust dev server handles static assets and HMR; RSC requests are proxied to a Node.js process for dynamic rendering.

### Plan
Continue expanding the Rust RSC serializer to handle more edge cases and reduce reliance on Node.js for RSC payload generation.

---

## No Built-in Data Fetching Hooks

### Current State
PledgeStack provides `cachedFetch()`, `serverCachedFetch()`, and `unstable_cache()` for server-side data fetching. Client-side data hooks are fully implemented: `useFetch`, `useSWR`, `useMutation`, `useInfiniteQuery`, `usePaginatedQuery`, `useOptimisticMutation`, `useSubscription`, `useRustQuery`, `useRustMutation` are available from `pledgestack/client`. Client-side revalidation API (`revalidateTag`, `revalidatePath`, `mutate`) is also available. Offline-first data layer with IndexedDB cache and background sync is implemented.

### Impact
Comprehensive client-side data fetching is built-in. SWR/React Query integration is no longer needed for most use cases.

### Plan
Continue expanding Rust-backed data hooks and optimizing NAPI caching for `useRustQuery`.

---

## No Storybook Integration

### Current State
PledgeStack has built-in Storybook integration via `pledge storybook` command with zero-config setup using PledgePack as builder. Auto-discovers `*.stories.tsx` files.

### Impact
Component isolation and visual testing are available out of the box.

### Plan
Continue improving Storybook compatibility and adding framework-specific features.

---

## No Streaming Metadata

### Current State
Streaming metadata is implemented. `<title>` and `<meta>` tags are injected via a streaming HTML transformer that patches `<head>` after initial flush. Async `generateMetadata()` does not block the first byte.

### Impact
Pages with async `generateMetadata()` that depends on slow data sources no longer delay the initial HTML response.

### Plan
Continue optimizing the streaming HTML transformer for edge runtime compatibility.

---

## Static Export — Full Site Generation

### Current State
`generateStaticExport` is wired into the `pledge build` CLI command when `config.output === 'export'`. It iterates all routes, expands dynamic routes via `generateStaticParams`, and writes static HTML files using SSR rendering. This replaces the older `generateStaticPages` for full static export mode.

### Impact
Full static export mode (`output: 'export'`) is now fully functional. Regular builds still use `generateStaticPages` for incremental SSG.

---

## Instrumentation — Lifecycle Hooks

### Current State
`loadInstrumentation` is wired into both Node.js (`startNodeServer`) and edge (`createEdgeHandler`) server startup. It loads `instrumentation.ts` from the app root and calls its `register()` export before any requests are handled. Used for OpenTelemetry setup, DB pool initialization, feature flag bootstrap, etc.

### Impact
Instrumentation hooks are now active at server startup. Previously, the `instrumentation.ts` convention was documented but not wired into the server lifecycle.

---

## No Generated Route Types

### Current State
PledgeStack auto-generates `__pledge_route_types.d.ts` from the file-based router at build time. Includes typed `params`, `searchParams`, layout chain types, and route metadata. Route type-safe navigation is supported via `TypedRouter` interface with compile-time route param validation.

### Impact
Route parameters and search params are statically typed at the route level. Developers get compile-time validation for navigation.

### Plan
Continue expanding type generation to cover more edge cases and route patterns.

---

## PSX / PS Format — Rust Integration

### Current State
PledgeStack supports `.psx` (Rust + TypeScript/JSX) and `.ps` (pure Rust) file formats. Rust code compiles to native `.node` addons via `cargo` with auto-generated NAPI bindings and TypeScript types. Workspace-based `Cargo.toml` manages dependencies with `pledge add/remove/list` CLI commands. Batch API, binary protocol, and Rust SSR are implemented. PSX HMR with incremental `cargo build` is implemented. Source maps map Rust code positions back to `.psx`/`.ps` source lines. `println!` output is captured and redirected to `console.log`.

All 15 PSX integration classes (SQLx, Redis, Auth, Image, PDF, Jobs, Cron, Email, HTTP, WebSocket, File, Tracing, Crypto, ML) have JS fallback implementations that activate when native Rust addons are unavailable. Fallbacks use npm packages (pg, mysql2, ioredis, argon2, bcryptjs, jsonwebtoken, sharp, xlsx, nodemailer, puppeteer, ws) or Node.js built-ins (node:crypto, fetch, PBKDF2, HMAC-SHA256).

8 Rust native addon crates for the rendering pipeline (`rust-html`, `rust-ssr`, `rust-rsc`, `rust-html-transformer`, `rust-dom-renderer`, `rust-rsc-deserializer`, `rust-ssr-profiler`, `rust-hydration`) are implemented with NAPI bindings and JS fallbacks.

80+ tests cover all render modules and PSX integrations using Vitest.

### Impact — Limitations
- **Rust toolchain required** — `cargo` must be installed to compile `.psx`/`.ps` files. Fallback stubs are provided if absent. PSX integrations fall back to JS implementations.
- **Slow compile times** — First build 30-60s, incremental 2-10s. Compare: esbuild transforms `.tsx` in 50ms.
- **Rust knowledge barrier** — Writing `.psx`/`.ps` requires Rust knowledge (ownership, lifetimes, borrowing).
- **Smaller Rust web ecosystem** — No Prisma GUI, no Stripe SDK, no Auth0/NextAuth equivalent in Rust. PSX integrations bridge this gap with JS fallbacks using npm packages.
- **Debugging across boundary** — Stack traces don't cross JS→Rust cleanly. Source maps and `println!` bridge help but are not perfect.
- **No full IDE support** — VS Code extension exists with syntax highlighting but no full IntelliSense for Rust inside `<rust>` blocks yet.
- **Two toolchains** — `package.json` + `Cargo.toml`, two lockfiles, two update processes.
- **Regex-based parser** — Not a real Rust AST parser. Edge cases may not parse correctly. Will be replaced with syn-based parser.

### Plan
- Replace regex parser with a proper Rust AST parser (syn-based)
- Build VS Code extension with full IntelliSense for `.psx` files
- Add PSX debugger with DAP support
- Implement incremental compilation cache with sccache
- Production testing and edge case hardening
