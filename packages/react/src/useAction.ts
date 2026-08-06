import type { ActionOptions, QueryHandler, TriggerHandler } from "./types";
import { useAsync } from "./useAsync";

export type ActionResult<Data, Params extends unknown[]> = {
  error: unknown | null;
  loading: boolean;
  trigger: TriggerHandler<Data, Params>;
};

export function useAction<Data, Params extends unknown[]>(
  handler: QueryHandler<Data, Params>,
  options?: ActionOptions<Data>,
): ActionResult<Data, Params> {
  return useAsync(handler, options);
}
