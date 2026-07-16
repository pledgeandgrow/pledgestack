import { useState, useCallback, useRef } from 'react';

export interface OptimisticOptions<T> {
  /** Called when the server confirms the update. */
  onConfirm?: (value: T) => void;
  /** Called when the server rejects the update — should rollback. */
  onRollback?: (error: Error, previousValue: T) => void;
}

export function useOptimisticState<T>(
  serverState: T,
  options: OptimisticOptions<T> = {},
): [T, (optimistic: T, mutation: () => Promise<T>) => Promise<void>] {
  const { onConfirm, onRollback } = options;
  const [optimisticState, setOptimisticState] = useState<T>(serverState);
  const previousRef = useRef<T>(serverState);

  const applyOptimistic = useCallback(
    async (optimistic: T, mutation: () => Promise<T>) => {
      previousRef.current = optimisticState;
      setOptimisticState(optimistic);
      try {
        const confirmed = await mutation();
        setOptimisticState(confirmed);
        onConfirm?.(confirmed);
      } catch (err) {
        setOptimisticState(previousRef.current);
        onRollback?.(err instanceof Error ? err : new Error(String(err)), previousRef.current);
      }
    },
    [optimisticState, onConfirm, onRollback],
  );

  return [optimisticState, applyOptimistic];
}
