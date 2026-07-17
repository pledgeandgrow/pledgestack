/**
 * useActionState — React 19 action state hook for progressive form enhancements.
 *
 * Wraps a server action with state management: pending, result, and error.
 * Works with <form action={}> for progressive enhancement (works without JS).
 */

import { useState, useCallback, type ReactNode } from 'react';

export interface ActionState<T = unknown, E = Error> {
  /** The current result data, null until the action succeeds */
  data: T | null;
  /** The current error, null until the action fails */
  error: E | null;
  /** Whether the action is currently in-flight */
  pending: boolean;
}

export type ActionFunction<T = unknown> = (formData: FormData) => Promise<T>;

export type UseActionStateReturn<T = unknown, E = Error> = [
  state: ActionState<T, E>,
  action: (formData: FormData) => Promise<void>,
  reset: () => void,
];

/**
 * useActionState — wraps a server action with state tracking.
 *
 * Usage:
 *   const [state, action, reset] = useActionState(myServerAction);
 *   return <form action={action}>...</form>;
 *
 * The action can be passed directly to <form action={}> for progressive
 * enhancement — it works without JavaScript and is enhanced with state
 * tracking when JS is available.
 */
export function useActionState<T = unknown, E = Error>(
  actionFn: ActionFunction<T>,
  initialState?: Partial<ActionState<T, E>>,
): UseActionStateReturn<T, E> {
  const [state, setState] = useState<ActionState<T, E>>({
    data: (initialState?.data as T) ?? null,
    error: (initialState?.error as E) ?? null,
    pending: false,
  });

  const action = useCallback(async (formData: FormData): Promise<void> => {
    setState((prev) => ({ ...prev, pending: true, error: null }));

    try {
      const data = await actionFn(formData);
      setState({ data, error: null, pending: false });
    } catch (err) {
      setState({ data: null, error: err as E, pending: false });
    }
  }, [actionFn]);

  const reset = useCallback((): void => {
    setState({ data: null, error: null, pending: false });
  }, []);

  return [state, action, reset];
}

/**
 * ActionStateForm — a form component that automatically wires up useActionState.
 * Renders a <form> with the action and provides state to children via render prop.
 */
export function ActionStateForm<T = unknown, E = Error>({
  action,
  children,
  ...props
}: {
  action: ActionFunction<T>;
  children: (state: ActionState<T, E>) => ReactNode;
  method?: 'post' | 'get';
  [key: string]: unknown;
}): ReactNode {
  const [state, formAction] = useActionState<T, E>(action);

  return createElement('form', {
    action: formAction,
    ...props,
  }, children(state));
}

// Inline createElement to avoid extra import
import { createElement } from 'react';
