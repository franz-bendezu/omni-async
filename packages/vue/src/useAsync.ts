import { getCurrentScope, onScopeDispose, shallowRef } from "vue";
import type { Ref } from "vue";
import { createAsync } from "@omni-async/core";
import type { QueryHandler, TriggerHandler } from "./types";

export type AsyncOptions<Data> = {
  onSuccess?: (data: Data) => void;
  onError?: (error: unknown) => void;
  concurrency?: "all" | "latest";
};

export type AsyncResult<Data, P extends unknown[]> = {
  error: Ref<unknown | null>;
  loading: Ref<boolean>;
  trigger: TriggerHandler<Data, P>;
};

export function useAsync<Data, P extends unknown[] = []>(
  handler: QueryHandler<Data, P>,
  options: AsyncOptions<Data> = {},
): AsyncResult<Data, P> {
  const { concurrency = "all", onError, onSuccess } = options;
  const error = shallowRef<unknown | null>(null);
  const loading = shallowRef(false);
  const operation = createAsync(
    async (_context, ...params: P) => handler(...params),
    { concurrency, onError, onSuccess },
  );

  const updateState = () => {
    const state = operation.getSnapshot();
    error.value = state.error;
    loading.value = state.isLoading;
  };
  const unsubscribe = operation.subscribe(updateState);

  if (getCurrentScope()) {
    onScopeDispose(unsubscribe);
  }

  const trigger: TriggerHandler<Data, P> = (...params) =>
    operation.execute(...params);

  return { error, loading, trigger };
}
