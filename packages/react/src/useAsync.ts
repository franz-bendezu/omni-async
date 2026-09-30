import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRequestLifecycle } from "@omni-async/core";
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
 * @example
 * const save = useAsync((name: string) => api.saveProfile({ name }))
 * await save.trigger("Ada")
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
  const lifecycle = useMemo(() => createRequestLifecycle({ concurrency }), [concurrency]);
  const [snapshot, setSnapshot] = useState<Readonly<AsyncState<Data, null | undefined>>>(() => ({
    status: "idle",
    data: "initialData" in options ? options.initialData : null,
    error: null,
    isLoading: false,
  }));
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const commit = useCallback((next: Readonly<AsyncState<Data, null | undefined>>) => {
    if (isEqualRef.current?.(snapshotRef.current, next)) return;
    if (
      !isEqualRef.current &&
      snapshotRef.current.status === next.status &&
      Object.is(snapshotRef.current.data, next.data) &&
      Object.is(snapshotRef.current.error, next.error) &&
      snapshotRef.current.isLoading === next.isLoading
    )
      return;
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  useEffect(
    () => () => {
      lifecycle.abort();
    },
    [lifecycle],
  );

  const trigger = useCallback(
    (...params: Params) =>
      lifecycle.execute(async (_context, ...args: Params) => handlerRef.current(...args), params, {
        start() {
          commit({ ...snapshotRef.current, status: "loading", error: null, isLoading: true });
        },
        success(data, isLoading) {
          commit({ status: "success", data, error: null, isLoading });
          onSuccessRef.current?.(data);
        },
        error(error, isLoading) {
          commit({
            ...snapshotRef.current,
            status: "error",
            data: dataOnErrorRef.current ? dataOnErrorRef.current(error) : snapshotRef.current.data,
            error,
            isLoading,
          });
          onErrorRef.current?.(error);
        },
      }),
    [lifecycle, commit],
  );

  return {
    data: snapshot.data,
    error: snapshot.error,
    loading: snapshot.isLoading,
    trigger,
  };
}
