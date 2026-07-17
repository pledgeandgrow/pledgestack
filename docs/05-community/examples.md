# Example Gallery

A collection of PledgeStack examples, from simple to advanced.

## Beginner

1. **[Hello World](#hello-world)** — Minimal PledgeStack app
2. **[Static Pages](#static-pages)** — Multi-page static site
3. **[Dynamic Routes](#dynamic-routes)** — Blog with `[slug]` routes
4. **[API Routes](#api-routes)** — REST API endpoints
5. **[Layouts](#layouts)** — Nested layouts with shared navigation

## Intermediate

6. **[Server Actions](#server-actions)** — Form mutations without API routes
7. **[Pledges](#pledges)** — Selective hydration strategies
8. **[Middleware](#middleware)** — Auth and request filtering
9. **[Authentication](#authentication)** — Session-based auth with cookies
10. **[OAuth Login](#oauth-login)** — GitHub/Google OAuth flow
11. **[Database Integration](#database-integration)** — SQLite/Postgres with Drizzle
12. **[Caching](#caching)** — Fetch cache with revalidation
13. **[Image Optimization](#image-optimization)** — Responsive images with `next/image`-style API
14. **[SEO & Metadata](#seo-metadata)** — Per-route metadata, OpenGraph, sitemaps
15. **[Error Handling](#error-handling)** — Custom error pages and boundaries

## Advanced

16. **[Edge Deployment](#edge-deployment)** — Cloudflare Workers adapter
17. **[Streaming SSR](#streaming-ssr)** — Suspense-style streaming rendering
18. **[RSC Mode](#rsc-mode)** — React Server Components integration
19. **[Observability](#observability)** — Structured logging, tracing, error tracking
20. **[Security Hardening](#security-hardening)** — CSP, CSRF, rate limiting, bot detection

---

## Hello World

```tsx
// app/page.tsx
export default function Page() {
  return <h1>Hello, PledgeStack!</h1>;
}
```

## Static Pages

```tsx
// app/about/page.tsx
export default function AboutPage() {
  return <h1>About Us</h1>;
}

// app/contact/page.tsx
export default function ContactPage() {
  return <h1>Contact</h1>;
}
```

## Dynamic Routes

```tsx
// app/blog/[slug]/page.tsx
export default function BlogPost({ params }: { params: { slug: string } }) {
  return <article><h1>{params.slug}</h1></article>;
}
```

## API Routes

```ts
// app/api/users/route.ts
import { json } from 'pledgestack/server';

export function GET() {
  return json([{ id: 1, name: 'Alice' }]);
}

export async function POST(req: Request) {
  const body = await req.json();
  return json({ created: body }, { status: 201 });
}
```

## Layouts

```tsx
// app/layout.tsx
import { Link } from 'pledgestack/client';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html><body>
      <nav><Link href="/">Home</Link></nav>
      {children}
    </body></html>
  );
}
```

## Server Actions

```tsx
import { createAction } from 'pledgestack/server';

const addTodo = createAction(async (data: FormData) => {
  const title = data.get('title') as string;
  // Save to DB...
  return { id: Date.now(), title };
});

export default function Todos() {
  return (
    <form action={addTodo}>
      <input name="title" />
      <button>Add</button>
    </form>
  );
}
```

## Pledges

```tsx
import { pledge, SelectiveHydration } from 'pledgestack/client';

const Chart = pledge(ChartComponent, { strategy: 'visible' });

export default function Dashboard() {
  return (
    <SelectiveHydration priority="high">
      <Chart data={data} />
    </SelectiveHydration>
  );
}
```

## Middleware

```ts
// middleware.ts
import { defineMiddleware } from 'pledgestack/server';

export default defineMiddleware({
  matcher: ['/admin/*'],
  onRequest(req) {
    if (!req.headers.get('authorization')) {
      return new Response('Unauthorized', { status: 401 });
    }
  },
});
```

## Authentication

```tsx
import { SessionManager } from 'pledgestack/auth';

const sessions = new SessionManager({ secret: process.env.APP_SECRET! });

// Login route
export async function POST(req: Request) {
  const { email, password } = await req.json();
  // Verify credentials...
  const token = sessions.createSession({ userId: '123' });
  return json({ token }, {
    headers: { 'Set-Cookie': sessions.sessionCookie({ userId: '123' }) }
  });
}
```

## OAuth Login

```ts
import { OAuthManager } from 'pledgestack/auth';

const oauth = new OAuthManager();
oauth.registerProvider({
  name: 'github',
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  redirectUri: 'http://localhost:3000/auth/callback',
  scopes: ['user:email'],
});

// Initiate
const { url, state } = oauth.initiateAuth('github', '/dashboard');
// Redirect user to `url`

// Callback
const { tokens, userInfo } = await oauth.handleCallback('github', code, state);
```

## Database Integration

```ts
import { createDatabase } from 'pledgestack/server';

const db = createDatabase({
  type: 'sqlite',
  url: './data.db',
});

// In server action
const users = await db.query('SELECT * FROM users');
```

## Caching

```ts
import { fetchWithCache } from 'pledgestack/server';

const data = await fetchWithCache('https://api.example.com/data', {
  cache: 'force-cache',
  revalidate: 3600, // 1 hour
  tags: ['external-data'],
});
```

## Image Optimization

```tsx
import { Image } from 'pledgestack/client';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={630}
  priority
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

## SEO & Metadata

```tsx
// app/page.tsx
export const metadata = {
  title: 'My Page',
  description: 'A great page',
  openGraph: { images: ['/og.png'] },
};

export default function Page() {
  return <h1>My Page</h1>;
}
```

## Error Handling

```tsx
// app/error.tsx
export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h1>Something went wrong</h1>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

// app/not-found.tsx
export default function NotFound() {
  return <h1>Page not found</h1>;
}
```

## Edge Deployment

```ts
import { createEdgeHandler } from 'pledgestack/adapters';

export default createEdgeHandler({
  rootDir: process.cwd(),
});
```

## Streaming SSR

```tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<p>Loading chart...</p>}>
        <Chart />
      </Suspense>
    </div>
  );
}
```

## RSC Mode

```tsx
// pledge.config.ts
export default {
  rsc: true,
  // ...
};

// app/page.tsx — server component
async function SlowData() {
  const data = await fetch('https://api.example.com/data');
  return <div>{await data.text()}</div>;
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <SlowData />
    </Suspense>
  );
}
```

## Observability

```ts
import { logger, initErrorTracking, configureSlowRequestDetection } from 'pledgestack/server';

// Structured logging
logger.info('Server started', { port: 3000 });

// Error tracking
initErrorTracking({
  type: 'sentry',
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Slow request detection
configureSlowRequestDetection({ thresholdMs: 500 });
```

## Security Hardening

```ts
import { detectBot, checkBruteForce, recordFailedAttempt } from 'pledgestack/server';

// Bot detection
const botResult = detectBot({ headers: req.headers });
if (botResult.isBot) {
  return new Response('Forbidden', { status: 403 });
}

// Brute force protection
const bruteCheck = checkBruteForce(email);
if (!bruteCheck.allowed) {
  return new Response('Too many attempts', { status: 429 });
}
if (bruteCheck.requiresCaptcha) {
  // Show CAPTCHA challenge
}
```
