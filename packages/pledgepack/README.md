# PledgePack

Rust-based build compiler and orchestrator for PledgeStack.

## Overview

PledgePack replaces turbo as the build system for the PledgeStack monorepo. It handles:

- **Task orchestration** — Running build tasks across packages with dependency awareness
- **Bundling** — Compiling TypeScript/TSX routes into optimized server and client bundles
- **Tree-shaking** — Removing unused code from production bundles
- **Code splitting** — Automatic chunk splitting for client-side code
- **CSS processing** — Tailwind CSS compilation and PostCSS pipeline
- **Asset optimization** — Image, font, and static asset optimization

## Usage

```bash
# Run all build tasks
pledgepack build

# Run specific task
pledgepack build --filter @pledgestack/core

# Watch mode
pledgepack dev

# Cache management
pledgepack clean
```

## Building from source

```bash
cd packages/pledgepack
cargo build --release
cp target/release/pledgepack bin/pledgepack
```

## Platform packages

Prebuilt binaries are distributed via platform-specific npm packages:

- `@pledgestack/pledgepack-darwin-arm64` — macOS Apple Silicon
- `@pledgestack/pledgepack-darwin-x64` — macOS Intel
- `@pledgestack/pledgepack-linux-x64-gnu` — Linux x64
- `@pledgestack/pledgepack-win32-x64-msvc` — Windows x64
