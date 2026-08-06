import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { createAsync } from "@omni-async/core";
import type { AsyncState } from "@omni-async/core";
import type { QueryHandler, TriggerHandler } from "./types";

export type AsyncOptions<Data, Empty extends null | undefined = null> = {
  onSuccess?: (data: Data) => void;
  onError?: (error: unknown) => void;
  concurrency?: "all" | "latest";
  initialData?: Data | Empty;
  dataOnError?: (error: unknown) => Data | Empty;
  isEqual?: (
    previous: Readonly<AsyncState<Data, null | undefined>>,
    next: Readonly<AsyncState<Data, null | undefined>>,
  ) => boolean;
};

export type AsyncResult<Data, Params extends unknown[], Empty extends null | undefined = null> = {
  data: Data | Empty;
  error: unknown | null;
  loading: boolean;
  trigger: TriggerHandler<Data, Params>;
};

export function useAsync<Data, Params extends unknown[] = []>(
  handler: QueryHandler<Data, Params>,
  options?: AsyncOptions<Data, null>,
): AsyncResult<Data, Params, null>;

export function useAsync<
  Data,
  Params extends unknown[] = [],
  Empty extends null | undefined = null,
>(
  handler: QueryHandler<Data, Params>,
  options: AsyncOptions<Data, Empty> & { initialData: Data | Empty },
): AsyncResult<Data, Params, Empty>;

/**
 * Creates reactive state for an async handler with configurable concurrency and fallback data.
 *
 * @param handler - Async function invoked by `trigger`.
 * @param options - Initial data, concurrency, equality, and lifecycle callbacks.
 * @returns The current data, error and loading state together with a trigger function.
 */
export function useAsync<Data, Params extends unknown[] = []>(
  handler: QueryHandler<Data, Params>,
  options: AsyncOptions<Data, null | undefined> = {},
): AsyncResult<Data, Params, null | undefined> {
  const handlerRef = useRef(handler);
  const onSuccessRef = useRef(options.onSuccess);
  const onErrorRef = useRef(options.onError);
  const dataOnErrorRef = useRef(options.dataOnError);
  const isEqualRef = useRef(options.isEqual);
  handlerRef.current = handler;
  onSuccessRef.current = options.onSuccess;
  onErrorRef.current = options.onError;
  dataOnErrorRef.current = options.dataOnError;
  isEqualRef.current = options.isEqual;

  const concurrency = options.concurrency ?? "all";
  const hasInitialData = "initialData" in options;
  const hasErrorData = options.dataOnError !== undefined;
  const hasCustomEquality = options.isEqual !== undefined;
  const operation = useMemo(() => {
    const operationOptions = {
      concurrency,
      ...(hasInitialData ? { initialData: options.initialData } : {}),
      ...(hasErrorData
        ? {
            dataOnError: (error: unknown) => dataOnErrorRef.current?.(error),
          }
        : {}),
      onSuccess: (data: Data) => onSuccessRef.current?.(data),
      onError: (error: unknown) => onErrorRef.current?.(error),
      ...(hasCustomEquality
        ? {
            isEqual: (
              previous: Readonly<AsyncState<Data, null | undefined>>,
              next: Readonly<AsyncState<Data, null | undefined>>,
            ) => isEqualRef.current?.(previous, next) ?? false,
          }
        : {}),
    };
    return createAsync<Data, Params, null | undefined>(
      async (_context, ...params: Params) => handlerRef.current(...params),
      {
        ...operationOptions,
        initialData: "initialData" in options ? options.initialData : null,
      },
    );
  }, [concurrency, hasCustomEquality, hasErrorData, hasInitialData]);

  const snapshot = useSyncExternalStore(
    operation.subscribe,
    operation.getSnapshot,
    operation.getSnapshot,
  );

  useEffect(() => () => operation.abort(), [operation]);

  const trigger = useCallback((...params: Params) => operation.execute(...params), [operation]);

  return {
    data: snapshot.data,
    error: snapshot.error,
    loading: snapshot.isLoading,
    trigger,
  };
}
