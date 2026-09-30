import { computed, getCurrentScope, onScopeDispose, shallowRef } from "@vue/runtime-core";
import type { ComputedRef, Ref } from "@vue/runtime-core";
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

export type AsyncResult<Data, P extends unknown[], Empty extends null | undefined = null> = {
  data: ComputedRef<Data | Empty>;
  error: ComputedRef<unknown | null>;
  loading: ComputedRef<boolean>;
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
  const storage = shallowRef<Data | null | undefined>(
    "initialData" in options ? options.initialData : null,
  ) as Ref<Data | null | undefined>;
  const result = useAsyncWithData(handler, options, storage);
  return { ...result, data: computed(() => storage.value) };
}

// Internal state adapter for queries that receive a caller-owned ref.
export function useAsyncWithData<Data, P extends unknown[], Empty extends null | undefined>(
  handler: QueryHandler<Data, P>,
  options: AsyncOptions<Data, Empty>,
  data: Ref<Data | Empty>,
) {
  const lifecycle = createRequestLifecycle({ concurrency: options.concurrency });
  const status = shallowRef<"idle" | "loading" | "success" | "error">("idle");
  const error = shallowRef<unknown | null>(null);
  const loading = shallowRef(false);
  const readState = (): Readonly<AsyncState<Data, null | undefined>> => ({
    status: status.value,
    data: data.value,
    error: error.value,
    isLoading: loading.value,
  });
  const commit = (next: Readonly<AsyncState<Data, null | undefined>>) => {
    if (options.isEqual?.(readState(), next)) return;
    status.value = next.status;
    data.value = next.data as Data | Empty;
    error.value = next.error;
    loading.value = next.isLoading;
  };
  const trigger: TriggerHandler<Data, P> = (...params) =>
    lifecycle.execute(async (_context, ...args) => handler(...args), params, {
      start() {
        commit({ ...readState(), status: "loading", error: null, isLoading: true });
      },
      success(result, isLoading) {
        commit({ status: "success", data: result, error: null, isLoading });
        options.onSuccess?.(result);
      },
      error(caughtError, isLoading) {
        commit({
          ...readState(),
          status: "error",
          data: options.dataOnError ? options.dataOnError(caughtError) : data.value,
          error: caughtError,
          isLoading,
        });
        options.onError?.(caughtError);
      },
    });

  if (getCurrentScope()) {
    onScopeDispose(() => {
      lifecycle.abort();
    });
  }

  return {
    data,
    error: computed(() => error.value),
    loading: computed(() => loading.value),
    trigger,
  };
}
