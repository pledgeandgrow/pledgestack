# Interactive Tutorial

Welcome to the PledgeStack Interactive Tutorial! This guide walks you through building a full-stack app with PledgeStack, step by step.

## Table of Contents

1. [Setup & Project Creation](#1-setup--project-creation)
2. [Your First Page](#2-your-first-page)
3. [Layouts & Nesting](#3-layouts--nesting)
4. [Dynamic Routes](#4-dynamic-routes)
5. [API Routes](#5-api-routes)
6. [Server Actions](#6-server-actions)
7. [Pledges (Selective Hydration)](#7-pledges-selective-hydration)
8. [Middleware](#8-middleware)
9. [Authentication](#9-authentication)
10. [Deployment](#10-deployment)

---

## 1. Setup & Project Creation

```bash
npx pledge create my-app
cd my-app
npm install
npm run dev
```

Your app is now running at `http://localhost:3000`.

### Project Structure

```
my-app/
├── app/
│   ├── page.tsx          # Homepage
│   ├── layout.tsx        # Root layout
│   ├── about/
│   │   └── page.tsx      # /about
│   └── api/
│       └── health/
│           └── route.ts  # API endpoint
├── pledge.config.ts      # PledgeStack config
├── package.json
└── tsconfig.json
```

## 2. Your First Page

Create `app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <div>
      <h1>Hello, PledgeStack!</h1>
      <p>This is my first page.</p>
    </div>
  );
}
```

Pages are server-rendered by default. No `use client` needed for static content.

## 3. Layouts & Nesting

Create `app/layout.tsx`:

```tsx
import { Link } from 'pledgestack/client';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

Layouts wrap all child pages. Nested layouts work by placing `layout.tsx` in subdirectories.

## 4. Dynamic Routes

Create `app/blog/[slug]/page.tsx`:

```tsx
export default function BlogPost({ params }: { params: { slug: string } }) {
  return <h1>Post: {params.slug}</h1>;
}
```

Catch-all routes: `app/docs/[...slug]/page.tsx`

```tsx
export default function DocPage({ params }: { params: { slug: string[] } }) {
  return <h1>Docs: {params.slug.join('/')}</h1>;
}
```

## 5. API Routes

Create `app/api/health/route.ts`:

```ts
import { json } from 'pledgestack/server';

export function GET() {
  return json({ status: 'ok', timestamp: Date.now() });
}

export async function POST(request: Request) {
  const body = await request.json();
  return json({ received: body });
}
```
## 6. Server Actions

Server Actions let you mutate data from forms without writing API routes.

```tsx
// app/page.tsx
import { serverAction } from 'pledgestack/server';

const submitForm = serverAction(async (data: FormData) => {
  const name = data.get('name');
  // Save to database...
  return { success: true, name };
});

export default function Page() {
  return (
    <form action={submitForm}>
      <input name="name" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## 7. Pledges (Selective Hydration)

Pledges let you server-render components and hydrate them on the client with different strategies:

```tsx
import { pledge } from 'pledgestack/client';

// Hydrate when visible (IntersectionObserver)
const Comments = pledge(CommentsComponent, { strategy: 'visible' });

// Hydrate on idle
const Analytics = pledge(AnalyticsComponent, { strategy: 'idle' });

// Hydrate on interaction
const SearchBox = pledge(SearchBoxComponent, { strategy: 'interaction' });

// Client-only (no SSR)
const Dashboard = pledge(DashboardComponent, { strategy: 'only' });
```

### Selective Hydration with Priority

```tsx
import { SelectiveHydration } from 'pledgestack/client';

// Above-the-fold: high priority
<SelectiveHydration priority="high">
  <HeroSection />
</SelectiveHydration>

// Below-the-fold: lazy load
<SelectiveHydration priority="lazy" placeholderHeight={400}>
  <CommentsSection />
</SelectiveHydration>
```

## 8. Middleware

Create `middleware.ts` in your project root:

```ts
import { defineMiddleware } from 'pledgestack/server';

export default defineMiddleware({
  matcher: ['/dashboard/*', '/api/*'],
  onRequest(req) {
    // Check auth, add headers, etc.
    req.headers.set('x-request-id', crypto.randomUUID());
  },
});
```

### Server Utilities

PledgeStack provides request-scoped server utilities via AsyncLocalStorage:

```ts
import { cookies, headers, redirect, notFound, after } from 'pledgestack/server';

// Read request cookies
const c = cookies();

// Set response cookies
cookies((jar) => {
  jar.set('session', 'abc', { httpOnly: true, secure: true });
});

// Read request headers
const h = headers();

// Redirect from server components
redirect('/login');

// Trigger 404
notFound();

// Defer non-critical work after response
after(() => {
  // analytics, logging, etc.
});
```

## 9. Authentication

```ts
import { SessionManager } from 'pledgestack/auth';

const sessions = new SessionManager({ secret: process.env.APP_SECRET });

// Login
const token = sessions.createSession({ userId: '123', role: 'admin' });

// Verify
const session = sessions.verifySession(token);
if (!session) throw new Response('Unauthorized', { status: 401 });
```

## 10. Deployment

### Node.js

```bash
npx pledge build
npx pledge start
```

### Edge (Cloudflare Workers, Vercel Edge)

```ts
import { createEdgeHandler } from 'pledgestack/adapters';

export default createEdgeHandler({
  rootDir: process.cwd(),
});
```

### Docker

```dockerfile
FROM node:20-alpine
COPY . .
RUN npm ci && npx pledge build
EXPOSE 3000
CMD ["npx", "pledge", "start"]
```

---

## Next Steps

- Read the [API Reference](../04-api-reference/index.md)
- Browse the [Example Gallery](../05-community/examples.md)
- Check the [Roadmap](../05-community/roadmap.md)
- Join the [Community](../05-community/index.md)
