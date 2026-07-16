import { useState, useCallback, useEffect } from 'react';
import { createElement } from 'react';

export interface StructuredError {
  id: string;
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  componentStack?: string;
  timestamp: number;
  type: 'runtime' | 'render' | 'hydration' | 'server' | 'module';
  severity: 'error' | 'warning';
}

export interface ErrorOverlayProps {
  errors: StructuredError[];
  onClose?: (id: string) => void;
  onClear?: () => void;
  theme?: 'dark' | 'light';
}

export function ErrorOverlay({ errors, onClose, onClear, theme = 'dark' }: ErrorOverlayProps) {
  const [selectedId, setSelectedId] = useState<string | null>(errors[0]?.id ?? null);
  const [collapsed, setCollapsed] = useState(false);

  const selected = errors.find((e) => e.id === selectedId) ?? errors[0];

  const handleClose = useCallback((id: string) => {
    onClose?.(id);
    if (selectedId === id) setSelectedId(null);
  }, [onClose, selectedId]);

  if (errors.length === 0) return null;

  const bgColor = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a1a1a';
  const borderColor = theme === 'dark' ? '#333' : '#ddd';
  const errorColor = '#ff4444';
  const warningColor = '#ffaa00';

  if (collapsed) {
    return createElement('div', {
      style: {
        position: 'fixed', bottom: '16px', right: '16px', zIndex: 99999,
        background: errorColor, color: '#fff', padding: '8px 16px',
        borderRadius: '8px', cursor: 'pointer', fontFamily: 'monospace',
        fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      },
      onClick: () => setCollapsed(false),
    }, `${errors.length} error(s)`);
  }

  return createElement('div', {
    style: {
      position: 'fixed', bottom: '0', right: '0', zIndex: 99999,
      width: '640px', maxHeight: '50vh', background: bgColor, color: textColor,
      border: `1px solid ${borderColor}`, borderRadius: '8px 0 0 0',
      fontFamily: 'monospace', fontSize: '13px', display: 'flex', flexDirection: 'column',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    },
  },
    createElement('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: `1px solid ${borderColor}` },
    },
      createElement('span', { style: { fontWeight: 'bold' } , children: `PledgeStack Errors (${errors.length})` }),
      createElement('div', null,
        createElement('button', { onClick: () => setCollapsed(true), style: { background: 'none', border: 'none', color: textColor, cursor: 'pointer', marginLeft: '8px' } }, 'Minimize'),
        createElement('button', { onClick: onClear, style: { background: 'none', border: 'none', color: textColor, cursor: 'pointer', marginLeft: '8px' } }, 'Clear'),
      ),
    ),
    createElement('div', { style: { display: 'flex', flex: 1, overflow: 'hidden' } },
      createElement('div', {
        style: { width: '200px', overflowY: 'auto', borderRight: `1px solid ${borderColor}` },
      },
        errors.map((err) => createElement('div', {
          key: err.id,
          onClick: () => setSelectedId(err.id),
          style: {
            padding: '6px 10px', cursor: 'pointer',
            background: selectedId === err.id ? (theme === 'dark' ? '#2a2a4e' : '#f0f0f0') : 'transparent',
            borderLeft: `3px solid ${err.severity === 'error' ? errorColor : warningColor}`,
          },
        },
          createElement('div', { style: { fontWeight: 'bold', fontSize: '11px', color: err.severity === 'error' ? errorColor : warningColor } }, err.type),
          createElement('div', { style: { fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, err.message),
        )),
      ),
      createElement('div', {
        style: { flex: 1, overflowY: 'auto', padding: '12px' },
      },
        selected && createElement('div', null,
          createElement('div', { style: { fontWeight: 'bold', marginBottom: '8px', color: selected.severity === 'error' ? errorColor : warningColor } }, selected.message),
          selected.source && createElement('div', { style: { fontSize: '11px', marginBottom: '4px', opacity: 0.7 } }, `${selected.source}:${selected.line}:${selected.column}`),
          selected.stack && createElement('pre', { style: { fontSize: '11px', whiteSpace: 'pre-wrap', opacity: 0.8, marginTop: '8px' } }, selected.stack),
          selected.componentStack && createElement('pre', { style: { fontSize: '11px', whiteSpace: 'pre-wrap', opacity: 0.6, marginTop: '8px', borderTop: `1px solid ${borderColor}`, paddingTop: '8px' } }, selected.componentStack),
          createElement('button', {
            onClick: () => handleClose(selected.id),
            style: { marginTop: '12px', padding: '4px 12px', background: 'transparent', border: `1px solid ${borderColor}`, color: textColor, borderRadius: '4px', cursor: 'pointer' },
          }, 'Dismiss'),
        ),
      ),
    ),
  );
}

export function useErrorCollector() {
  const [errors, setErrors] = useState<StructuredError[]>([]);

  const addError = useCallback((error: Omit<StructuredError, 'id' | 'timestamp'>) => {
    const id = `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    setErrors((prev) => [...prev, { ...error, id, timestamp: Date.now() }]);
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearErrors = useCallback(() => setErrors([]), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: ErrorEvent) => {
      addError({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        type: 'runtime',
        severity: 'error',
      });
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, [addError]);

  return { errors, addError, removeError, clearErrors };
}
