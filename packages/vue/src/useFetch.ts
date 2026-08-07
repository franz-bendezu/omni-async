import { onMounted, onScopeDispose } from "vue";
import type {
  DataInitializer,
  FetchHandler,
  FetchTriggerHandler,
  IQueryResult,
  QueryOptions,
  QueryOptionsWithData,
} from "./types";
import type { ComputedRef, Ref } from "vue";
import { useQuery } from "./useQuery";

interface IFetchResult<
  Data,
  DataRef extends Readonly<Ref<unknown>> = ComputedRef<Data | undefined>,
> extends Omit<IQueryResult<Data, [AbortSignal], DataRef>, "trigger"> {
  fetch: FetchTriggerHandler<Data>;
  abort: () => void;
}

export function useFetch<Data, DataRef extends Ref<Data | undefined>>(
  handler: FetchHandler<Data>,
  options: QueryOptionsWithData<Data, DataRef>,
): IFetchResult<Data, DataRef>;

export function useFetch<Data>(
  handler: FetchHandler<Data>,
  options: QueryOptions<Data> & { initial: DataInitializer<Data> },
): IFetchResult<Data, ComputedRef<Data>>;

export function useFetch<Data>(
  handler: FetchHandler<Data>,
  options?: QueryOptions<Data>,
): IFetchResult<Data>;

/**
 * Runs an abortable fetch when the component mounts and cancels it on unmount.
 *
 * @param handler - Fetch function that receives an `AbortSignal`.
 * @param options - Initial data and lifecycle callbacks.
 * @returns Fetch refs together with `fetch` and `abort` controls.
 * @example
 * const profile = useFetch((signal) => fetchProfile({ signal }))
 * await profile.fetch()
 */
export function useFetch<Data>(
  handler: FetchHandler<Data>,
  options?: QueryOptions<Data>,
): IFetchResult<Data, Readonly<Ref<Data | undefined>>> {
  const { data, error, loading, trigger } = useQuery(handler, options);
  let controller: AbortController | undefined;

  const abort = () => {
    controller?.abort();
  };

  const fetch = () => {
    abort();
    controller = new AbortController();
    return trigger(controller.signal);
  };

  onMounted(async () => {
    await fetch();
  });

  onScopeDispose(abort);

  return { data, error, loading, fetch, abort };
}
