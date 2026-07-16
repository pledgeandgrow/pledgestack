# PledgeStack

A full-stack React framework with file-based routing, SSR, SSG, RSC, API routes, middleware, and edge runtime support.

## Quick Start

```bash
# Create a new project
npx pledgestack create my-app
cd my-app
pnpm install
pnpm dev
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `pledgestack dev` | Start dev server with HMR |
| `pledgestack build` | Build for production |
| `pledgestack start` | Start production server |
| `pledgestack create [name]` | Scaffold a new project |
| `pledgestack info` | Show environment info |
| `pledgestack doctor` | Diagnose common issues |

## Configuration

Create a `pledge.config.ts` in your project root:

```ts
import { defineConfig } from 'pledgestack';

export default defineConfig({
  appDir: 'app',
  publicDir: 'public',
  outDir: '.pledge',
  defaultRuntime: 'node',
  rsc: true,
  tailwind: true,
});
```

## App Directory Structure

```
app/
├── layout.tsx       # Root layout
├── page.tsx         # Home page
├── head.tsx         # Head metadata
├── loading.tsx      # Loading UI
├── error.tsx        # Error boundary
├── not-found.tsx    # 404 page
├── about/
│   └── page.tsx     # /about
├── api/
│   └── route.ts     # API endpoint
└── [slug]/
    └── page.tsx     # Dynamic route
```

## License

MIT
