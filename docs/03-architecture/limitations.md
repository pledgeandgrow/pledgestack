# PledgeStack — Current Limitations

## Build & Bundling

- **PledgePack binary required** — The Rust binary (`pledgepack@^0.1.1`) is installed from npm via postinstall. If the binary download fails (network issues, unsupported platform), builds will not work.
- **No tree-shaking yet** — PledgePack does not yet tree-shake unused exports from production bundles (roadmap #56).
- **No CSS code splitting** — Tailwind output is a single CSS file (roadmap #57).
- **No source maps in production** — Production builds don't generate source maps (roadmap #59).
- **No minification** — Production code is not minified (roadmap #60).

## Rendering

- **RSC buffers in some paths** — `renderRSCToHTML` buffers the entire stream before returning in certain code paths. The streaming SSR pipeline (`renderToPipeableStream`) pipes directly.
- **No selective hydration** — All client components hydrate simultaneously, no prioritization (roadmap #19).
- **No `use client` / `use server` directive parsing** — PledgeStack uses the Pledge System (`pledge()` HOC) instead of file-level directives. This is by design, not a limitation.

## Data & Caching

- **No remote cache** — Build cache is local only. No remote cache server for CI/team sharing (roadmap #62).

## Client Routing

- **No route-level code splitting on client** — All client code is in a single `client.js` bundle. PledgePack will handle this in a future release (roadmap #56-57).

## Deployment

- **No Rust production server** — `pledgepack serve` (Rust HTTP server) is not yet implemented (roadmap #48). Production server uses Node.js.
- **No multi-process cluster mode** — `pledge serve --workers N` not yet available (roadmap #54).
- **Edge adapters untested** — Edge handler and adapters exist for Cloudflare, Vercel, Deno, AWS Lambda, and Netlify, but have not been tested against all actual edge platforms.

## TypeScript

- **No generated route types** — No auto-generated route types (like Next.js `__generated__` types). Type safety is enforced via `pledgestack-shared` types and strict mode.

## Testing

- **No integration test suite** — Framework end-to-end tests not yet written (roadmap #64).
- **No E2E test suite** — Playwright tests for playground app not yet written (roadmap #65).
- **No performance benchmarks** — Automated benchmarks vs Next.js not yet set up (roadmap #67).

## Security

- **No ReDoS prevention** — Safe regex validation on user inputs not yet implemented (roadmap #104).
- **No Subresource Integrity (SRI)** — Auto-generated `integrity` attributes for external scripts not yet implemented (roadmap #108).
- **No Trusted Types enforcement** — CSP `require-trusted-types` not yet implemented (roadmap #109).
