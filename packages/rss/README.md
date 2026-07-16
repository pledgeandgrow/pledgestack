# pledgestack-rss

RSS, Atom, and JSON feed generation for PledgeStack.

## Usage

```typescript
// app/feed.xml/route.ts
import { generateRSSFeed } from 'pledgestack-rss';

export function GET() {
  const xml = generateRSSFeed({
    title: 'My Blog',
    description: 'Posts about PledgeStack',
    link: 'https://example.com',
    items: posts.map(post => ({
      title: post.title,
      description: post.excerpt,
      link: `https://example.com/blog/${post.slug}`,
      pubDate: post.date,
    })),
  });

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
```

## API

- `generateRSSFeed(options)` — RSS 2.0 XML feed
- `generateAtomFeed(options)` — Atom 1.0 XML feed
- `generateJSONFeed(options)` — JSON Feed 1.1
