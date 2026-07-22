/**
 * Cache inspector UI — visual tool to see cached entries, TTLs, and tags.
 *
 * Extends the PledgeStack DevTools overlay with a comprehensive cache inspector
 * that shows:
 * - All cache entries with key, URL, status, age, TTL, tags
 * - Tag index with entry counts
 * - Manual revalidation buttons (revalidate tag/path)
 * - Cache stats (hit rate, size, memory usage)
 * - Persistent cache status (SQLite/Redis)
 *
 * Fetches data from the /__pledge__/cache/inspect endpoint.
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { createElement } from 'react';

export interface CacheInspectEntry {
  key: string;
  url: string;
  status: number;
  timestamp: number;
  revalidate?: number;
  tags: string[];
  age: number;
  isStale: boolean;
  size: number;
}

export interface CacheInspectData {
  entries: CacheInspectEntry[];
  tags: Record<string, number>;
  stats: {
    size: number;
    tags: number;
    inflight: number;
    hitRate?: number;
    memoryUsage?: number;
  };
  persistent: {
    enabled: boolean;
    backend: string;
    entryCount: number;
  };
}

export interface CacheInspectorProps {
  /** Theme */
  theme?: 'dark' | 'light';
  /** Auto-refresh interval (ms, 0 = disabled) */
  refreshInterval?: number;
}

export function CacheInspector({ theme = 'dark', refreshInterval = 5000 }: CacheInspectorProps) {
  const [data, setData] = useState<CacheInspectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<'entries' | 'tags' | 'stats'>('entries');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/__pledge__/cache/inspect');
      if (res.ok) {
        const json = (await res.json()) as CacheInspectData;
        setData(json);
      }
    } catch {
      // Server may not support cache inspection endpoint
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    if (refreshInterval > 0) {
      const interval = setInterval(() => void fetchData(), refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  const handleRevalidateTag = useCallback(async (tag: string) => {
    await fetch('/__pledge__/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'tag', target: tag }),
    });
    void fetchData();
  }, [fetchData]);

  const handleRevalidatePath = useCallback(async (path: string) => {
    await fetch('/__pledge__/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'path', target: path }),
    });
    void fetchData();
  }, [fetchData]);

  const handleClearAll = useCallback(async () => {
    await fetch('/__pledge__/cache/clear', { method: 'POST' });
    void fetchData();
  }, [fetchData]);

  const bgColor = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a1a1a';
  const borderColor = theme === 'dark' ? '#333' : '#ddd';
  const accentColor = '#6c5ce7';
  const staleColor = '#e74c3c';
  const freshColor = '#27ae60';

  if (loading) {
    return createElement('div', { style: { color: textColor, padding: '12px', fontFamily: 'monospace' } }, 'Loading cache data...');
  }

  if (!data) {
    return createElement('div', { style: { color: textColor, padding: '12px', fontFamily: 'monospace' } },
      'Cache inspection not available. Ensure the server is running with cache inspection enabled.',
    );
  }

  const filteredEntries = filter
    ? data.entries.filter((e) =>
        e.key.includes(filter) || e.url.includes(filter) || e.tags.some((t) => t.includes(filter)),
      )
    : data.entries;

  return createElement('div', {
    style: {
      background: bgColor,
      color: textColor,
      fontFamily: 'monospace',
      fontSize: '12px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
  },
    // Toolbar
    createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
      createElement('button', {
        onClick: () => setView('entries'),
        style: btnStyle(view === 'entries', accentColor, textColor),
      }, `Entries (${data.entries.length})`),
      createElement('button', {
        onClick: () => setView('tags'),
        style: btnStyle(view === 'tags', accentColor, textColor),
      }, `Tags (${Object.keys(data.tags).length})`),
      createElement('button', {
        onClick: () => setView('stats'),
        style: btnStyle(view === 'stats', accentColor, textColor),
      }, 'Stats'),
      createElement('input', {
        type: 'text',
        placeholder: 'Filter...',
        value: filter,
        onChange: (e: Event) => setFilter((e.target as HTMLInputElement).value),
        style: {
          flex: 1,
          background: theme === 'dark' ? '#16213e' : '#f5f5f5',
          border: `1px solid ${borderColor}`,
          color: textColor,
          padding: '4px 8px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
        },
      }),
      createElement('button', {
        onClick: handleClearAll,
        style: { ...btnStyle(false, accentColor, textColor), borderColor: staleColor, color: staleColor },
      }, 'Clear All'),
    ),

    // Content
    view === 'entries' && renderEntries(filteredEntries, borderColor, textColor, staleColor, freshColor, handleRevalidatePath),
    view === 'tags' && renderTags(data.tags, borderColor, textColor, accentColor, handleRevalidateTag),
    view === 'stats' && renderStats(data, borderColor, textColor, accentColor),
  );
}

function renderEntries(
  entries: CacheInspectEntry[],
  border: string,
  text: string,
  staleColor: string,
  freshColor: string,
  onRevalidate: (path: string) => void,
): ReactNode {
  if (entries.length === 0) {
    return createElement('div', { style: { color: text, padding: '8px' } }, 'No cache entries');
  }

  return createElement('table', {
    style: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  },
    createElement('thead', null,
      createElement('tr', null,
        ['URL', 'Status', 'Age', 'TTL', 'Stale?', 'Tags', 'Size', 'Action'].map((h) =>
          createElement('th', {
            key: h,
            style: { textAlign: 'left', padding: '4px 8px', borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap' },
          }, h),
        ),
      ),
    ),
    createElement('tbody', null,
      entries.map((e) => {
        const ageStr = e.age < 60 ? `${e.age}s` : e.age < 3600 ? `${Math.floor(e.age / 60)}m` : `${Math.floor(e.age / 3600)}h`;
        const ttlStr = e.revalidate ? `${e.revalidate}s` : '∞';
        return createElement('tr', { key: e.key },
          createElement('td', { style: tdStyle(border), title: e.url },
            truncate(e.url, 40),
          ),
          createElement('td', { style: tdStyle(border) }, String(e.status)),
          createElement('td', { style: tdStyle(border) }, ageStr),
          createElement('td', { style: tdStyle(border) }, ttlStr),
          createElement('td', {
            style: { ...tdStyle(border), color: e.isStale ? staleColor : freshColor },
          }, e.isStale ? 'Stale' : 'Fresh'),
          createElement('td', { style: tdStyle(border) },
            e.tags.length > 0 ? e.tags.join(', ') : '-',
          ),
          createElement('td', { style: tdStyle(border) }, formatBytes(e.size)),
          createElement('td', { style: tdStyle(border) },
            createElement('button', {
              onClick: () => onRevalidate(e.url),
              style: { background: 'none', border: `1px solid ${border}`, color: text, padding: '2px 6px', cursor: 'pointer', borderRadius: '3px', fontSize: '11px' },
            }, 'Revalidate'),
          ),
        );
      }),
    ),
  );
}

function renderTags(
  tags: Record<string, number>,
  border: string,
  text: string,
  accent: string,
  onRevalidate: (tag: string) => void,
): ReactNode {
  const entries = Object.entries(tags);
  if (entries.length === 0) {
    return createElement('div', { style: { color: text, padding: '8px' } }, 'No cache tags');
  }

  return createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
    createElement('thead', null,
      createElement('tr', null,
        ['Tag', 'Entries', 'Action'].map((h) =>
          createElement('th', { key: h, style: { textAlign: 'left', padding: '4px 8px', borderBottom: `1px solid ${border}` } }, h),
        ),
      ),
    ),
    createElement('tbody', null,
      entries.map(([tag, count]) => createElement('tr', { key: tag },
        createElement('td', { style: { ...tdStyle(border), color: accent } }, tag),
        createElement('td', { style: tdStyle(border) }, String(count)),
        createElement('td', { style: tdStyle(border) },
          createElement('button', {
            onClick: () => onRevalidate(tag),
            style: { background: 'none', border: `1px solid ${border}`, color: text, padding: '2px 6px', cursor: 'pointer', borderRadius: '3px', fontSize: '11px' },
          }, 'Revalidate Tag'),
        ),
      )),
    ),
  );
}

function renderStats(
  data: CacheInspectData,
  border: string,
  _text: string,
  accent: string,
): ReactNode {
  const stats = [
    ['Cache Size', String(data.stats.size)],
    ['Tags', String(data.stats.tags)],
    ['In-flight', String(data.stats.inflight)],
    ['Hit Rate', data.stats.hitRate ? `${(data.stats.hitRate * 100).toFixed(1)}%` : 'N/A'],
    ['Memory Usage', data.stats.memoryUsage ? formatBytes(data.stats.memoryUsage) : 'N/A'],
    ['Persistent Backend', data.persistent.enabled ? data.persistent.backend : 'Disabled'],
    ['Persistent Entries', String(data.persistent.entryCount)],
  ];

  return createElement('div', null,
    createElement('div', { style: { marginBottom: '8px', fontWeight: 'bold', color: accent } }, 'Cache Statistics'),
    stats.map(([label, value]) =>
      createElement('div', {
        key: label,
        style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${border}` },
      },
        createElement('span', null, label),
        createElement('span', { style: { fontWeight: 'bold', color: accent } }, value),
      ),
    ),
  );
}

function btnStyle(active: boolean, accent: string, text: string): Record<string, string> {
  return {
    background: active ? accent : 'none',
    border: 'none',
    color: active ? '#fff' : text,
    padding: '4px 10px',
    cursor: 'pointer',
    borderRadius: '4px',
    marginRight: '4px',
    fontFamily: 'monospace',
    fontSize: '12px',
  };
}

function tdStyle(border: string): Record<string, string> {
  return { padding: '4px 8px', borderBottom: `1px solid ${border}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
