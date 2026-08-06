import type { Ref } from "vue";
import type { ActionOptions, QueryHandler, TriggerHandler } from "./types";
import { useAsync } from "./useAsync";

export interface ActionResult<Data, P extends unknown[]> {
  error: Ref<unknown | null>;
  loading: Ref<boolean>;
  trigger: TriggerHandler<Data, P>;
}

export function useAction<Data, P extends unknown[]>(
  handler: QueryHandler<Data, P>,
  options?: ActionOptions<Data>,
): ActionResult<Data, P> {
  return useAsync(handler, options);
}
