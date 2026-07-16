# @pledgestack/font

Font optimization for PledgeStack — automatic subsetting, preloading, and font-display swap.

## Usage

```typescript
import { resolveFont } from '@pledgestack/font';

// Google Fonts
const font = resolveFont({
  family: 'Inter',
  src: 'Inter',
  weights: [400, 500, 700],
  display: 'swap',
});

// Use in layout
font.preloadLinks.forEach(link => head.addLink(link));
```

## API

- `resolveFont(config)` — Returns preload links, font-face CSS, and fallback stack
- `fontVarName(family)` — Generate CSS variable name for a font family
- `FontConfig` — Configuration interface for fonts

PledgePack handles actual font subsetting and self-hosting in its asset pipeline.
