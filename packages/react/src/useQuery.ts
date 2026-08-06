import { useRef } from "react";
import type {
  DataInitializer,
  QueryHandler,
  QueryOptions,
  QueryOptionsWithInitial,
  QueryResult,
} from "./types";
import { useAsync } from "./useAsync";

export function useQuery<Data, Params extends unknown[] = []>(
  handler: QueryHandler<Data, Params>,
  options: QueryOptionsWithInitial<Data>,
): QueryResult<Data, Params, DataInitializer<Data>>;

export function useQuery<Data, Params extends unknown[] = []>(
  handler: QueryHandler<Data, Params>,
  options?: QueryOptions<Data>,
): QueryResult<Data, Params, undefined>;

/**
 * Creates a latest-request-wins query for data that may be refreshed on demand.
 *
 * @param handler - Async query function invoked by `trigger`.
 * @param options - Initial data and lifecycle callbacks.
 * @returns Reactive query state and a typed trigger function.
 */
export function useQuery<Data, Params extends unknown[] = []>(
  handler: QueryHandler<Data, Params>,
  options: QueryOptions<Data> = {},
): QueryResult<Data, Params, DataInitializer<Data> | undefined> {
  const initialRef = useRef(options.initial);
  initialRef.current = options.initial;
  const initialDataRef = useRef<{ initialized: boolean; value?: Data }>({
    initialized: false,
  });
  if (!initialDataRef.current.initialized) {
    initialDataRef.current = {
      initialized: true,
      value: options.initial?.(),
    };
  }

  const { data, error, loading, trigger } = useAsync<Data, Params, undefined>(handler, {
    concurrency: "latest",
    initialData: initialDataRef.current.value,
    dataOnError: () => initialRef.current?.(),
    onSuccess: (result) => {
      options.onSuccess?.(result);
    },
    onError: (caughtError) => {
      options.onError?.(caughtError);
    },
  });

  return { data, error, loading, trigger };
}
