# Tests

## Structure

```
test/
├── e2e/           # End-to-end tests (Playwright)
├── integration/   # Integration tests (framework + server)
└── unit/          # Unit tests (individual packages)
```

## Running Tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests only
pnpm test:integration

# E2E tests only
pnpm test:e2e
```

## Writing Tests

- **Unit** — Test individual functions/modules in isolation. Use `vitest`.
- **Integration** — Test package interactions (e.g., core + server + client). Use `vitest`.
- **E2E** — Test full app scenarios in a browser. Use `playwright`.

## Conventions

- Test files: `*.test.ts` or `*.spec.ts`
- Place test files next to source files for unit tests
- Place integration/e2e tests in `test/integration/` or `test/e2e/`
- Use descriptive test names: `describe('Router', () => it('matches dynamic routes', ...))`
