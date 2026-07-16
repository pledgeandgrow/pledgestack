import type { PledgeRequest, PledgeResponse } from 'pledgestack';

export function middleware(req: PledgeRequest): PledgeResponse | undefined {
  const session = req.cookies.get('session');
  const isAuthRoute = req.nextUrl.pathname.startsWith('/login');

  if (!session && !isAuthRoute) {
    return PledgeResponse.redirect('/login');
  }

  if (session && isAuthRoute) {
    return PledgeResponse.redirect('/dashboard');
  }
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
