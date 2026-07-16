# pledgestack-mdx

MDX support for PledgeStack — write Markdown with embedded React components.

## Usage

Add the plugin to your `pledge.config.ts`:

```typescript
import { defineConfig } from 'pledge';
import { mdxPlugin } from 'pledgestack-mdx';

export default defineConfig({
  plugins: [
    mdxPlugin({
      extensions: ['.mdx', '.md'],
      frontmatter: true,
    }),
  ],
});
```

Create `app/blog/post.mdx`:

```mdx
---
title: My First Post
date: 2025-01-15
---

# Hello World

This is **MDX** with <ReactComponent /> support.
```

## API

- `mdxPlugin(options)` — Pledgepack plugin for MDX transform
- `extractFrontmatter(source)` — Parse YAML frontmatter from MDX
- `isMDXFile(path)` — Check if a path is an MDX file
