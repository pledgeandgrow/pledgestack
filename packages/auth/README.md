# @pledgestack/auth

Authentication helpers for PledgeStack — cookie sessions, JWT-like tokens, password hashing, and OAuth utilities.

## Usage

```typescript
import { SessionManager, hashPassword, verifyPassword, requireAuth } from '@pledgestack/auth';

const auth = new SessionManager({
  secret: process.env.AUTH_SECRET!,
  cookieName: '__pledge_session',
  ttl: 7 * 24 * 60 * 60, // 7 days
});

// In a route handler
export async function POST(request: Request) {
  const { email, password } = await request.json();
  // Verify credentials...
  const cookie = auth.sessionCookie({ userId: user.id, role: 'admin' });
  return new Response('OK', { headers: { 'Set-Cookie': cookie } });
}
```

## API

- `SessionManager` — Create, verify, and destroy signed session cookies
- `hashPassword()` / `verifyPassword()` — PBKDF2-based password hashing
- `generateToken()` — Random tokens for CSRF, OAuth state
- `createOAuthState()` / `verifyOAuthState()` — OAuth flow helpers
- `requireAuth()` / `requireRole()` — Guard helpers for route handlers
