# Pledge System

The Pledge System is PledgeStack's approach to client/server boundaries. It replaces Next.js's `"use client"` / `"use server"` file-level directives with a cleaner, more granular model.

## Core Principles

1. **Server-rendered by default** — All components render on the server with zero client JS
2. **Opt-in hydration** — Use `pledge()` to make a component interactive on the client
3. **Explicit server functions** — Use `serverAction()` for type-safe server-side logic
4. **No file-level directives** — No `"use client"` or `"use server"` at the top of files

## `pledge()` HOC

Wraps a component and marks it for client-side hydration with a strategy.

```tsx
import { pledge } from 'pledgestack-client';

function Counter({ initial = 0 }: { initial: number }) {
  // This is a normal React component with hooks, state, etc.
  const [count, setCount] = useState(initial);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// Wrap with pledge — component is now hydrated on the client
const PledgedCounter = pledge(Counter, { strategy: 'load' });

// Use it in any server component
export default function Page() {
  return <PledgedCounter initial={0} />;
}
```

### Hydration Strategies

| Strategy | When it hydrates | Use case |
|----------|-----------------|----------|
| `load` | Immediately on page load | Interactive elements above the fold |
| `visible` | When scrolled into view (IntersectionObserver) | Comments, widgets below the fold |
| `idle` | On `requestIdleCallback` | Non-critical interactivity |
| `only` | Client-only, skips SSR | Components that can't SSR (browser APIs) |
| `media` | When media query matches | Mobile-only or desktop-only components |

### Strategy Options

```tsx
// Visible with custom IntersectionObserver settings
const LazyWidget = pledge(Widget, {
  strategy: 'visible',
  rootMargin: '200px',
  threshold: 0.1,
});

// Media query — only hydrate on mobile
const MobileNav = pledge(Nav, {
  strategy: 'media',
  mediaQuery: '(max-width: 768px)',
});

// Named for debugging
const Named = pledge(Component, {
  strategy: 'load',
  name: 'HeaderSearch',
});
```

## `serverAction()`

Creates a type-safe server function that can be called from any component.

```tsx
import { serverAction } from 'pledgestack-server';

// Define a server action — runs only on the server
const submitForm = serverAction(async (data: FormData) => {
  const name = data.get('name') as string;
  await db.users.create({ name });
  return { success: true, id: crypto.randomUUID() };
});

// Call it from any component (server or client)
const result = await submitForm(formData);
```

### How it works

- **On the server**: The function is registered and called directly
- **On the client**: A proxy POSTs to `/__pledge__/action` with the action ID and arguments
- **Type-safe**: The return type is preserved across the network boundary
- **No file directives**: No need for `"use server"` at the top of the file

## Architecture

```
Server Render (SSR)
  ├── Page component (server-only, zero client JS)
  │   ├── Static content (HTML only)
  │   └── pledge(Component, { strategy }) (server-rendered + marked for hydration)
  │       └── data-pledge-* attributes injected into DOM
  └── Pledge manifest (JSON script tag with component metadata)

Client Hydration
  ├── Scan DOM for [data-pledge-component] elements
  ├── Read manifest from <script id="__pledge_manifest__">
  ├── For each pledge:
  │   ├── 'load'    → hydrate immediately
  │   ├── 'visible' → IntersectionObserver → hydrate on visible
  │   ├── 'idle'    → requestIdleCallback → hydrate
  │   ├── 'only'    → createRoot (fresh render, no SSR)
  │   └── 'media'   → matchMedia → hydrate on match
  └── Only pledged components get client JS — everything else is static HTML
```

## Comparison with Next.js

| Feature | Next.js | PledgeStack |
|---------|---------|----------|
| Client boundary | `"use client"` file directive | `pledge()` per component |
| Server boundary | `"use server"` file directive | `serverAction()` per function |
| Granularity | File-level | Component-level and function-level |
| Hydration control | All or nothing | Per-component strategy |
| Two instances, different strategies | Not possible | Supported |
| Accidental client/server confusion | Common | Impossible — explicit opt-in |

## Comparison with Astro

| Feature | Astro | PledgeStack |
|---------|-------|----------|
| Architecture | Islands | Pledges (same concept, better integration) |
| Framework | Multi-framework | React-first |
| Server functions | Separate API endpoints | `serverAction()` built-in |
| RSC support | No | Yes |
| SSR streaming | No | Yes |
| API routes | Needs adapter | Built-in `route.ts` |
