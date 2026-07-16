# PledgeStack — Not Needed / Out of Scope

Things we are explicitly **not** building. These are either solved by the ecosystem, unnecessary for our architecture, or actively harmful to our goals.

## We Don't Need

- **Custom package manager** — pnpm is excellent. We use it, we don't replace it.
- **Custom TypeScript compiler** — `tsc` or `swc` handles this. PledgePack may use `oxc` for parsing but not full TS type checking.
- **Custom CSS engine** — Tailwind v4 + native CSS is enough. No custom CSS-in-JS runtime.
- **Custom test runner** — Use `vitest` or `node:test`. Don't reinvent.
- **Custom linter** — Use ESLint. We'll write a plugin, not a replacement.
- **Custom formatter** — Use Prettier. Don't reinvent.
- **Custom VS Code language server** — TypeScript language server already works. We add an extension for file icons and config IntelliSense, not a language server.
- **GraphQL layer** — Not opinionated about data fetching. Use `fetch()`, tRPC, or whatever. We provide `cachedFetch()`, not a query layer.
- **ORM / database layer** — Not our job. Use Drizzle, Prisma, Kysely, or raw drivers.
- **Auth system** — Basic auth helpers (`pledgestack/auth`) for sessions, OAuth, CSP, SSRF, XSS, audit logging. Not a full identity provider. Use Auth0, Clerk, or your own for complex flows.
- **CMS** — Not a CMS. Not a headless CMS. Not a CMS plugin.
- **Email sending** — Not built-in. Use Resend, Nodemailer, etc.
- **Queue / job system** — Basic `CronScheduler` and `JobQueue` in `pledgestack/api` for simple scheduling. For production queues, use BullMQ, Inngest, etc.
- **Realtime / WebSocket server** — `pledgestack-ws` provides WebSocket route support. Not a full pub/sub system.
- **File upload handling** — `pledgestack/api` provides `handleUpload` with magic number validation and size limits. For large-scale uploads, use a third-party service.
- **Image optimization CDN** — Not building a CDN. PledgePack's asset pipeline handles hashing and format, not on-the-fly optimization.
- **Analytics** — Not built-in. Use Vercel Analytics, Plausible, PostHog, etc.
- **A/B testing framework** — Not built-in. Cookie-based cache variants enable this, but we don't ship a testing UI.
- **Feature flag system** — Not built-in. Use LaunchDarkly, PostHog, or env vars.
- **State management library** — `pledgestack/state` provides built-in primitives (`createStore`, `useUrlState`, `useCrossTabState`, `useFormState`, `useOptimisticState`). For complex apps, Zustand/Jotai/Redux still work great alongside it.
- **Component library** — Not shipping UI components. Use shadcn/ui, Radix, or your own.
- **Mobile / React Native** — Not a mobile framework. Web only.
- **Static export to non-HTML** — Not generating PDFs, XML, etc. from routes. Use API routes for that.

## We Don't Need (From Next.js)

- **Pages router** — App directory only. No `pages/` directory. No migration path. Clean break.
- **`getServerSideProps` / `getStaticProps`** — Replaced by `generateMetadata`, server components, and route segment config.
- **`_app.tsx` / `_document.tsx`** — Replaced by root `layout.tsx`.
- **Custom `_error.tsx`** — Replaced by `error.tsx` per segment.
- **API routes in `pages/api/`** — Replaced by `route.ts` in app directory.
- **`next/image` component** — Not building a custom image component. Use `<img>` with PledgePack's asset hashing, or a third-party optimizer.
- **`next/font`** — Not building a custom font loader. Use `@font-face` or a font service.
- **`next/script`** — Not needed. Use `<script>` tags in layout or head.
- **`next/legacy/image`** — No legacy anything.
- **Internationalization (i18n) config in framework** — `pledgestack/a11y` provides RTL support (`useRtl`), translation extraction (`extractTranslations`), and ICU message validation. For full i18n, use `next-intl`, `i18next`, or your own. Middleware handles locale routing.
- **AMP support** — Dead technology. Not supporting it.
- **Edge Middleware with Node.js APIs** — Middleware runs in a constrained runtime. No `fs`, no `child_process`. This is by design.

## We Don't Need (From Other Frameworks)

- **File-based routing with config files per route** (Remix `loader`/`action` exports) — We use `page.tsx` + `route.ts` conventions, not co-located loaders.
- **HTML-first / progressive enhancement** (Remix/Qwik) — We're a React framework. Client-side hydration is the default, not progressive enhancement.
- **Resumability** (Qwik) — Interesting concept but requires a completely different rendering model. Not compatible with React's hydration model.
- **Signals-based reactivity** (Solid/Qwik) — We use React's reactivity. No signals.
- **No virtual DOM** (Solid/Svelte) — We use React. Virtual DOM is part of the deal.
- **Compile-time framework** (Svelte/Astro Pledges) — We're a runtime framework. PledgePack compiles bundles, not components.
- **Multi-framework support** (Astro) — React only. No Vue, Svelte, or Solid components.
- **Zero-JS by default** (Astro) — We ship JS. React needs it. We minimize it, but we don't pretend to be static.
