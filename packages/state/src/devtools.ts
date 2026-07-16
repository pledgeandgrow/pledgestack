import { useEffect, useRef, useState } from 'react';

export interface DevtoolsOptions {
  /** Enable/disable devtools (default: true in dev, false in prod) */
  enabled?: boolean;
  /** Max history entries (default: 50) */
  maxHistory?: number;
}

export interface StateSnapshot<T> {
  value: T;
  timestamp: number;
  action: string;
}

export class StateDevtools<T> {
  private history: StateSnapshot<T>[] = [];
  private listeners = new Set<(snapshots: StateSnapshot<T>[]) => void>();
  private maxHistory: number;
  private currentIndex = -1;

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  record(value: T, action = 'update'): void {
    const snapshot: StateSnapshot<T> = { value, timestamp: Date.now(), action };
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }
    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
    this.notify();
  }

  getHistory(): StateSnapshot<T>[] {
    return [...this.history];
  }

  getCurrent(): StateSnapshot<T> | null {
    return this.currentIndex >= 0 ? this.history[this.currentIndex] : null;
  }

  travelTo(index: number): StateSnapshot<T> | null {
    if (index < 0 || index >= this.history.length) return null;
    this.currentIndex = index;
    this.notify();
    return this.history[index];
  }

  back(): StateSnapshot<T> | null {
    return this.travelTo(this.currentIndex - 1);
  }

  forward(): StateSnapshot<T> | null {
    return this.travelTo(this.currentIndex + 1);
  }

  reset(): void {
    this.history = [];
    this.currentIndex = -1;
    this.notify();
  }

  subscribe(listener: (snapshots: StateSnapshot<T>[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.getHistory()));
  }
}

export function useDevtools<T>(
  value: T,
  options: DevtoolsOptions = {},
): StateDevtools<T> {
  const { enabled = process.env.NODE_ENV !== 'production', maxHistory = 50 } = options;
  const devtoolsRef = useRef<StateDevtools<T> | null>(null);
  if (!devtoolsRef.current) {
    devtoolsRef.current = new StateDevtools<T>(maxHistory);
  }
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (!enabled || !devtoolsRef.current) return;
    devtoolsRef.current.record(value);
  }, [value, enabled]);

  useEffect(() => {
    if (!enabled || !devtoolsRef.current) return;
    const unsub = devtoolsRef.current.subscribe(() => forceUpdate({}));
    return unsub;
  }, [enabled]);

  return devtoolsRef.current;
}
