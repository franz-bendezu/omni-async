import type {
  IQueryResult,
  QueryHandler,
  QueryOptions,
  QueryOptionsWithData,
  QueryOptionsWithInitial,
} from "./types";
import { computed, shallowRef } from "@vue/runtime-core";
import type { ComputedRef, Ref } from "@vue/runtime-core";
import { useAsyncWithData } from "./useAsync";

export function useQuery<
  Data,
  P extends unknown[] = [],
  DataRef extends Ref<Data | undefined> = Ref<Data | undefined>,
>(
  handler: QueryHandler<Data, P>,
  options: QueryOptionsWithData<Data, DataRef>,
): IQueryResult<Data, P, DataRef>;

export function useQuery<Data, P extends unknown[] = []>(
  handler: QueryHandler<Data, P>,
  options: QueryOptionsWithInitial<Data>,
): IQueryResult<Data, P, ComputedRef<Data>>;

export function useQuery<Data, P extends unknown[] = []>(
  handler: QueryHandler<Data, P>,
  options?: QueryOptions<Data>,
): IQueryResult<Data, P>;

/**
 * Creates a latest-request-wins Vue query that may optionally share an external data ref.
 *
 * @param handler - Async query function invoked by `trigger`.
 * @param options - Initial data, shared data ref, and lifecycle callbacks.
 * @returns Query refs and a typed trigger function.
 * @remarks
 * When `options.data` is provided, the returned `data` is that exact writable ref and the query's
 * data storage. Accepted results replace its value; rejected requests preserve manual edits.
 * @example
 * const users = useQuery(() => api.listUsers(), { initial: () => [] })
 * await users.trigger()
 */
export function useQuery<Data, P extends unknown[] = []>(
  handler: QueryHandler<Data, P>,
  options?: QueryOptions<Data>,
): IQueryResult<Data, P, Readonly<Ref<Data | undefined>>> {
  const { initial, onError, onSuccess, data: providedData } = options || {};
  const initialData = providedData ? providedData.value : initial?.();

  const storage = (providedData ?? shallowRef(initialData)) as Ref<Data | undefined>;
  const result = useAsyncWithData<Data, P, undefined>(
    handler,
    {
      concurrency: "latest",
      initialData,
      onSuccess: (queryData) => {
        onSuccess?.(queryData);
      },
      onError: (caughtError) => {
        onError?.(caughtError);
      },
    },
    storage,
  );
  const data = providedData ?? computed(() => storage.value);

  return {
    data,
    error: result.error,
    loading: result.loading,
    trigger: result.trigger,
  };
}
