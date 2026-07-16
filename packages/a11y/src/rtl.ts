import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { createElement } from 'react';

export type Direction = 'ltr' | 'rtl';

export interface RtlContext {
  direction: Direction;
  setDirection: (dir: Direction) => void;
  isRtl: boolean;
  toggle: () => void;
}

const RtlContextObj = createContext<RtlContext>({
  direction: 'ltr',
  setDirection: () => {},
  isRtl: false,
  toggle: () => {},
});

export function useRtl(): RtlContext {
  return useContext(RtlContextObj);
}

export function useDirection(): Direction {
  return useContext(RtlContextObj).direction;
}

export function RtlProvider({ children, initialDirection = 'ltr' }: { children: ReactNode; initialDirection?: Direction }) {
  const [direction, setDirection] = useState<Direction>(initialDirection);

  const toggle = useCallback(() => {
    setDirection((prev) => (prev === 'ltr' ? 'rtl' : 'ltr'));
  }, []);

  const ctx: RtlContext = {
    direction,
    setDirection,
    isRtl: direction === 'rtl',
    toggle,
  };

  return createElement(RtlContextObj.Provider, { value: ctx },
    createElement('div', { dir: direction }, children),
  );
}
