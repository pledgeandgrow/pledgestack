# PledgeStack — Current Limitations

## Critical

- **PledgePack binary not compiled** — The Rust binary (`pledgepack`) has no `Cargo.toml` or source files. All build/serve functionality is placeholder. The JS shim exists but delegates to a missing native binary.
- **No actual bundling** — PledgePack does not yet bundle client or server code. The dev server uses raw ESM imports with cache-busting, which works for dev but is not production-ready.
- **Module loader uses dynamic `import()`** — In dev, modules are loaded via `import()` with `?t=Date.now()` cache-busting. This bypasses Node's module cache but doesn't do any transformation (no JSX, no TypeScript stripping, no bundling).
- **No JSX/TSX transformation** — The dev server imports `.tsx` files directly. Node.js cannot execute TSX without a loader. This will fail at runtime unless a transformer (esbuild, swc) is integrated.

## Rendering

- **RSC not truly streaming** — `renderRSCToHTML` buffers the entire stream before returning. It should pipe directly to the HTTP response.
- **No `use client` / `use server` directive parsing** — All components are treated the same. There's no automatic splitting between server and client components.
- **No parallel routes** — `@slot` directories are not parsed or rendered.
- **No intercepting routes** — `(..)` intercept patterns are not supported.
- **No selective hydration** — All client components hydrate simultaneously, no prioritization.

## Data & Caching

- **No ISR** — `revalidate` on routes is not enforced. Stale pages are not revalidated in the background.
- **No `fetch()` cache with revalidation tags** — `cachedFetch()` exists but `fetch()` in RSC doesn't auto-cache.
- **No cookie-based cache variants** — Different cache variants based on cookie values (A/B testing) not implemented.

## Client Routing

- **No route-level code splitting on client** — All client code is in a single `client.js` bundle.

## Infrastructure

- **No static asset pipeline** — Images, fonts, and other assets are not processed, hashed, or optimized.
- **No CSS code splitting** — Tailwind output is a single CSS file.
- **No source maps** — Production builds don't generate source maps.
- **No minification** — Production code is not minified.

## TypeScript

- **No generated types** — No auto-generated route types (like Next.js `__generated__` types).

## Deployment

- **No Docker image** — No Dockerfile exists.
- **No Rust production server** — `pledgepack serve` is not implemented.
- **No edge deployment story** — Edge handler exists but is untested against actual edge platforms.
- **No standalone output mode** — No self-contained build output for deployment.
