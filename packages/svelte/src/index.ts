import { createAsync } from "@omni-async/core";
import type { AsyncOptions as CoreOptions, AsyncState } from "@omni-async/core";
import { onDestroy, onMount } from "svelte";
import { derived, readable } from "svelte/store";
import type { Readable } from "svelte/store";

export type QueryHandler<Data, Params extends unknown[]> = (...params: Params) => Promise<Data>;

export type AsyncOptions<Data, Empty extends null | undefined = null> = Omit<
  CoreOptions<Data, Empty>,
  "abortable"
>;

export type AsyncResult<Data, Params extends unknown[], Empty extends null | undefined = null> = {
  data: Readable<Data | Empty>;
  error: Readable<unknown | null>;
  loading: Readable<boolean>;
  trigger: (...params: Params) => Promise<Data>;
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

export function useAsync<Data, Params extends unknown[] = []>(
  handler: QueryHandler<Data, Params>,
  options: AsyncOptions<Data, null | undefined> = {},
): AsyncResult<Data, Params, null | undefined> {
  const operation = createAsync<Data, Params, null | undefined>(
    async (_context, ...params) => handler(...params),
    {
      ...options,
      initialData: "initialData" in options ? options.initialData : null,
    },
  );
  const state = readable<Readonly<AsyncState<Data, null | undefined>>>(
    operation.getSnapshot(),
    (set) => operation.subscribe(() => set(operation.getSnapshot())),
  );

  onDestroy(() => operation.abort());

  return {
    data: derived(state, ($state) => $state.data),
    error: derived(state, ($state) => $state.error),
    loading: derived(state, ($state) => $state.isLoading),
    trigger: (...params) => operation.execute(...params),
  };
}

export type QueryOptions<Data> = {
  initial?: () => Data;
  onSuccess?: (data: Data) => void;
  onError?: (error: unknown) => void;
};

export function useQuery<Data, Params extends unknown[] = []>(
  handler: QueryHandler<Data, Params>,
  options: QueryOptions<Data> = {},
) {
  const initialData = options.initial?.();
  return useAsync<Data, Params, undefined>(handler, {
    concurrency: "latest",
    initialData,
    dataOnError: () => options.initial?.(),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

export const useAction = useAsync;

export function useFetch<Data>(
  handler: (signal: AbortSignal) => Promise<Data>,
  options: QueryOptions<Data> = {},
) {
  const query = useQuery(handler, options);
  let controller: AbortController | undefined;
  const abort = () => controller?.abort();
  const fetch = () => {
    abort();
    controller = new AbortController();
    return query.trigger(controller.signal);
  };

  onMount(() => {
    void fetch().catch(() => undefined);
  });
  onDestroy(abort);

  return {
    data: query.data,
    error: query.error,
    loading: query.loading,
    fetch,
    abort,
  };
}
