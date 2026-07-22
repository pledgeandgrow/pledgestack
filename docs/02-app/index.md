# App Directory

## File Conventions

| File | Purpose |
|------|---------|
| `page.tsx` | Page component — renders route UI |
| `page.psx` | Page with inline Rust — Rust + TypeScript/JSX combined |
| `layout.tsx` | Layout component — wraps child pages and layouts |
| `route.ts` | API route handler — exports HTTP method functions |
| `route.ps` | Pure Rust API route — no JSX, just Rust backend logic |
| `loading.tsx` | Loading UI — Suspense fallback during streaming |
| `error.tsx` | Error boundary — catches errors in the segment |
| `global-error.tsx` | Top-level error boundary — replaces root layout on unrecoverable errors |
| `not-found.tsx` | 404 page — rendered when route is not found |
| `template.tsx` | Template — re-mounts on navigation (resets state) |
| `head.tsx` | Head component — per-route `<head>` management |
| `middleware.ts` | Middleware — redirect, rewrite, headers |
| `middleware.ps` | Pure Rust middleware — native-speed request processing |
| `instrumentation.ts` | Server lifecycle hooks — `register()` for startup initialization |

## Routing

### Static Routes

```
app/about/page.tsx        → /about
app/blog/page.tsx         → /blog
```

### Dynamic Routes

```
app/blog/[slug]/page.tsx  → /blog/:slug
app/shop/[...slug]/page.tsx → /shop/:slug*
```

### Route Groups

```
app/(marketing)/page.tsx  → /  (group doesn't affect URL)
app/(dashboard)/page.tsx  → /  (separate group, same URL)
```

### Parallel Routes

```
app/@analytics/page.tsx   → Named slot for dashboard layouts
```

### Intercepting Routes

```
app/(..)photo/[id]/page.tsx → Intercepts /photo/:id from parent segment
```

## Rendering Modes

| Mode | Description | When |
|------|-------------|------|
| SSR | Server renders HTML on each request | Default for pages |
| SSG | Pre-rendered at build time | `generateStaticParams` or static routes |
| RSC | Server Components streamed to client | `config.rsc = true` (default) |
| ISR | Static + background revalidation | `revalidate: N` on route segment config |
| API | JSON/response handlers | `route.ts` files |

## Topics

- [PSX Format](./psx-format.md) — Embed Rust in TypeScript with `.psx` and `.ps` files
- [Pledge System](./pledge-system.md) — Client/server boundaries with `pledge()` and `serverAction()`
