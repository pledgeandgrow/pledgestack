import {
  ACTION_ENDPOINT,
  type ServerActionMeta,
} from '@pledgestack/shared';

/**
 * Server action registry — maps action IDs to their server-side implementations.
 * Populated on the server when serverAction() is called.
 */
const actionRegistry = new Map<string, (...args: unknown[]) => Promise<unknown>>();

/**
 * Creates a type-safe server action.
 *
 * On the server: registers the function and returns a callable reference.
 * On the client: returns a proxy that POSTs to the action endpoint.
 *
 * @example
 * const submitForm = serverAction(async (data: FormData) => {
 *   // runs on server only
 *   return { success: true };
 * });
 *
 * // Can be called from any component — automatically routes to server
 * const result = await submitForm(formData);
 */
export function serverAction<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options?: { name?: string },
): (...args: TArgs) => Promise<TReturn> {
  const actionId = `action_${fn.name || 'anonymous'}_${Math.random().toString(36).slice(2, 9)}`;
  const name = options?.name ?? fn.name ?? 'anonymous';

  if (typeof window === 'undefined') {
    // Server-side: register the implementation
    actionRegistry.set(actionId, fn as (...args: unknown[]) => Promise<unknown>);

    // Return a function that calls directly on server
    const serverFn = (...args: TArgs): Promise<TReturn> => {
      return fn(...args);
    };

    // Attach metadata for serialization
    (serverFn as unknown as { __pledgeActionId: string; __pledgeActionName: string }).__pledgeActionId = actionId;
    (serverFn as unknown as { __pledgeActionId: string; __pledgeActionName: string }).__pledgeActionName = name;

    return serverFn;
  }

  // Client-side: return a proxy that POSTs to the action endpoint
  const clientFn = async (...args: TArgs): Promise<TReturn> => {
    const response = await fetch(ACTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pledge-Action-Id': actionId,
        'X-Pledge-Action-Name': name,
      },
      body: JSON.stringify({ args }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Action failed' }));
      throw new Error(error.message ?? `Server action "${name}" failed`);
    }

    const data = await response.json();
    return data.result as TReturn;
  };

  (clientFn as unknown as { __pledgeActionId: string; __pledgeActionName: string }).__pledgeActionId = actionId;
  (clientFn as unknown as { __pledgeActionId: string; __pledgeActionName: string }).__pledgeActionName = name;

  return clientFn;
}

/**
 * Gets a registered server action by ID.
 * Called by the action endpoint handler on the server.
 */
export function getServerAction(actionId: string): ((...args: unknown[]) => Promise<unknown>) | undefined {
  return actionRegistry.get(actionId);
}

/**
 * Gets all registered server actions (for serialization).
 */
export function getAllServerActions(): ServerActionMeta[] {
  const metas: ServerActionMeta[] = [];
  for (const [id] of actionRegistry) {
    const fn = actionRegistry.get(id);
    metas.push({
      id,
      name: (fn as unknown as { __pledgeActionName?: string })?.__pledgeActionName ?? id,
    });
  }
  return metas;
}
