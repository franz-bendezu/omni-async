import type { ActionOptions, QueryHandler, TriggerHandler } from "./types";
import { useAsync } from "./useAsync";

export type ActionResult<Data, Params extends unknown[]> = {
  error: unknown | null;
  loading: boolean;
  trigger: TriggerHandler<Data, Params>;
};

/**
 * Creates an on-demand async action without retaining its resolved value.
 *
 * @param handler - Async action invoked by `trigger`.
 * @param options - Success and error callbacks.
 * @returns The action error and loading state together with a typed trigger.
 * @example
 * const removeUser = useAction((id: string) => api.deleteUser(id))
 * await removeUser.trigger("42")
 */
export function useAction<Data, Params extends unknown[]>(
  handler: QueryHandler<Data, Params>,
  options?: ActionOptions<Data>,
): ActionResult<Data, Params> {
  return useAsync(handler, options);
}
