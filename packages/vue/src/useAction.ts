import type { Ref } from "vue";
import type { ActionOptions, QueryHandler, TriggerHandler } from "./types";
import { useAsync } from "./useAsync";

export interface ActionResult<Data, P extends unknown[]> {
  error: Ref<unknown | null>;
  loading: Ref<boolean>;
  trigger: TriggerHandler<Data, P>;
}

/**
 * Creates an on-demand Vue async action without retaining its resolved value.
 *
 * @param handler - Async action invoked by `trigger`.
 * @param options - Success and error callbacks.
 * @returns Error and loading refs together with a typed trigger.
 * @example
 * const removeUser = useAction((id: string) => api.deleteUser(id))
 * await removeUser.trigger("42")
 */
export function useAction<Data, P extends unknown[]>(
  handler: QueryHandler<Data, P>,
  options?: ActionOptions<Data>,
): ActionResult<Data, P> {
  return useAsync(handler, options);
}
