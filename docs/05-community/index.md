# Community

## Topics

- [Roadmap](./roadmap.md) — 96 goals to production across 12 phases
- [Framework Comparison](./framework-comparison.md) — How PledgeStack compares to Next.js, Remix, Astro, etc.
- [Not Needed](./not-needed.md) — Features intentionally excluded from PledgeStack

## Packages

All packages install with a single `npm install pledgestack`:

| Subpath | Package | Description |
|---------|---------|-------------|
| `pledgestack` | `@pledgestack/core` | Routing, rendering, filesystem utilities |
| `pledgestack/server` | `@pledgestack/server` | Node/edge server, handler, HMR, health, metrics, CDN purge |
| `pledgestack/client` | `@pledgestack/client` | Hydration, router, islands, prefetch, form hooks |
| `pledgestack/auth` | `@pledgestack/auth` | Sessions, OAuth, CSP, SSRF, XSS, audit logging, env validation |
| `pledgestack/state` | `@pledgestack/state` | Store, URL state, cross-tab sync, optimistic UI, persistence |
| `pledgestack/api` | `@pledgestack/api` | API routes, versioning, validation, OpenAPI, uploads, cron, queue |
| `pledgestack/a11y` | `@pledgestack/a11y` | Accessibility audit, focus management, keyboard nav, RTL, i18n |
| `pledgestack/overlay` | `@pledgestack/overlay` | Error overlay, DevTools, route/cache inspector |
| `pledgestack/seo` | `@pledgestack/seo` | JSON-LD structured data, meta tags, social cards |

Standalone packages (separate install):

| Package | Description |
|---------|-------------|
| `@pledgestack/image` | Image optimization component |
| `@pledgestack/font` | Font optimization with subsetting |
| `@pledgestack/mdx` | MDX support |
| `@pledgestack/og` | OpenGraph image generation |
| `@pledgestack/sitemap` | Sitemap and robots.txt generation |
| `@pledgestack/rss` | RSS/Atom/JSON feed generation |
| `@pledgestack/ws` | WebSocket route support |
| `@pledgestack/adapters` | Cloudflare, Vercel, Deno, AWS Lambda, Netlify adapters |

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup, code style, and PR workflow.

## Code of Conduct

See [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](../../SECURITY.md) for vulnerability reporting.
