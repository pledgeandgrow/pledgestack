import { type ServerActionMeta } from 'pledgestack-shared';
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
export declare function serverAction<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => Promise<TReturn>, options?: {
    name?: string;
}): (...args: TArgs) => Promise<TReturn>;
/**
 * Gets a registered server action by ID.
 * Called by the action endpoint handler on the server.
 */
export declare function getServerAction(actionId: string): ((...args: unknown[]) => Promise<unknown>) | undefined;
/**
 * Gets all registered server actions (for serialization).
 */
export declare function getAllServerActions(): ServerActionMeta[];
//# sourceMappingURL=actions.d.ts.map