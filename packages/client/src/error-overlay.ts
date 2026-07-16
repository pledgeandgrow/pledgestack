/**
 * Dev-only error overlay for PledgeStack.
 * Listens for unhandled errors and unhandled promise rejections,
 * displays an overlay with the error message and stack trace.
 */

interface ErrorInfo {
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
}

let overlayEl: HTMLDivElement | null = null;
let isVisible = false;

function createOverlay(): HTMLDivElement {
  const el = document.createElement('div');
  el.id = '__pledge_error_overlay__';
  el.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 2147483647;
    background: rgba(0, 0, 0, 0.85);
    color: #fff;
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 14px;
    padding: 24px;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `;
  return el;
}

function renderError(info: ErrorInfo): void {
  if (!overlayEl) {
    overlayEl = createOverlay();
    document.body.appendChild(overlayEl);
  }

  overlayEl.innerHTML = '';

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #333;
    padding-bottom: 12px;
  `;

  const title = document.createElement('h2');
  title.style.cssText = 'color: #ff5555; margin: 0; font-size: 16px;';
  title.textContent = 'PledgeStack — Runtime Error';
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = `
    background: #333;
    color: #fff;
    border: 1px solid #555;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  `;
  closeBtn.onclick = () => hideOverlay();
  header.appendChild(closeBtn);

  overlayEl.appendChild(header);

  const msgEl = document.createElement('div');
  msgEl.style.cssText = 'color: #ff9999; font-weight: bold; word-break: break-word;';
  msgEl.textContent = info.message;
  overlayEl.appendChild(msgEl);

  if (info.stack) {
    const stackEl = document.createElement('pre');
    stackEl.style.cssText = `
      color: #aaa;
      white-space: pre-wrap;
      word-break: break-word;
      padding: 12px;
      background: #1a1a1a;
      border-radius: 6px;
      overflow-x: auto;
    `;
    stackEl.textContent = info.stack;
    overlayEl.appendChild(stackEl);
  }

  if (info.filename) {
    const locEl = document.createElement('div');
    locEl.style.cssText = 'color: #888; font-size: 12px;';
    locEl.textContent = `at ${info.filename}:${info.lineno ?? '?'}:${info.colno ?? '?'}`;
    overlayEl.appendChild(locEl);
  }

  isVisible = true;
  overlayEl.style.display = 'flex';
}

function hideOverlay(): void {
  if (overlayEl) {
    overlayEl.style.display = 'none';
  }
  isVisible = false;
}

/**
 * Initializes the error overlay.
 * Call this only in development mode.
 */
export function initErrorOverlay(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    renderError({
      message: event.message,
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    renderError({
      message: reason?.message ?? String(reason),
      stack: reason?.stack,
    });
  });

  // Listen for HMR error events from the dev server
  window.addEventListener('pledgestack:hmr-error', ((event: CustomEvent) => {
    renderError(event.detail as ErrorInfo);
  }) as EventListener);

  // Auto-dismiss on successful HMR
  window.addEventListener('pledgestack:hmr-success', () => {
    if (isVisible) hideOverlay();
  });
}
