import { computed, getCurrentScope, onScopeDispose, shallowRef } from "vue";
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
  const operation = createAsync(
    async (_context, ...params: P) => handler(...params),
    { concurrency, onError, onSuccess },
  );
  const state = shallowRef(operation.getSnapshot());
  const error = computed(() => state.value.error);
  const loading = computed(() => state.value.isLoading);

  const updateState = () => {
    state.value = operation.getSnapshot();
  };
  const unsubscribe = operation.subscribe(updateState);

  if (getCurrentScope()) {
    onScopeDispose(unsubscribe);
  }

  const trigger: TriggerHandler<Data, P> = (...params) =>
    operation.execute(...params);

  return { error, loading, trigger };
}
