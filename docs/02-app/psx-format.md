# PSX Format — Rust in TypeScript

## Overview

PledgeStack introduces two file formats that let you write Rust alongside TypeScript:

| Extension | Name | Contains | Use Case |
|-----------|------|----------|----------|
| `.psx` | PSX | Rust + TypeScript/JSX | Pages with inline Rust queries |
| `.ps` | PS | Pure Rust (no JSX) | API routes, DB layer, auth, background jobs |

Both formats compile Rust to native code via `cargo` and generate NAPI bindings for Node.js interop. TypeScript types are auto-generated from Rust structs — no manual glue code.

---

## .psx — Rust + TypeScript in One File

A `.psx` file combines a `<rust>` block with TypeScript/JSX. The Rust code compiles to a native addon, and the TypeScript code uses it via the `rust` import.

### Example

```psx
<rust>
use serde::Serialize;

#[derive(Serialize)]
pub struct User {
    pub id: i32,
    pub name: String,
    pub email: String,
    pub role: Option<String>,
}

pub async fn get_users(limit: i32) -> Vec<User> {
    // In production, use SQLx:
    // sqlx::query_as!(User, "SELECT * FROM users LIMIT $1", limit)
    //     .fetch_all(&pool).await
    vec![
        User { id: 1, name: "Alice".into(), email: "alice@example.com".into(), role: Some("admin".into()) },
        User { id: 2, name: "Bob".into(), email: "bob@example.com".into(), role: None },
    ]
}
</rust>

import { useState } from 'react';

export const metadata = { title: 'Users Dashboard' };
export const revalidate = 60;

export default async function UsersPage() {
  const users = await rust.get_users(50);
  return (
    <div>
      <h1>Users ({users.length})</h1>
      <UserTable users={users} />
    </div>
  );
}

function UserTable({ users }: { users: User[] }) {
  const [filter, setFilter] = useState('');
  const filtered = users.filter(u => u.name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <table>
      {filtered.map(u => (
        <tr key={u.id}>
          <td>{u.name}</td>
          <td>{u.email}</td>
          <td>{u.role ?? '—'}</td>
        </tr>
      ))}
    </table>
  );
}
```

### How It Works

```
page.psx
  │
  ▼
parsePSX()
  ├── <rust> block extracted → Rust source
  ├── rust!{} inline expressions → replaced with variable refs
  └── TSX content cleaned (rust blocks removed)
  │
  ▼
generateTypeDefinitions()  → page.d.ts (TypeScript interfaces from Rust structs)
generateRustSource()       → lib.rs (user code + NAPI bindings)
generateModuleCargoToml()  → Cargo.toml (inherits from workspace)
generateNapiWrapper()      → page.napi.js (imports .node addon, exports `rust`)
  │
  ▼
cargo build → page.node (native addon)
  │
  ▼
Oxc transforms TSX → page.js (SSR module)
```

### Inline Rust Expressions

Use `rust!{...}` for inline Rust expressions within TypeScript:

```psx
<rust>
pub fn hash_password(pw: String) -> String { ... }
</rust>

export default function Register() {
  const hashed = rust!{ hash_password("secret".into()) };
  return <div>Password hashed: {hashed}</div>;
}
```

---

## .ps — Pure Rust Backend Logic

A `.ps` file is entirely Rust — no JSX, no TypeScript. Use it for API routes, database layers, authentication, and background jobs.

### Example

```rust
// app/api/users/route.ps — pure Rust API route

use sqlx::PgPool;
use serde::Serialize;

#[derive(Serialize)]
pub struct User {
    pub id: i32,
    pub name: String,
    pub email: String,
}

pub async fn get_users(pool: &PgPool, limit: i32) -> Vec<User> {
    sqlx::query_as!(
        User,
        "SELECT id, name, email FROM users ORDER BY id LIMIT $1",
        limit
    )
    .fetch_all(pool)
    .await
}

pub async fn create_user(pool: &PgPool, name: String, email: String) -> User {
    sqlx::query_as!(
        User,
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email",
        name, email
    )
    .fetch_one(pool)
    .await
}
```

Then consume it from a `.tsx` file:

```tsx
// app/users/page.tsx — imports the .ps module
import { rust } from '../api/users/route.ps';

export default async function UsersPage() {
  const users = await rust.get_users(50);
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

---

## Type Generation

Rust structs are automatically converted to TypeScript interfaces:

| Rust | TypeScript |
|------|-----------|
| `i32`, `i64` | `number` |
| `f32`, `f64` | `number` |
| `String` | `string` |
| `bool` | `boolean` |
| `Option<T>` | `T \| null` |
| `Vec<T>` | `T[]` |
| `HashMap<String, T>` | `Record<string, T>` |
| `struct User { ... }` | `interface User { ... }` |

No manual type definitions needed. The `.d.ts` file is generated at build time.

---

## Rust Dependencies

### Adding Crates

```bash
# Add Rust crates (like npm install for Rust)
pledge add sqlx argon2 reqwest

# Remove a crate
pledge remove sqlx

# List installed crates
pledge list
```

This updates the root `Cargo.toml` — a single workspace manifest shared by all `.psx` and `.ps` files.

### How Rust Dependencies Work

| Concept | Node.js | PledgeStack (Rust) |
|---------|---------|-------------------|
| Dependency declaration | `package.json` | `Cargo.toml` at project root |
| Installed dependencies | `node_modules/` (~500MB) | `~/.cargo/registry/` (global cache, shared) |
| Install command | `npm install` | `cargo build` (automatic) |
| Add dependency | `npm install sqlx` | `pledge add sqlx` |
| Per-module deps | Each file imports what it needs | Auto-detected from `use` statements |
| Disk usage per project | ~500MB | ~0MB (cache is global) |

### Supported Crates

PledgeStack pre-maps common crates for `pledge add`:

| Category | Crates |
|----------|--------|
| Database | `sqlx`, `sea-orm`, `redis`, `mongodb`, `diesel` |
| HTTP | `reqwest`, `hyper`, `tokio-tungstenite` |
| Auth | `jsonwebtoken`, `argon2`, `bcrypt`, `rand` |
| Serialization | `rmp-serde`, `prost` |
| File processing | `image`, `printpdf`, `calamine`, `rust_xlsxwriter` |
| Background jobs | `apalis`, `tokio-cron-scheduler` |
| Observability | `tracing`, `tracing-subscriber`, `tracing-opentelemetry` |
| Utilities | `uuid`, `chrono`, `once_cell`, `anyhow`, `thiserror` |

---

## Batch API

For multiple queries, use the batch API to minimize NAPI boundary crossings:

```tsx
// One boundary crossing for all three calls
const [user, orders, stats] = await rust.batch([
  () => rust.get_user(id),
  () => rust.get_orders(id),
  () => rust.get_stats(),
]);
```

### Transaction Support

```tsx
// All queries in a single DB transaction — all or nothing
await rust.transactionSql([
  "INSERT INTO users (name) VALUES ('Alice')",
  "INSERT INTO audit_log (action) VALUES ('user_created')",
]);
```

### Prepared Statements

```tsx
// Query plan cached on the Rust side
const users = await rust.prepared(
  'SELECT * FROM users WHERE active = $1 AND role = $2',
  [true, 'admin']
);
```

---

## Binary Protocol

PledgeStack uses a compact binary format (PSXB) for Rust↔JS data transfer instead of JSON:

- **4x faster** than JSON for structured data with repeated field names
- **Zero-copy** Uint8Array transfer across NAPI boundary
- **Field name deduplication** — column names stored once in header
- **Type-aware decoding** — direct byte reads, no string parsing

This is automatic — no API changes needed. Data returned from Rust functions uses the binary protocol internally.

---

## Rust SSR

PledgeStack analyzes `.psx` component trees at build time and extracts static HTML segments. These are compiled to Rust string templates:

- **Fully static pages** — rendered entirely by Rust, no V8 involved (30x faster)
- **Partial static** — static shell served by Rust instantly, dynamic holes filled by React RSC streaming (5x faster)
- **PPR support** — `__ssr_{module}_shell()` returns the static shell for Partial Prerendering

---

## Compilation

### How It Works

1. PledgePack scans `.psx` and `.ps` files
2. Parser extracts `use` statements → detects which crates are needed
3. Generates per-module `Cargo.toml` that inherits from the workspace
4. `cargo build` compiles all modules — shared dependencies compile once
5. Content-hash caching — only recompiles when Rust source changes
6. Each module produces a `.node` native addon

### Dev vs Production

| Profile | Optimization | Compile Time |
|---------|-------------|-------------|
| `dev` | `opt-level = 0`, debug symbols | 2-10s incremental |
| `release` | LTO, `opt-level = 3`, strip symbols | 30-120s full build |

### Fallback

If Rust toolchain (`cargo`) is not installed:
- `.psx` files: TSX still works, `rust.*` calls throw a clear error with install instructions
- `.ps` files: Module exports a stub that throws on any function call
- The rest of the app (`.tsx` files) works normally

---

## File Extension Summary

| Extension | Language | Contains | Use Case |
|-----------|----------|----------|----------|
| `.tsx` | TypeScript + JSX | React components | Pages, layouts, UI |
| `.ts` | TypeScript | Pure logic | Utilities, types, config |
| `.psx` | Rust + TypeScript + JSX | `<rust>` blocks + React | Pages with inline Rust |
| `.ps` | Pure Rust | Rust only, no JSX | API routes, DB, auth, jobs |

All four extensions coexist in the same project. Use Rust where you need performance, TypeScript where you don't.
