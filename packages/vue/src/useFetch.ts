import { onMounted, onScopeDispose } from "vue";
import type {
  DataInitializer,
  FetchHandler,
  FetchTriggerHandler,
  IQueryResult,
  MaybeData,
  QueryOptions,
  QueryOptionsWithData,
} from "./types";
import type { ComputedRef, Ref } from "vue";
import { useQuery } from "./useQuery";

interface IFetchResult<
  Data,
  Initializer,
  DataRef extends Readonly<Ref<MaybeData<Initializer, Data>>> = ComputedRef<
    MaybeData<Initializer, Data>
  >,
> extends Omit<IQueryResult<Data, [AbortSignal], Initializer, DataRef>, "trigger"> {
  fetch: FetchTriggerHandler<Data>;
  abort: () => void;
}

export function useFetch<Data, DataRef extends Ref<Data | undefined>>(
  handler: FetchHandler<Data>,
  options: QueryOptionsWithData<Data, DataRef>,
): IFetchResult<Data, undefined, DataRef>;

export function useFetch<Data>(
  handler: FetchHandler<Data>,
  options: QueryOptions<Data> & { initial: DataInitializer<Data> },
): IFetchResult<Data, DataInitializer<Data>>;

export function useFetch<Data>(
  handler: FetchHandler<Data>,
  options?: QueryOptions<Data>,
): IFetchResult<Data, undefined>;

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
): IFetchResult<Data, DataInitializer<Data> | undefined, Readonly<Ref<Data | undefined>>> {
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
