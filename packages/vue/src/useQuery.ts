import { shallowRef } from "vue";
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
  const {
    initial,
    onError,
    onSuccess,
    data = shallowRef(initial?.()),
  } = options || {};

  const { error, loading, trigger } = useAsync(handler, {
    concurrency: "latest",
    onSuccess: (result) => {
      data.value = result;
      onSuccess?.(result);
    },
    onError: (caughtError) => {
      data.value = initial ? initial() : undefined;
      onError?.(caughtError);
    },
  });

  return { data, error, loading, trigger };
}
