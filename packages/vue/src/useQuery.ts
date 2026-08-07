import type {
  DataInitializer,
  IQueryResult,
  QueryHandler,
  QueryOptions,
  QueryOptionsWithData,
  QueryOptionsWithInitial,
} from "./types";
import type { Ref } from "vue";
import { useAsync } from "./useAsync";

export function useQuery<
  Data,
  P extends unknown[] = [],
  DataRef extends Ref<Data | undefined> = Ref<Data | undefined>,
>(
  handler: QueryHandler<Data, P>,
  options: QueryOptionsWithData<Data, DataRef>,
): IQueryResult<Data, P, undefined, DataRef>;

export function useQuery<Data, P extends unknown[] = []>(
  handler: QueryHandler<Data, P>,
  options: QueryOptionsWithInitial<Data>,
): IQueryResult<Data, P, DataInitializer<Data>>;

export function useQuery<Data, P extends unknown[] = []>(
  handler: QueryHandler<Data, P>,
  options?: QueryOptions<Data>,
): IQueryResult<Data, P, undefined>;

/**
 * Creates a latest-request-wins Vue query that may optionally share an external data ref.
 *
 * @param handler - Async query function invoked by `trigger`.
 * @param options - Initial data, shared data ref, and lifecycle callbacks.
 * @returns Query refs and a typed trigger function.
 * @example
 * const users = useQuery(() => api.listUsers(), { initial: () => [] })
 * await users.trigger()
 */
export function useQuery<Data, P extends unknown[] = []>(
  handler: QueryHandler<Data, P>,
  options?: QueryOptions<Data>,
): IQueryResult<Data, P, DataInitializer<Data> | undefined, Readonly<Ref<Data | undefined>>> {
  const { initial, onError, onSuccess, data: providedData } = options || {};
  const initialData = providedData ? providedData.value : initial?.();

  const result = useAsync<Data, P, undefined>(handler, {
    concurrency: "latest",
    initialData,
    onSuccess: (queryData) => {
      if (providedData) providedData.value = queryData;
      onSuccess?.(queryData);
    },
    onError: (caughtError) => {
      onError?.(caughtError);
    },
  });
  const data = providedData ?? result.data;

  return {
    data,
    error: result.error,
    loading: result.loading,
    trigger: result.trigger,
  };
}
