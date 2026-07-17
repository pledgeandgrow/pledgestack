# Getting Started

## Installation

### Create a new project

```bash
# Using the scaffolding CLI
npx pledge create my-app

# Or with pnpm
pnpm pledge create my-app

cd my-app
npm install
```

Or install the framework directly:

```bash
npm install pledgestack
# or
pnpm add pledgestack
```

The CLI offers four templates:
- **default** — Single page starter
- **blank** — Minimal empty project
- **blog** — Blog with static generation and dynamic routes
- **dashboard** — Dashboard with auth and state

## Quickstart

```bash
# Start dev server (port 3000)
pledge dev

# Build for production
pledge build

# Start production server
pledge start

# Diagnose issues
pledge doctor

# Print environment info
pledge info
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

PledgeStack uses a single `pledge.config.ts` file for both framework and PledgePack configuration:

```typescript
// pledge.config.ts
import { defineConfig } from 'pledgestack';

export default defineConfig({
  appDir: 'app',           // App directory (default: 'app')
  publicDir: 'public',     // Static assets (default: 'public')
  outDir: '.pledge',       // Build output (default: '.pledge')
  rsc: true,               // Enable React Server Components (default: true)
  tailwind: true,          // Enable Tailwind CSS (default: true)
  defaultRuntime: 'node',  // 'node' or 'edge' (default: 'node')
  output: 'standalone',    // 'standalone' or 'export' for static HTML
  pledgepack: {            // PledgePack build/bundler config
    sourceMaps: true,
    compressGzip: true,
    compressBrotli: true,
    devServer: {
      port: 3001,
      hmr: true,
    },
  },
});
```

## What's Next?

- [App Directory conventions](../02-app/) — File-based routing, rendering modes
- [Pledge System](../02-app/pledge-system.md) — Client/server boundaries
- [Architecture](../03-architecture/) — How PledgeStack works under the hood
- [Examples](../../examples/) — Starter templates for blog, TailwindCSS, auth, API routes
- [Roadmap](../05-community/roadmap.md) — 194 goals across 21 phases
