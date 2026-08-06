import type {
  DataInitializer,
  IQueryResult,
  QueryHandler,
  QueryOptions,
  QueryOptionsWithInitial,
} from "./types";
import { useAsync } from "./useAsync";

export function useQuery<Data, P extends unknown[] = []>(
  handler: QueryHandler<Data, P>,
  options: QueryOptionsWithInitial<Data>,
): IQueryResult<Data, P, DataInitializer<Data>>;

export function useQuery<Data, P extends unknown[] = []>(
  handler: QueryHandler<Data, P>,
  options?: QueryOptions<Data>,
): IQueryResult<Data, P, undefined>;

export function useQuery<Data, P extends unknown[] = []>(
  handler: QueryHandler<Data, P>,
  options?: QueryOptions<Data>,
): IQueryResult<Data, P, DataInitializer<Data> | undefined> {
  const { initial, onError, onSuccess, data: providedData } = options || {};
  const initialData = providedData ? providedData.value : initial?.();

  const result = useAsync<Data, P, undefined>(handler, {
    concurrency: "latest",
    initialData,
    dataOnError: () => {
      const fallback = initial ? initial() : undefined;
      if (providedData) providedData.value = fallback;
      return fallback;
    },
    onSuccess: (result) => {
      if (providedData) providedData.value = result;
      onSuccess?.(result);
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
