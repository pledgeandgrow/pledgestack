# @pledgestack/adapters

Deployment adapters for PledgeStack — Cloudflare Workers, Vercel Edge, Deno Deploy, AWS Lambda, and Netlify.

## Adapters

| Platform | Import | Entry Type |
|----------|--------|------------|
| Cloudflare Workers | `@pledgestack/adapters/cloudflare` | `fetch(request, env)` |
| Vercel Edge | `@pledgestack/adapters/vercel` | `fetch(request)` |
| Deno Deploy | `@pledgestack/adapters/deno` | `Deno.serve(handler)` |
| AWS Lambda | `@pledgestack/adapters/lambda` | `handler(event)` |
| Netlify | `@pledgestack/adapters/netlify` | `handler(event)` |

## Usage

### Cloudflare Workers

```typescript
import { createCloudflareAdapter } from '@pledgestack/adapters/cloudflare';

const app = createCloudflareAdapter(config);
export default { fetch: app.fetch };
```

### Vercel Edge

```typescript
import { createVercelEdgeHandler } from '@pledgestack/adapters/vercel';
export default createVercelEdgeHandler({ config });
```

### AWS Lambda

```typescript
import { createLambdaHandler } from '@pledgestack/adapters/lambda';
export const handler = createLambdaHandler({ config });
```

## Edge Bundle Config

PledgePack generates edge-safe bundles. Use `createEdgeConfig(target)` to get the config:

```typescript
import { createEdgeConfig } from '@pledgestack/adapters';
const edgeConfig = createEdgeConfig('cloudflare');
```
