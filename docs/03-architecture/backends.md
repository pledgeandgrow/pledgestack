# Backend Runtimes — Comparison & Use Cases

A guide to understanding the differences between backend technologies, what they're built for, and where they fall short.

---

## Overview

| Runtime | Language | Type System | Concurrency Model | Typical Use Case |
|---------|----------|-------------|-------------------|------------------|
| **Node.js** | JavaScript/TS | Dynamic (TS adds static) | Single-threaded event loop | Web APIs, real-time, SSR frameworks |
| **Express** | JavaScript/TS | Dynamic (TS adds static) | Single-threaded event loop | REST APIs, web servers (Node framework) |
| **Rust (Actix/Axum)** | Rust | Static, zero-cost | Multi-threaded, async (tokio) | Systems, high-performance servers, WebAssembly |
| **Python (FastAPI/Django)** | Python | Dynamic (type hints optional) | GIL-bound, async via asyncio | ML/AI, data science, rapid prototyping |
| **PHP (Laravel/Symfony)** | PHP | Dynamic | Process-per-request (traditional) | Content sites, CMS, shared hosting |

---

## Node.js

**What it is:** JavaScript runtime built on Chrome's V8 engine. Single-threaded with a non-blocking event loop.

**Purpose:**
- Web servers and REST/GraphQL APIs
- Server-side rendering (Next.js, PledgeStack, Remix)
- Real-time applications (WebSockets, SSE)
- CLI tools and build pipelines
- Edge computing (via Vercel, Cloudflare Workers)

**Strengths:**
- Same language on frontend and backend (full-stack JS)
- Massive ecosystem (npm — 2M+ packages)
- Excellent for I/O-heavy workloads (network, disk, DB)
- Non-blocking event loop handles thousands of concurrent connections
- First-class TypeScript support
- Fast startup (V8 JIT)

**Limitations:**
- **CPU-bound work blocks the event loop** — heavy computation freezes all requests
- **Single-threaded by default** — must use `worker_threads` or cluster mode for multi-core
- **Memory limits** — not suited for large in-memory data processing
- **Callback/Promise complexity** — though `async/await` mitigates this
- **NPM dependency hell** — large dependency trees, security audit fatigue
- **Not zero-cost abstractions** — GC pauses, JIT warmup

**When to use:** Web APIs, SSR frameworks, real-time apps, CLI tools, anything I/O-bound.

**When not to use:** CPU-intensive computation (video encoding, crypto mining, ML training), embedded systems, ultra-low-latency trading.

---

## Express

**What it is:** Minimal web framework for Node.js. Not a runtime — it runs on Node.

**Purpose:**
- HTTP route handling
- Middleware pipelines
- REST API servers
- Web application backends

**Strengths:**
- Minimal and unopinionated — you choose the architecture
- Huge middleware ecosystem
- Easy to learn (routing, middleware, response)
- Works with any Node feature (WebSockets, streams, workers)

**Limitations:**
- **Not a runtime** — inherits all Node.js limitations
- **No built-in features** — no validation, no ORM, no auth, no SSR. You assemble everything.
- **Callback-era design** — older patterns, though `express-async-errors` and wrappers help
- **Performance overhead** — minimal, but not as fast as raw `http` or Fastify
- **No type safety by default** — needs `@types/express` and manual typing

**When to use:** Simple REST APIs, prototyping, when you want full control over architecture.

**When not to use:** When you need batteries-included (use NestJS, Fastify, or PledgeStack), or when you're not on Node.

---

## Rust (Actix, Axum, Rocket)

**What it is:** Systems programming language with zero-cost abstractions, memory safety without GC, and fearless concurrency. Web frameworks run on `tokio` (async runtime).

**Purpose:**
- High-performance web servers
- Systems programming (compilers, OS tools, databases)
- WebAssembly compilation
- Embedded systems
- Build tooling (esbuild, SWC, Turbopack, PledgePack)

**Strengths:**
- **Zero-cost abstractions** — what you write is what the CPU executes
- **No garbage collector** — deterministic memory management via ownership/borrowing
- **Fearless concurrency** — the compiler prevents data races
- **Multi-threaded by default** — true parallelism across cores
- **Tiny binaries** — no runtime, no VM, no interpreter
- **Best-in-class performance** — comparable to C/C++, sometimes faster
- **Excellent for CPU-bound work** — no event loop blocking
- **Strong type system** — algebraic data types, pattern matching, traits

**Limitations:**
- **Steep learning curve** — ownership, borrowing, lifetimes are unique concepts
- **Slow compilation** — large Rust projects can take minutes to compile
- **Smaller ecosystem** — fewer web libraries than Node/Python
- **No runtime reflection** — can't dynamically inspect types at runtime (limits some frameworks)
- **No easy FFI to JS** — requires `napi-rs` or WASM bridge
- **Verbose for simple tasks** — writing a quick CRUD API takes more code than Express
- **Async complexity** — `Pin`, `Box<dyn Future>`, and lifetime annotations add friction

**When to use:** Performance-critical servers, build tools, systems programming, WebAssembly targets, anything CPU-bound.

**When not to use:** Rapid prototyping, ML/AI (no ecosystem), simple CRUD APIs where dev speed matters more than runtime speed, small teams without Rust experience.

**PledgeStack connection:** PledgePack (published on npm as `pledgepack@^0.1.1`, CLI: `pledge`) is written in Rust+Zig for compilation speed and zero-cost abstractions. The framework itself uses Node/TS for the application layer and PledgePack for the build layer (bundling user apps) — best of both worlds. The framework's own CLI package is bundled with esbuild, not PledgePack, since PledgePack is designed for user app bundling.

---

## Python (FastAPI, Django, Flask)

**What it is:** Interpreted, dynamically-typed language with a massive ecosystem for data science and ML. Web frameworks run on CPython (the reference interpreter).

**Purpose:**
- ML/AI model serving and training
- Data science and analytics pipelines
- Rapid API prototyping
- Automation and scripting
- Scientific computing

**Strengths:**
- **Best ML/AI ecosystem** — PyTorch, TensorFlow, scikit-learn, HuggingFace
- **Readable syntax** — closest to pseudocode of any mainstream language
- **Rapid development** — fewer lines of code than Java/Rust/Go
- **FastAPI** — modern, async, auto-generated docs, type-hint validation
- **Django** — batteries-included (ORM, auth, admin, migrations)
- **Huge standard library** — batteries included for most tasks

**Limitations:**
- **GIL (Global Interpreter Lock)** — only one thread executes Python bytecode at a time
- **Slow** — interpreted, dynamically typed. 10-100x slower than Rust/C
- **High memory usage** — objects are heavy, interpreter overhead is significant
- **No true multi-threading** — must use multiprocessing (heavy) or asyncio (single-threaded)
- **Weak type system** — type hints are optional and not enforced at runtime
- **Deployment complexity** — WSGI/ASGI servers, virtualenvs, dependency management
- **Not suited for real-time** — GIL + interpreter overhead makes high-concurrency WS hard

**When to use:** ML/AI, data science, scientific computing, rapid prototyping, internal tools.

**When not to use:** High-performance web servers, real-time systems, embedded, anything CPU-bound at scale.

---

## PHP (Laravel, Symfony)

**What it is:** Server-side scripting language designed for the web. Traditionally process-per-request: each request spawns a new PHP process, executes, and dies.

**Purpose:**
- Content-driven websites (WordPress powers 43% of the web)
- CMS platforms
- E-commerce (Magento, WooCommerce)
- Shared hosting web apps

**Strengths:**
- **Built for the web** — `$_GET`, `$_POST`, sessions, cookies are native
- **Easy deployment** — upload `.php` files to any shared host, it works
- **WordPress ecosystem** — massive plugin/theme marketplace
- **Laravel** — elegant ORM, queues, auth, broadcasting, migrations
- **Cheap hosting** — shared hosting is $3-5/month, no DevOps needed
- **Fast for simple pages** — no JIT warmup, no event loop overhead

**Limitations:**
- **Process-per-request model** — each request is stateless, no in-memory state between requests
- **No persistent connections** — can't hold WebSocket connections (needs external server)
- **No real async** — PHP's async story is immature (Swoole, RoadRunner exist but aren't standard)
- **Inconsistent stdlib** — `strpos` vs `str_pos`, `array_map` vs `array_walk`, naming is chaotic
- **Type system is weak** — type declarations exist but are optional and easily bypassed
- **Performance at scale** — process spawning overhead kills high-concurrency throughput
- **Not suited for long-running processes** — memory leaks accumulate, no built-in way to daemonize
- **Stigma** — "PHP is bad" is outdated but still affects hiring

**When to use:** Content sites, CMS, e-commerce, shared hosting, teams with PHP experience, WordPress.

**When not to use:** Real-time apps, high-performance APIs, microservices, anything needing persistent state, ML/AI.

---

## Comparison Matrix

### Performance

| Runtime | Throughput (req/s) | Latency | CPU-bound | Memory |
|---------|-------------------|---------|-----------|--------|
| Rust | 500K+ | < 0.1ms | Excellent | Lowest |
| Node.js | 50K-100K | 1-5ms | Poor (blocks) | Medium |
| Python | 5K-20K | 5-20ms | Very Poor (GIL) | High |
| PHP | 10K-30K | 2-10ms | Poor | Medium |

### Developer Experience

| Runtime | Learning Curve | Time to MVP | Ecosystem Size | Type Safety |
|---------|---------------|-------------|----------------|-------------|
| Node.js/TS | Low | Hours | Massive | Excellent (TS) |
| Express | Very Low | Hours | Massive | Good (with TS) |
| Python | Low | Hours | Massive (ML) | Weak (optional) |
| PHP | Low | Hours | Large (web) | Weak (optional) |
| Rust | Very High | Days | Small | Excellent |

### Concurrency

| Runtime | Model | True Parallelism | Async Support | WebSocket |
|---------|-------|-----------------|---------------|-----------|
| Rust | Multi-threaded (tokio) | Yes | Native | Excellent |
| Node.js | Event loop (single-thread) | No (worker_threads) | Native | Excellent |
| Python | GIL + asyncio | No (multiprocessing) | asyncio | Poor (GIL) |
| PHP | Process-per-request | No | Swoole (non-standard) | Poor |

---

## Why PledgeStack Uses Node.js + Rust

PledgeStack splits its architecture across two runtimes:

**Node.js (application layer):**
- SSR, RSC, route handlers, middleware
- Pledge System hydration runtime
- Dev server with HMR
- Same language as the frontend (TypeScript)
- Massive npm ecosystem for integrations

**Rust (build layer — PledgePack):**
- Bundle compilation and optimization
- File scanning and route resolution
- Source map generation
- Zero-cost abstractions for build performance
- Multi-threaded for parallel compilation

This gives PledgeStack the **DX of Node.js** (fast prototyping, TS, npm) with the **performance of Rust** (fast builds, low memory, parallel compilation). Neither runtime alone is optimal — Node is too slow for builds, Rust is too slow for prototyping. Together they cover both needs.

---

## Choosing a Backend

| If you need... | Use |
|----------------|-----|
| ML/AI model serving | Python (FastAPI) |
| Maximum performance | Rust (Axum/Actix) |
| Real-time WebSockets at scale | Node.js (ws, Socket.io) |
| Content site / CMS | PHP (Laravel, WordPress) |
| Full-stack TypeScript | Node.js (PledgeStack, Next.js, NestJS) |
| Rapid API prototyping | Python (FastAPI) or Node.js (Express) |
| Shared hosting on a budget | PHP |
| CPU-bound server work | Rust or Go |
| Edge computing | Node.js (V8 isolates) or Rust (WASM) |
| Build tooling / compilers | Rust |
