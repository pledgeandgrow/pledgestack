import { describe, it, expect } from 'vitest';
import {
  MiddlewareChain,
  createCorsMiddleware,
  createRateLimitMiddleware,
  createAuthMiddleware,
  createGeoRedirectMiddleware,
  generateWasmMiddlewareSource,
  generateWasmMiddlewareCargo,
  generateWasmMiddlewareWrapper,
  type EdgeRequest,
} from './edge-middleware';

describe('Edge Middleware in Rust (#275)', () => {
  describe('MiddlewareChain', () => {
    it('executes middleware in order', async () => {
      const chain = new MiddlewareChain();
      const order: string[] = [];

      chain.use({
        name: 'first',
        async handle(req, next) {
          order.push('first');
          return next(req);
        },
      });

      chain.use({
        name: 'second',
        async handle(req, next) {
          order.push('second');
          return next(req);
        },
      });

      const req: EdgeRequest = { method: 'GET', url: '/', headers: {} };
      await chain.run(req);
      expect(order).toEqual(['first', 'second']);
    });

    it('short-circuits on response', async () => {
      const chain = new MiddlewareChain();
      const order: string[] = [];

      chain.use({
        name: 'blocker',
        async handle() {
          order.push('blocked');
          return { status: 403, headers: {}, body: 'Forbidden' };
        },
      });

      chain.use({
        name: 'never',
        async handle(req, next) {
          order.push('never');
          return next(req);
        },
      });

      const req: EdgeRequest = { method: 'GET', url: '/', headers: {} };
      const response = await chain.run(req);
      expect(response.status).toBe(403);
      expect(order).toEqual(['blocked']);
    });

    it('lists middleware names', () => {
      const chain = new MiddlewareChain();
      chain.use({ name: 'a', async handle(r, n) { return n(r); } });
      chain.use({ name: 'b', async handle(r, n) { return n(r); } });
      expect(chain.list()).toEqual(['a', 'b']);
    });
  });

  describe('CORS middleware', () => {
    it('handles OPTIONS preflight', async () => {
      const cors = createCorsMiddleware({ origin: 'https://example.com' });
      const chain = new MiddlewareChain().use(cors);
      const req: EdgeRequest = { method: 'OPTIONS', url: '/', headers: {} };
      const response = await chain.run(req);
      expect(response.status).toBe(204);
      expect(response.headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });

    it('adds CORS headers to responses', async () => {
      const cors = createCorsMiddleware({ origin: '*' });
      const chain = new MiddlewareChain()
        .use(cors)
        .use({ name: 'handler', async handle() { return { status: 200, headers: {}, body: 'OK' }; } });
      const req: EdgeRequest = { method: 'GET', url: '/', headers: {} };
      const response = await chain.run(req);
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('Rate limit middleware', () => {
    it('allows requests under limit', async () => {
      const limiter = createRateLimitMiddleware({ maxRequests: 10, windowMs: 60000 });
      const chain = new MiddlewareChain()
        .use(limiter)
        .use({ name: 'handler', async handle() { return { status: 200, headers: {}, body: 'OK' }; } });
      const req: EdgeRequest = { method: 'GET', url: '/test', headers: {} };
      const response = await chain.run(req);
      expect(response.status).toBe(200);
    });

    it('blocks requests over limit', async () => {
      const limiter = createRateLimitMiddleware({ maxRequests: 2, windowMs: 60000 });
      const chain = new MiddlewareChain()
        .use(limiter)
        .use({ name: 'handler', async handle() { return { status: 200, headers: {}, body: 'OK' }; } });
      const req: EdgeRequest = { method: 'GET', url: '/test', headers: {} };

      await chain.run(req);
      await chain.run(req);
      const response = await chain.run(req);
      expect(response.status).toBe(429);
    });
  });

  describe('Auth middleware', () => {
    it('rejects missing auth header', async () => {
      const auth = createAuthMiddleware({ validateToken: () => true });
      const chain = new MiddlewareChain().use(auth);
      const req: EdgeRequest = { method: 'GET', url: '/', headers: {} };
      const response = await chain.run(req);
      expect(response.status).toBe(401);
    });

    it('accepts valid token', async () => {
      const auth = createAuthMiddleware({ validateToken: (t) => t === 'valid' });
      const chain = new MiddlewareChain()
        .use(auth)
        .use({ name: 'handler', async handle() { return { status: 200, headers: {}, body: 'OK' }; } });
      const req: EdgeRequest = {
        method: 'GET',
        url: '/',
        headers: { authorization: 'Bearer valid' },
      };
      const response = await chain.run(req);
      expect(response.status).toBe(200);
    });

    it('rejects invalid token', async () => {
      const auth = createAuthMiddleware({ validateToken: () => false });
      const chain = new MiddlewareChain().use(auth);
      const req: EdgeRequest = {
        method: 'GET',
        url: '/',
        headers: { authorization: 'Bearer invalid' },
      };
      const response = await chain.run(req);
      expect(response.status).toBe(403);
    });
  });

  describe('Geo redirect middleware', () => {
    it('redirects based on country', async () => {
      const geo = createGeoRedirectMiddleware({
        redirects: { US: 'https://us.example.com' },
      });
      const chain = new MiddlewareChain().use(geo);
      const req: EdgeRequest = {
        method: 'GET',
        url: '/',
        headers: {},
        cf: { country: 'US' },
      };
      const response = await chain.run(req);
      expect(response.status).toBe(302);
      expect(response.headers['Location']).toBe('https://us.example.com');
    });
  });

  describe('WASM middleware code generation', () => {
    it('generates Rust source', () => {
      const source = generateWasmMiddlewareSource({
        moduleName: 'auth',
        middlewares: [{ name: 'check_auth', isAsync: true }],
      });
      expect(source).toContain('wasm_bindgen');
      expect(source).toContain('check_auth');
    });

    it('generates Cargo.toml', () => {
      const cargo = generateWasmMiddlewareCargo({
        moduleName: 'auth',
        middlewares: [{ name: 'check_auth', isAsync: true }],
      });
      expect(cargo).toContain('wasm-bindgen');
      expect(cargo).toContain('pledge-middleware-auth');
    });

    it('generates JS wrapper', () => {
      const wrapper = generateWasmMiddlewareWrapper({
        moduleName: 'auth',
        middlewares: [{ name: 'check_auth', isAsync: true }],
      });
      expect(wrapper).toContain('middleware');
      expect(wrapper).toContain('check_auth');
      expect(wrapper).toContain('runMiddlewareChain');
    });
  });
});
