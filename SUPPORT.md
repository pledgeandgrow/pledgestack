# Support

## Documentation

- [Getting Started](./docs/01-getting-started/)
- [App Directory Guide](./docs/02-app/)
- [Architecture](./docs/03-architecture/)
- [API Reference](./docs/04-api-reference/)

## Community

- **GitHub Issues** — Bug reports and feature requests
- **GitHub Discussions** — Questions and community discussion
- **Discord** — Coming soon

## FAQ

### How is PledgeStack different from Next.js?

PledgeStack uses PledgePack (a Rust+Zig bundler) for builds and dev server, offering faster compilation and smaller bundles. It follows Next.js conventions but with a cleaner architecture and simpler caching model.

### Do I need to know Rust?

No. PledgePack is a prebuilt binary installed via npm. You write your app in TypeScript/JavaScript. Rust is only needed if you want to contribute to PledgePack itself.

### Can I use PledgeStack without PledgePack?

The dev server and build pipeline require PledgePack. However, the framework packages (`pledgestack-core`, `pledgestack-server`, `pledgestack-client`) can be used independently in Node.js environments.

### What React version is supported?

React 19+ is required. PledgeStack uses React Server Components, streaming SSR, and other React 19 features.

### Is PledgeStack production-ready?

PledgeStack is in active development. See [goals.md](./docs/05-community/roadmap.md) for the current status.
