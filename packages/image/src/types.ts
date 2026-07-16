export type ImageFormat = 'avif' | 'webp' | 'jpeg' | 'png';

export interface ImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: number[];
  sizesAttr?: string;
  quality?: number;
  formats?: ImageFormat[];
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  className?: string;
  style?: import('react').CSSProperties;
  fit?: 'cover' | 'contain' | 'fill';
}

const DEFAULT_SIZES = [640, 750, 828, 1080, 1200, 1920];
const DEFAULT_FORMATS: ImageFormat[] = ['avif', 'webp', 'jpeg'];

export function generateSrcSet(
  src: string,
  widths: number[],
  formats: ImageFormat[],
  quality: number,
): string {
  const entries: string[] = [];
  for (const format of formats) {
    for (const width of widths) {
      const params = new URLSearchParams({
        w: String(width),
        q: String(quality),
        f: format,
      });
      entries.push(`/_pledge/image?src=${encodeURIComponent(src)}&${params} ${width}w`);
    }
  }
  return entries.join(', ');
}

export function generateSources(
  src: string,
  widths: number[],
  formats: ImageFormat[],
  quality: number,
  sizesAttr?: string,
): Array<{ srcSet: string; type: string; sizes?: string }> {
  return formats.map((format) => ({
    srcSet: generateSrcSet(src, widths, [format], quality),
    type: `image/${format}`,
    sizes: sizesAttr,
  }));
}

export function optimizeUrl(
  src: string,
  width: number,
  options?: { quality?: number; format?: ImageFormat },
): string {
  const params = new URLSearchParams({
    src,
    w: String(width),
    q: String(options?.quality ?? 75),
    f: options?.format ?? 'webp',
  });
  return `/_pledge/image?${params}`;
}

export function aspectRatioPadding(width: number, height: number): string {
  return `${(height / width) * 100}%`;
}

export { DEFAULT_SIZES, DEFAULT_FORMATS };
