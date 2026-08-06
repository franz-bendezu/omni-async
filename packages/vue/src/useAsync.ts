import { shallowRef } from "vue";
import type { Ref } from "vue";
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
  let activeRequestCount = 0;
  let latestRequestId = 0;

  const trigger: TriggerHandler<Data, P> = async (...params) => {
    const requestId = ++latestRequestId;
    activeRequestCount += 1;
    loading.value = true;
    error.value = null;

    try {
      const result = await handler(...params);
      if (concurrency === "all" || requestId === latestRequestId) {
        onSuccess?.(result);
      }
      return result;
    } catch (caughtError) {
      if (concurrency === "all" || requestId === latestRequestId) {
        error.value = caughtError;
        onError?.(caughtError);
      }
      throw caughtError;
    } finally {
      activeRequestCount -= 1;
      if (concurrency === "all") {
        loading.value = activeRequestCount > 0;
      } else if (requestId === latestRequestId) {
        loading.value = false;
      }
    }
  };

  return { error, loading, trigger };
}
