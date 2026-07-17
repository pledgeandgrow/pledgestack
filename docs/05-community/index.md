# Community

## Topics

- [Roadmap](./roadmap.md) — 194 goals across 21 phases (194/194 complete, all phases done)
- [Framework Comparison](./framework-comparison.md) — How PledgeStack compares to Next.js, Remix, Astro, etc.
- [Not Needed](./not-needed.md) — Features intentionally excluded from PledgeStack

## Packages

All sub-packages are bundled into a single npm package — install with `npm install pledgestack`:

| Subpath | Internal Package | Description |
|---------|-----------------|-------------|
| `pledgestack` | `pledgestack-core` | Routing, rendering, filesystem utilities |
| `pledgestack/server` | `pledgestack-server` | Node/edge server, handler, HMR, health, metrics, CDN purge |
| `pledgestack/client` | `pledgestack-client` | Hydration, router, islands, prefetch, form hooks |
| `pledgestack/auth` | `pledgestack-auth` | Sessions, OAuth 2.1/OIDC, JWT (RS256/ES256), TOTP/2FA, WebAuthn/passkeys, RBAC, ABAC, API keys, SAML SSO, CSP, CSRF, XSS, SSRF, ReDoS prevention, Trusted Types, cross-origin isolation, CORP/COEP, referrer policy, permissions policy, audit logging, env validation |
| `pledgestack/state` | `pledgestack-state` | Store, URL state, cross-tab sync, optimistic UI, persistence |
| `pledgestack/api` | `pledgestack-api` | API routes, versioning, validation, OpenAPI, uploads, cron, queue |
| `pledgestack/a11y` | `pledgestack-a11y` | Accessibility audit, focus management, keyboard nav, RTL, i18n |
| `pledgestack/overlay` | `pledgestack-overlay` | Error overlay, DevTools, route/cache inspector |
| `pledgestack/seo` | `pledgestack-seo` | JSON-LD structured data, meta tags, social cards |
| `pledgestack/image` | `pledgestack-image` | Responsive srcset, WebP/AVIF, lazy loading, LQIP blur placeholders, responsive sizes |
| `pledgestack/font` | `pledgestack-font` | Automatic subsetting, preloading, font-display swap, size-adjust fallback metrics |
| `pledgestack/mdx` | `pledgestack-mdx` | MDX support for Markdown/MDX pages and content |
| `pledgestack/og` | `pledgestack-og` | Dynamic OpenGraph image generation with Satori |
| `pledgestack/sitemap` | `pledgestack-sitemap` | Automatic sitemap.xml generation from route tree |
| `pledgestack/rss` | `pledgestack-rss` | RSS, Atom, JSON feed generation for content sites |
| `pledgestack/ws` | `pledgestack-ws` | WebSocket real-time routes with pub/sub support |
| `pledgestack/adapters` | `pledgestack-adapters` | Edge adapters for Cloudflare, Vercel, Deno, Lambda, Netlify |
| `pledgestack/privacy` | `pledgestack-privacy` | GDPR/CCPA compliance, PII redaction, AES-256-GCM encryption, consent management |

All sub-packages are private in the monorepo and bundled into the `pledgestack` CLI via esbuild at build time. No separate installation is needed.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup, code style, and PR workflow.

## Code of Conduct

See [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](../../SECURITY.md) for vulnerability reporting.
