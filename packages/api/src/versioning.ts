export interface VersionOptions {
  /** Current API version (e.g. 'v1') */
  current: string;
  /** Supported versions */
  supported: string[];
  /** Sunset date for deprecated versions (ISO string) */
  sunset?: Record<string, string>;
  /** Header name for version (default: 'X-API-Version') */
  header?: string;
}

export function apiVersion(options: VersionOptions): {
  middleware: (req: { headers: Record<string, string> }) => { version: string; deprecated: boolean; sunset?: string } | null;
  isSupported: (version: string) => boolean;
  isDeprecated: (version: string) => boolean;
  isCurrent: (version: string) => boolean;
} {
  const { current, supported, sunset = {}, header = 'X-API-Version' } = options;

  return {
    middleware(req) {
      const version = req.headers[header.toLowerCase()] ?? req.headers[header] ?? current;
      if (!supported.includes(version)) return null;
      return {
        version,
        deprecated: version !== current,
        sunset: sunset[version],
      };
    },
    isSupported(version: string) {
      return supported.includes(version);
    },
    isDeprecated(version: string) {
      return supported.includes(version) && version !== current;
    },
    isCurrent(version: string) {
      return version === current;
    },
  };
}
