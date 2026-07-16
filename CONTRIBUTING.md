# Contributing to PledgeStack

Thank you for your interest in contributing to PledgeStack! This document outlines the process for contributing to the project.

## Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.15.0 (`npm install -g pnpm`)
- **Rust** (stable, edition 2024) — only needed for PledgePack development
- **Zig** >= 0.14.0 — only needed for PledgePack development

### Setup

```bash
git clone https://github.com/pledgestack/pledgestack.git
cd pledgestack
pnpm install
```

### Development

```bash
# Start the playground dev server
pnpm dev

# Build all packages
pnpm build

# Typecheck all packages
pnpm typecheck

# Lint all packages
pnpm lint
```

## Monorepo Structure

```
packages/
├── shared/              # Shared types, config schema, constants
├── core/                # Framework core — routing, rendering, FS scanner
├── server/              # Node.js + Edge server runtime
├── client/              # Client-side hydration, routing, prefetch
├── cli/                 # CLI tool (pledgestack dev, build, start, create)
├── eslint-plugin-pledge/# ESLint rules for PledgeStack conventions
├── vscode-extension/    # VS Code extension
├── create-pledge-app/   # Scaffolding tool
└── pledgepack/          # JS shim for PledgePack npm binary
```

## Contribution Workflow

### 1. Create a Branch

```bash
git checkout -b feat/your-feature
# or
git checkout -b fix/your-bugfix
```

### 2. Make Changes

- Follow the existing code style (enforced by Prettier + ESLint)
- Add tests for new features
- Update documentation as needed
- Keep changes focused — one feature/fix per PR

### 3. Commit

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(core): add parallel route support
fix(server): resolve middleware header parsing bug
docs(architecture): update request flow diagram
chore(deps): bump react to 19.2
```

### 4. Add a Changeset

```bash
pnpm changeset
```

This creates a changeset describing the change for the next release.

### 5. Submit a Pull Request

- Fill out the PR template
- Link related issues
- Ensure CI passes (typecheck, lint, test, build)

## Code Style

- **TypeScript** — strict mode, no `any` without justification
- **Formatting** — Prettier (config in `.prettierrc`)
- **Linting** — ESLint with custom PledgeStack rules
- **Imports** — Use `pledgestack-*` workspace imports between packages
- **File conventions** — `page.tsx`, `layout.tsx`, `route.ts`, etc.

## Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Run integration tests
pnpm test:integration
```

## Releases

Releases are managed with [Changesets](https://github.com/changesets/changesets):

1. Changesets are auto-collected during development
2. A `version` PR is automatically opened to bump versions
3. Merging the version PR publishes to npm

## Reporting Issues

- **Bugs** — Use the bug report template, include reproduction steps
- **Features** — Use the feature request template, describe the use case
- **Security** — See [SECURITY.md](./SECURITY.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
