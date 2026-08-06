import { onMounted, onUnmounted } from "vue";
import type {
  DataInitializer,
  FetchHandler,
  FetchTriggerHandler,
  IQueryResult,
  QueryOptions,
} from "./types";
import { useQuery } from "./useQuery";

interface IFetchResult<Data, Initializer> extends Omit<
  IQueryResult<Data, [AbortSignal], Initializer>,
  "trigger"
> {
  fetch: FetchTriggerHandler<Data>;
  abort: () => void;
}

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
 */
export function useFetch<Data>(
  handler: FetchHandler<Data>,
  options?: QueryOptions<Data>,
): IFetchResult<Data, DataInitializer<Data> | undefined> {
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

  onUnmounted(abort);

  return { data, error, loading, fetch, abort };
}
