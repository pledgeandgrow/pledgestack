# pledgestack-image

Image optimization component for PledgeStack.

## Features

- Responsive `srcset` with multiple widths
- WebP/AVIF format with JPEG fallback
- Blur placeholder for lazy images
- CLS prevention via width/height
- Priority loading for above-the-fold images

## Usage

```tsx
import { Image } from 'pledgestack-image';

<Image
  src="/photos/sunset.jpg"
  alt="Sunset over mountains"
  width={1920}
  height={1080}
  sizes={[640, 1080, 1920]}
  sizesAttr="100vw"
  priority
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```
