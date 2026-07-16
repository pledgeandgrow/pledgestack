export interface MultiRegionConfig {
  /** Available regions */
  regions: Array<{ id: string; name: string; url: string; latency?: number }>;
  /** Default region */
  defaultRegion: string;
  /** Health check endpoint (default: '/health') */
  healthEndpoint?: string;
}

export interface RegionStatus {
  id: string;
  name: string;
  url: string;
  healthy: boolean;
  latency: number;
}

export async function checkRegionHealth(
  region: { url: string },
  healthEndpoint = '/health',
): Promise<{ healthy: boolean; latency: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${region.url}${healthEndpoint}`, {
      signal: AbortSignal.timeout(5000),
    });
    return { healthy: res.ok, latency: Date.now() - start };
  } catch {
    return { healthy: false, latency: -1 };
  }
}

export async function getHealthyRegions(
  config: MultiRegionConfig,
): Promise<RegionStatus[]> {
  const healthEndpoint = config.healthEndpoint ?? '/health';
  const results = await Promise.all(
    config.regions.map(async (r) => {
      const health = await checkRegionHealth(r, healthEndpoint);
      return { ...r, ...health };
    }),
  );

  return results
    .filter((r) => r.healthy)
    .sort((a, b) => (a.latency ?? 0) - (b.latency ?? 0));
}

export function getNearestRegion(
  regions: RegionStatus[],
): RegionStatus | null {
  return regions.length > 0 ? regions[0] : null;
}

export interface BlueGreenConfig {
  /** Blue deployment URL */
  blue: string;
  /** Green deployment URL */
  green: string;
  /** Active color (default: 'blue') */
  active: 'blue' | 'green';
}

export interface BlueGreenStatus {
  active: 'blue' | 'green';
  inactive: 'blue' | 'green';
  activeUrl: string;
  inactiveUrl: string;
}

export function getBlueGreenStatus(config: BlueGreenConfig): BlueGreenStatus {
  const active = config.active;
  const inactive = active === 'blue' ? 'green' : 'blue';
  return {
    active,
    inactive,
    activeUrl: config[active],
    inactiveUrl: config[inactive],
  };
}

export async function promoteBlueGreen(
  config: BlueGreenConfig,
  healthEndpoint = '/health',
): Promise<{ success: boolean; newActive: 'blue' | 'green'; error?: string }> {
  const inactive = config.active === 'blue' ? 'green' : 'blue';
  const inactiveUrl = config[inactive];

  const health = await checkRegionHealth({ url: inactiveUrl }, healthEndpoint);

  if (!health.healthy) {
    return {
      success: false,
      newActive: config.active,
      error: `Inactive deployment (${inactive}) is not healthy`,
    };
  }

  return {
    success: true,
    newActive: inactive,
  };
}
