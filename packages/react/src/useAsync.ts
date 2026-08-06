import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { createAsync } from "@omni-async/core";
import type { QueryHandler, TriggerHandler } from "./types";

export type AsyncOptions<Data> = {
  onSuccess?: (data: Data) => void;
  onError?: (error: unknown) => void;
  concurrency?: "all" | "latest";
};

export type AsyncResult<Data, Params extends unknown[]> = {
  error: unknown | null;
  loading: boolean;
  trigger: TriggerHandler<Data, Params>;
};

export function useAsync<Data, Params extends unknown[] = []>(
  handler: QueryHandler<Data, Params>,
  options: AsyncOptions<Data> = {},
): AsyncResult<Data, Params> {
  const handlerRef = useRef(handler);
  const onSuccessRef = useRef(options.onSuccess);
  const onErrorRef = useRef(options.onError);
  handlerRef.current = handler;
  onSuccessRef.current = options.onSuccess;
  onErrorRef.current = options.onError;

  const concurrency = options.concurrency ?? "all";
  const operation = useMemo(
    () =>
      createAsync(
        async (_context, ...params: Params) => handlerRef.current(...params),
        {
          concurrency,
          onSuccess: (data) => onSuccessRef.current?.(data),
          onError: (error) => onErrorRef.current?.(error),
        },
      ),
    [concurrency],
  );

  const snapshot = useSyncExternalStore(
    operation.subscribe,
    operation.getSnapshot,
    operation.getSnapshot,
  );

  useEffect(() => () => operation.abort(), [operation]);

  const trigger = useCallback(
    (...params: Params) => operation.execute(...params),
    [operation],
  );

  return { error: snapshot.error, loading: snapshot.isLoading, trigger };
}
