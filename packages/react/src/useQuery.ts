import { useRef, useState } from "react";
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

export function useQuery<Data, Params extends unknown[] = []>(
  handler: QueryHandler<Data, Params>,
  options: QueryOptions<Data> = {},
): QueryResult<Data, Params, DataInitializer<Data> | undefined> {
  const initialRef = useRef(options.initial);
  initialRef.current = options.initial;
  const [data, setData] = useState<Data | undefined>(() => options.initial?.());

  const { error, loading, trigger } = useAsync(handler, {
    concurrency: "latest",
    onSuccess: (result) => {
      setData(result);
      options.onSuccess?.(result);
    },
    onError: (caughtError) => {
      setData(initialRef.current?.());
      options.onError?.(caughtError);
    },
  });

  return { data, error, loading, trigger };
}
