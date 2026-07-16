import { useEffect, useRef, useCallback } from 'react';

export interface FocusOptions {
  /** Selector for focusable elements (default: standard focusable) */
  selector?: string;
  /** Restore focus on unmount (default: true) */
  restoreFocus?: boolean;
  /** Initial focus selector (default: first focusable) */
  initialFocus?: string;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

export function useFocusManagement<T extends HTMLElement = HTMLDivElement>(
  options: FocusOptions = {},
) {
  const { restoreFocus = true, initialFocus } = options;
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    if (initialFocus && containerRef.current) {
      const el = containerRef.current.querySelector(initialFocus) as HTMLElement;
      el?.focus();
    } else if (containerRef.current) {
      const first = containerRef.current.querySelector(FOCUSABLE_SELECTOR) as HTMLElement;
      first?.focus();
    }

    return () => {
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [restoreFocus, initialFocus]);

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (!containerRef.current || e.key !== 'Tab') return;

    const focusable = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [trapFocus]);

  return containerRef;
}

export class FocusManager {
  private stack: HTMLElement[] = [];

  push(element: HTMLElement): void {
    this.stack.push(document.activeElement as HTMLElement);
    element.focus();
  }

  pop(): void {
    const previous = this.stack.pop();
    previous?.focus();
  }

  get depth(): number {
    return this.stack.length;
  }
}
