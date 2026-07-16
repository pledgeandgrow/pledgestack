# Getting Started

## Installation

### Create a new project

```bash
# Using the scaffolding CLI
npx create-pledge-app my-app

# Or with pnpm
pnpm create pledgestack my-app

cd my-app
pnpm install
```

The CLI offers three templates:
- **default** — Single page starter
- **blog** — Blog with static generation and dynamic routes
- **api** — REST API with CRUD routes

## Quickstart

```bash
# Start dev server (port 3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
my-app/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (/)
│   ├── about/
│   │   └── page.tsx        # About page (/about)
│   ├── blog/
│   │   ├── layout.tsx      # Blog section layout
│   │   ├── page.tsx        # Blog listing (/blog)
│   │   └── [slug]/
│   │       └── page.tsx    # Blog post (/blog/:slug)
│   ├── api/
│   │   └── hello/
│   │       └── route.ts    # API endpoint (/api/hello)
│   ├── loading.tsx         # Loading UI (Suspense fallback)
│   ├── error.tsx           # Error boundary (per-segment)
│   └── not-found.tsx       # 404 page
├── public/                 # Static assets
├── pledge.config.ts        # PledgeStack config
├── package.json
└── tsconfig.json
```

## Configuration

```typescript
// pledge.config.ts
import { defineConfig } from 'pledge';

export default defineConfig({
  framework: 'react',
  source_maps: true,
  dev_server: {
    port: 3000,
    hmr: true,
  },
});
```

## What's Next?

- [App Directory conventions](../02-app/) — File-based routing, rendering modes
- [Pledge System](../02-app/pledge-system.md) — Client/server boundaries
- [Architecture](../03-architecture/) — How PledgeStack works under the hood
- [Examples](../../examples/) — Starter templates for blog, TailwindCSS, auth, API routes
- [Roadmap](../05-community/roadmap.md) — 96 goals across 12 phases
