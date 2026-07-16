# pledgestack-sitemap

Automatic sitemap.xml and robots.txt generation for PledgeStack.

## Usage

```typescript
import { defineConfig } from 'pledge';
import { sitemapPlugin } from 'pledgestack-sitemap';

export default defineConfig({
  plugins: [
    sitemapPlugin({
      siteUrl: 'https://example.com',
      exclude: ['/admin/*'],
      changefreq: 'weekly',
      priority: 0.7,
    }),
  ],
});
```

## API

- `sitemapPlugin(options)` — Pledgepack plugin for sitemap generation
- `generateSitemapXML(entries)` — Generate sitemap XML from entries
- `routesToSitemapEntries(routes, siteUrl, options)` — Convert route list to sitemap entries
- `generateRobotsTxt(options)` — Generate robots.txt content
