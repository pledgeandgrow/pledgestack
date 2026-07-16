# Community

## Topics

- [Roadmap](./roadmap.md) — 196 goals across 21 phases
- [Framework Comparison](./framework-comparison.md) — How PledgeStack compares to Next.js, Remix, Astro, etc.
- [Not Needed](./not-needed.md) — Features intentionally excluded from PledgeStack

## Packages

All sub-packages are bundled into a single npm package — install with `npm install pledgestack`:

| Subpath | Internal Package | Description |
|---------|-----------------|-------------|
| `pledgestack` | `pledgestack-core` | Routing, rendering, filesystem utilities |
| `pledgestack/server` | `pledgestack-server` | Node/edge server, handler, HMR, health, metrics, CDN purge |
| `pledgestack/client` | `pledgestack-client` | Hydration, router, islands, prefetch, form hooks |
| `pledgestack/auth` | `pledgestack-auth` | Sessions, OAuth, CSP, SSRF, XSS, audit logging, env validation |
| `pledgestack/state` | `pledgestack-state` | Store, URL state, cross-tab sync, optimistic UI, persistence |
| `pledgestack/api` | `pledgestack-api` | API routes, versioning, validation, OpenAPI, uploads, cron, queue |
| `pledgestack/a11y` | `pledgestack-a11y` | Accessibility audit, focus management, keyboard nav, RTL, i18n |
| `pledgestack/overlay` | `pledgestack-overlay` | Error overlay, DevTools, route/cache inspector |
| `pledgestack/seo` | `pledgestack-seo` | JSON-LD structured data, meta tags, social cards |

All sub-packages are private in the monorepo and bundled into the `pledgestack` CLI via esbuild at build time. No separate installation is needed.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup, code style, and PR workflow.

## Code of Conduct

See [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](../../SECURITY.md) for vulnerability reporting.
