/**
 * Dev Toolbar — Development-only toolbar for PledgeStack.
 *
 * Features:
 * - Route inspector: shows matched route, params, render mode
 * - Pledge inspector: lists all pledged components and their strategies
 * - Cache viewer: shows fetch cache entries and revalidation tags
 * - Build info: framework version, dev server status
 *
 * Only active in development mode. Injected by the dev server.
 */

interface DevToolbarData {
  route: {
    pattern: string;
    mode: string;
    params: Record<string, string>;
  };
  pledges: Array<{
    id: string;
    name: string;
    strategy: string;
    hydrated: boolean;
  }>;
  cache: Array<{
    key: string;
    tags: string[];
    revalidate: number | null;
    createdAt: number;
  }>;
  version: string;
}

let toolbarElement: HTMLElement | null = null;
let toolbarVisible = false;

export function initDevToolbar(data: DevToolbarData): void {
  if (typeof window === 'undefined') return;
  if (toolbarElement) return;

  // Listen for keyboard shortcut: Ctrl+Shift+P (toggle)
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      toggleToolbar();
    }
  });

  // Create the toolbar
  createToolbar(data);
}

function createToolbar(data: DevToolbarData): void {
  toolbarElement = document.createElement('div');
  toolbarElement.id = '__pledge_dev_toolbar__';
  toolbarElement.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 300px;
    overflow-y: auto;
    background: #1a1a2e;
    color: #e0e0e0;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 12px;
    z-index: 999999;
    border-top: 2px solid #3b82f6;
    display: none;
    padding: 12px 16px;
  `;

  const sections: string[] = [];

  // Route info
  sections.push(`
    <div style="margin-bottom: 12px;">
      <div style="color: #3b82f6; font-weight: bold; margin-bottom: 4px;">Route</div>
      <div>Pattern: <span style="color: #10b981;">${escapeHtml(data.route.pattern)}</span></div>
      <div>Mode: <span style="color: #f59e0b;">${escapeHtml(data.route.mode)}</span></div>
      <div>Params: <span style="color: #8b5cf6;">${JSON.stringify(data.route.params)}</span></div>
    </div>
  `);

  // Pledges
  if (data.pledges.length > 0) {
    const pledgeRows = data.pledges
      .map(
        (p) => `
      <tr>
        <td style="padding: 2px 8px; color: #10b981;">${escapeHtml(p.name)}</td>
        <td style="padding: 2px 8px; color: #f59e0b;">${escapeHtml(p.strategy)}</td>
        <td style="padding: 2px 8px; color: ${p.hydrated ? '#10b981' : '#6b7280'};">${p.hydrated ? 'hydrated' : 'pending'}</td>
      </tr>`,
      )
      .join('');
    sections.push(`
      <div style="margin-bottom: 12px;">
        <div style="color: #3b82f6; font-weight: bold; margin-bottom: 4px;">Pledges (${data.pledges.length})</div>
        <table><tbody>${pledgeRows}</tbody></table>
      </div>
    `);
  } else {
    sections.push(`
      <div style="margin-bottom: 12px;">
        <div style="color: #3b82f6; font-weight: bold; margin-bottom: 4px;">Pledges</div>
        <div style="color: #6b7280;">No pledged components on this page</div>
      </div>
    `);
  }

  // Cache
  if (data.cache.length > 0) {
    const cacheRows = data.cache
      .map(
        (c) => `
      <tr>
        <td style="padding: 2px 8px; color: #e0e0e0; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(c.key)}</td>
        <td style="padding: 2px 8px; color: #8b5cf6;">${c.tags.join(', ') || '-'}</td>
        <td style="padding: 2px 8px; color: #f59e0b;">${c.revalidate ?? 'none'}</td>
      </tr>`,
      )
      .join('');
    sections.push(`
      <div style="margin-bottom: 12px;">
        <div style="color: #3b82f6; font-weight: bold; margin-bottom: 4px;">Cache (${data.cache.length})</div>
        <table><tbody>${cacheRows}</tbody></table>
      </div>
    `);
  }

  // Version
  sections.push(`
    <div style="color: #6b7280; font-size: 11px;">
      PledgeStack v${escapeHtml(data.version)} — Press Ctrl+Shift+P to toggle
    </div>
  `);

  toolbarElement.innerHTML = sections.join('');
  document.body.appendChild(toolbarElement);

  // Add toggle button (always visible)
  const toggleBtn = document.createElement('button');
  toggleBtn.style.cssText = `
    position: fixed;
    bottom: 8px;
    right: 8px;
    z-index: 999999;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 11px;
    cursor: pointer;
    font-family: monospace;
  `;
  toggleBtn.textContent = 'PledgeStack';
  toggleBtn.onclick = (e) => {
    e.preventDefault();
    toggleToolbar();
  };
  document.body.appendChild(toggleBtn);
}

function toggleToolbar(): void {
  if (!toolbarElement) return;
  toolbarVisible = !toolbarVisible;
  toolbarElement.style.display = toolbarVisible ? 'block' : 'none';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
