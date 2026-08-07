import { computed, getCurrentScope, onScopeDispose, shallowRef } from "vue";
import type { Ref } from "vue";
import { createAsync } from "@omni-async/core";
import type { AsyncConcurrency, AsyncState } from "@omni-async/core";
import type { QueryHandler, TriggerHandler } from "./types";

export type AsyncOptions<Data, Empty extends null | undefined = null> = {
  onSuccess?: (data: Data) => void;
  onError?: (error: unknown) => void;
  concurrency?: AsyncConcurrency;
  initialData?: Data | Empty;
  dataOnError?: (error: unknown) => Data | Empty;
  isEqual?: (
    previous: Readonly<AsyncState<Data, null | undefined>>,
    next: Readonly<AsyncState<Data, null | undefined>>,
  ) => boolean;
};

export type AsyncResult<Data, P extends unknown[], Empty extends null | undefined = null> = {
  data: Ref<Data | Empty>;
  error: Ref<unknown | null>;
  loading: Ref<boolean>;
  trigger: TriggerHandler<Data, P>;
};

export function useAsync<Data, P extends unknown[] = []>(
  handler: QueryHandler<Data, P>,
  options?: AsyncOptions<Data, null>,
): AsyncResult<Data, P, null>;

export function useAsync<Data, P extends unknown[] = [], Empty extends null | undefined = null>(
  handler: QueryHandler<Data, P>,
  options: AsyncOptions<Data, Empty> & { initialData: Data | Empty },
): AsyncResult<Data, P, Empty>;

/**
 * Creates Vue refs for an async handler with configurable concurrency and fallback data.
 *
 * @param handler - Async function invoked by `trigger`.
 * @param options - Initial data, concurrency, equality, and lifecycle callbacks.
 * @returns Data, error and loading refs together with a typed trigger function.
 * @example
 * const save = useAsync((name: string) => api.saveProfile({ name }))
 * await save.trigger("Ada")
 */
export function useAsync<Data, P extends unknown[] = []>(
  handler: QueryHandler<Data, P>,
  options: AsyncOptions<Data, null | undefined> = {},
): AsyncResult<Data, P, null | undefined> {
  const { concurrency = "all", dataOnError, initialData, isEqual, onError, onSuccess } = options;
  const operationOptions = {
    concurrency,
    ...(dataOnError ? { dataOnError } : {}),
    ...(isEqual ? { isEqual } : {}),
    ...("initialData" in options ? { initialData } : {}),
    onError,
    onSuccess,
  };
  const operation = createAsync<Data, P, null | undefined>(
    async (_context, ...params: P) => handler(...params),
    {
      ...operationOptions,
      initialData: "initialData" in options ? initialData : null,
    },
  );
  const state = shallowRef(operation.getSnapshot());
  const error = computed(() => state.value.error);
  const loading = computed(() => state.value.isLoading);
  const data = computed(() => state.value.data);

  const updateState = () => {
    state.value = operation.getSnapshot();
  };
  const unsubscribe = operation.subscribe(updateState);

  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe();
      operation.abort();
    });
  }

  const trigger: TriggerHandler<Data, P> = (...params) => operation.execute(...params);

  return { data, error, loading, trigger };
}
