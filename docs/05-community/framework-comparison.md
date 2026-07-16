# PledgeStack — Competing Frameworks Analysis

## Frameworks We're Competing With

### 1. Next.js (Vercel)

The dominant full-stack React framework. Our primary reference and competitor.

**What they do well:**
- Massive ecosystem and community
- App Router with RSC
- Vercel deployment integration
- Extensive documentation
- Enterprise adoption

**Flaws we can improve:**
- **Slow builds** — Webpack/Turbopack builds are slow for large apps. PledgePack (Rust) can be 10x faster.
- **Turbopack is incomplete** — After years, Turbopack still doesn't fully replace Webpack. PledgePack is built from scratch in Rust with a clean architecture.
- **Node.js runtime overhead** — Production server runs on Node.js with significant overhead. PledgePack's Axum/Hyper server can handle 2-5x more requests/sec.
- **Bloated output** — Next.js production bundles include large runtimes. PledgePack can tree-shake more aggressively.
- **Complex caching** — The App Router cache system (`fetch` cache, full route cache, router cache) is confusing and poorly documented. PledgeStack can simplify with a single, clear caching layer.
- **Middleware limitations** — Next.js middleware runs in Edge runtime only, with no Node.js APIs. PledgeStack can offer both edge and Node middleware.
- **Slow dev server cold start** — Next.js dev server takes seconds to start. PledgePack can do sub-second cold starts.
- **HMR is unreliable** — Next.js HMR often requires full page reloads. PledgeStack can implement true React Fast Refresh.
- **No built-in Docker story** — Next.js Docker images are 200MB+. PledgePack can ship <10MB images.
- **Vercel lock-in** — Many features (Edge functions, image optimization) only work on Vercel. PledgeStack is platform-agnostic.
- **Config complexity** — `next.config.js` has grown to hundreds of options. PledgeStack keeps config minimal.

---

### 2. Remix (Shopify)

Full-stack React framework focused on web standards and progressive enhancement.

**What they do well:**
- Web standard APIs (`Request`/`Response`)
- Excellent data loading (`loader`/`action`)
- Nested routes with automatic error boundaries
- Progressive enhancement
- Clean mental model

**Flaws we can improve:**
- **No RSC** — Remix doesn't support React Server Components. PledgeStack does.
- **Loader/action pattern is verbose** — Every route needs a `loader` export. PledgeStack uses server components directly for data fetching.
- **No static generation** — Remix is SSR-first. No SSG/ISR. PledgeStack supports all modes.
- **Shopify ecosystem lock-in** — Remix is increasingly tied to Shopify Hydrogen. PledgeStack is independent.
- **No Rust tooling** — Remix uses esbuild/rollup. PledgePack is Rust-native.
- **Progressive enhancement is limiting** — Remix's commitment to working without JS constrains the API. PledgeStack embraces client-side richness.
- **No edge runtime by default** — Remix requires adapter configuration for edge. PledgeStack has first-class edge support.

---

### 3. Astro

Content-focused framework with pledge architecture.

**What they do well:**
- Zero-JS by default
- Multi-framework support (React, Vue, Svelte, Solid)
- Excellent for content sites
- Fast page loads
- Great DX for Markdown/MDX

**Flaws we can improve:**
- **Not a React framework** — Astro is framework-agnostic. PledgeStack is React-first, which means better React integration (RSC, hooks, context).
- **Pledges are limited** — Astro's pledges can't share state, can't stream, can't do RSC. PledgeStack has full React tree with streaming.
- **No server components** — Astro doesn't support RSC. PledgeStack does.
- **No API routes** — Astro needs an adapter for API endpoints. PledgeStack has built-in `route.ts`.
- **No SSR streaming** — Astro renders to static HTML. PledgeStack streams.
- **Not for apps** — Astro is for content sites. PledgeStack is for full-stack applications.
- **Build tooling is Vite-based** — Still JavaScript tooling. PledgePack is Rust.

---

### 4. Nuxt (NuxtLabs)

Full-stack Vue framework.

**What they do well:**
- Excellent Vue integration
- Auto-imports
- Nitro server engine
- Good DX

**Flaws we can improve:**
- **Vue, not React** — Different ecosystem. PledgeStack is React. This is a fundamental choice, not a flaw.
- **Nitro is Node.js-based** — No Rust runtime. PledgePack is Rust.
- **No RSC equivalent** — Vue doesn't have server components. PledgeStack has RSC.
- **Smaller ecosystem** — Vue ecosystem is smaller than React. PledgeStack leverages React's massive ecosystem.
- **Slower builds** — Vite-based builds. PledgePack is Rust-native.

---

### 5. SvelteKit (Vercel)

Full-stack Svelte framework.

**What they do well:**
- Compile-time reactivity (no virtual DOM)
- Small bundle sizes
- Excellent DX
- Fast runtime

**Flaws we can improve:**
- **Svelte, not React** — Different ecosystem. PledgeStack is React.
- **No RSC** — Svelte doesn't have server components.
- **No Rust tooling** — Uses Vite. PledgePack is Rust.
- **Smaller ecosystem** — Svelte ecosystem is smaller than React.
- **No edge runtime** — SvelteKit requires adapters for edge deployment.
- **Limited SSR streaming** — SvelteKit's streaming is less mature than React's.

---

### 6. Solid Start (SolidJS)

Full-stack Solid framework.

**What they do well:**
- Fine-grained reactivity (no virtual DOM)
- Extremely fast runtime
- Small bundle sizes

**Flaws we can improve:**
- **Solid, not React** — Different ecosystem. PledgeStack is React.
- **Incomplete** — Solid Start is still in beta. PledgeStack aims for production stability.
- **No RSC** — Solid doesn't have server components.
- **Small ecosystem** — Solid ecosystem is tiny compared to React.
- **No Rust tooling** — Uses Vite. PledgePack is Rust.
- **No edge runtime** — No first-class edge support.

---

### 7. Qwik (Builder.io)

Resumable framework — no hydration needed.

**What they do well:**
- Zero hydration — instant interactivity
- Resumability is innovative
- Excellent Lighthouse scores
- Lazy-loading everything

**Flaws we can improve:**
- **Not React** — Qwik has its own component model. PledgeStack is React.
- **Tiny ecosystem** — Almost no third-party libraries.
- **No RSC** — Qwik doesn't use React Server Components.
- **Complex mental model** — Resumability requires understanding `$()` suffixes and lazy boundaries.
- **No Rust tooling** — Uses Vite. PledgePack is Rust.
- **Builder.io lock-in** — Qwik is tightly coupled to Builder.io's vision and platform.
- **Not proven at scale** — Few production deployments. PledgeStack follows proven Next.js patterns.

---

### 8. TanStack Start (TanStack)

Emerging full-stack React framework using TanStack Router.

**What they do well:**
- Type-safe routing
- Excellent DX
- Built on TanStack Router (best-in-class type safety)
- Framework-agnostic core

**Flaws we can improve:**
- **Very new** — Still in early development. PledgeStack is further along.
- **No Rust tooling** — Uses Vite. PledgePack is Rust.
- **No RSC** — TanStack Start doesn't support React Server Components yet.
- **No production server** — No built-in production runtime. PledgePack includes Axum/Hyper server.
- **No SSG/ISR** — No static generation. PledgeStack supports all rendering modes.
- **No edge runtime** — No edge deployment story.
- **No middleware** — No middleware convention. PledgeStack has `middleware.ts`.

---

### 9. Expo (Expo)

React Native / universal framework.

**What they do well:**
- Cross-platform (iOS, Android, Web)
- Excellent mobile DX
- EAS Build/Submit
- Large ecosystem

**Flaws we can improve:**
- **Mobile-first, not web-first** — Expo's web support is secondary. PledgeStack is web-first.
- **No RSC on web** — Expo's web rendering doesn't use RSC. PledgeStack does.
- **No Rust tooling** — Uses Metro bundler. PledgePack is Rust.
- **No SSG/ISR for web** — Expo doesn't pre-render web pages. PledgeStack does.
- **Bundle size** — Expo web bundles are large. PledgeStack tree-shakes aggressively.
- **Not a web server** — Expo doesn't run a server. PledgeStack has a full server runtime.

---

## Our Differentiators

| Feature | Next.js | Remix | Astro | Nuxt | SvelteKit | **PledgeStack** |
|---------|---------|-------|-------|------|-----------|--------------|
| Rust compiler | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Rust server runtime | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| RSC | ✅ | ❌ | ❌ | ❌ | ❌ | **✅** |
| SSR streaming | ✅ | ✅ | ❌ | ✅ | Partial | **✅** |
| SSG | ✅ | ❌ | ✅ | ✅ | ✅ | **✅** |
| ISR | ✅ | ❌ | ❌ | Partial | ❌ | **✅** |
| API routes | ✅ | ✅ | ❌ | ✅ | ✅ | **✅** |
| Middleware | ✅ | ✅ | ❌ | ✅ | ✅ | **✅** |
| Edge runtime | ✅ | ✅ | ✅ | ✅ | Partial | **✅** |
| File-based routing | ✅ | ✅ | ✅ | ✅ | ✅ | **✅** |
| Docker <10MB | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Platform-agnostic | Partial | ✅ | ✅ | ✅ | ✅ | **✅** |
| Sub-second dev start | ❌ | ❌ | ✅ | ❌ | ✅ | **✅** |

## Strategy

1. **Don't fight Next.js on ecosystem** — We can't match Vercel's marketing budget or community size. We compete on speed and simplicity.
2. **Rust is the wedge** — Faster builds, faster runtime, smaller images. This is objectively measurable.
3. **Follow conventions, not invent them** — Next.js conventions are familiar. We keep them, we just execute faster.
4. **Be platform-agnostic** — No Vercel lock-in equivalent. Deploy anywhere with a 10MB Docker image.
5. **Keep it simple** — One config file, one binary, one framework. No adapters, no plugins for core functionality.
