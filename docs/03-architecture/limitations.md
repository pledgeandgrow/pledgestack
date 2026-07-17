# PledgeStack — Current Limitations

## Build & Bundling

- **PledgePack binary required** — The Rust binary (`pledgepack@^0.1.1`) is installed from npm via postinstall. If the binary download fails (network issues, unsupported platform), builds will not work. The framework falls back to Node.js-based builds in this case.
- **No remote cache** — Build cache is local only. No remote cache server for CI/team sharing.

## Rendering

- **RSC buffers in some paths** — `renderRSCToHTML` buffers the entire stream before returning in certain code paths. The streaming SSR pipeline (`renderToPipeableStream`) pipes directly.
- **No `use client` / `use server` directive parsing** — PledgeStack uses the Pledge System (`pledge()` HOC) instead of file-level directives. This is by design, not a limitation.

## Deployment

- **Rust production server not yet available on all platforms** — `pledgepack serve` (Rust HTTP server) requires the native binary. If unavailable, production server falls back to Node.js.
- **Edge adapters untested** — Edge handler and adapters exist for Cloudflare, Vercel, Deno, AWS Lambda, and Netlify, but have not been tested against all actual edge platforms.

## TypeScript

- **No generated route types** — No auto-generated route types (like Next.js `__generated__` types). Type safety is enforced via `pledgestack-shared` types and strict mode.

## Framework Self-Build

- **esbuild for framework bundling** — The framework itself uses esbuild (not PledgePack) to bundle the CLI package for npm publish. PledgePack is used to bundle user apps, not the framework itself. This is by design — same pattern as Next.js using webpack/turbopack for user apps while building Next.js itself with its own tooling.
