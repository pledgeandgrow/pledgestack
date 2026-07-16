import { useEffect, useCallback, useState } from 'react';

export interface KeyboardNavOptions {
  /** Activate on Enter/Space (default: true) */
  activateOnEnter?: boolean;
  /** Activate on Space (default: true) */
  activateOnSpace?: boolean;
  /** Grid navigation (2D arrow keys) vs list (1D) (default: false) */
  grid?: boolean;
  /** Loop around (default: true) */
  loop?: boolean;
  /** Orientation (default: 'both') */
  orientation?: 'horizontal' | 'vertical' | 'both';
}

export function useKeyboardNavigation<T extends HTMLElement = HTMLDivElement>(
  items: string[],
  options: KeyboardNavOptions = {},
) {
  const {
    activateOnEnter = true,
    activateOnSpace = true,
    loop = true,
    orientation = 'both',
  } = options;

  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<T>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const count = items.length;
    if (count === 0) return;

    let next = activeIndex;

    if (e.key === 'ArrowDown' && (orientation === 'vertical' || orientation === 'both')) {
      e.preventDefault();
      next = activeIndex + 1;
      if (next >= count) next = loop ? 0 : count - 1;
    } else if (e.key === 'ArrowUp' && (orientation === 'vertical' || orientation === 'both')) {
      e.preventDefault();
      next = activeIndex - 1;
      if (next < 0) next = loop ? count - 1 : 0;
    } else if (e.key === 'ArrowRight' && (orientation === 'horizontal' || orientation === 'both')) {
      e.preventDefault();
      next = activeIndex + 1;
      if (next >= count) next = loop ? 0 : count - 1;
    } else if (e.key === 'ArrowLeft' && (orientation === 'horizontal' || orientation === 'both')) {
      e.preventDefault();
      next = activeIndex - 1;
      if (next < 0) next = loop ? count - 1 : 0;
    } else if (e.key === 'Home') {
      e.preventDefault();
      next = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      next = count - 1;
    } else if (e.key === 'Enter' && activateOnEnter) {
      e.preventDefault();
      const el = containerRef.current?.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement;
      el?.click();
    } else if (e.key === ' ' && activateOnSpace) {
      e.preventDefault();
      const el = containerRef.current?.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement;
      el?.click();
    }

    if (next !== activeIndex) {
      setActiveIndex(next);
      const el = containerRef.current?.querySelector(`[data-index="${next}"]`) as HTMLElement;
      el?.focus();
    }
  }, [activeIndex, items.length, loop, orientation, activateOnEnter, activateOnSpace]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { containerRef, activeIndex, setActiveIndex };
}

import { useRef } from 'react';
