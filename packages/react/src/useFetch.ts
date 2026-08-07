import { useCallback, useEffect, useRef } from "react";
import type { FetchHandler, FetchResult, QueryOptions, QueryOptionsWithInitial } from "./types";
import { useQuery } from "./useQuery";

export function useFetch<Data>(
  handler: FetchHandler<Data>,
  options: QueryOptionsWithInitial<Data>,
): FetchResult<Data, Data>;

export function useFetch<Data>(
  handler: FetchHandler<Data>,
  options?: QueryOptions<Data>,
): FetchResult<Data>;

/**
 * Runs an abortable fetch on mount and exposes controls for refetching or cancellation.
 *
 * @param handler - Fetch function that receives an `AbortSignal`.
 * @param options - Initial data and lifecycle callbacks.
 * @returns Fetch state together with `fetch` and `abort` controls.
 * @example
 * const profile = useFetch((signal) => fetchProfile({ signal }))
 * await profile.fetch()
 */
export function useFetch<Data>(
  handler: FetchHandler<Data>,
  options?: QueryOptions<Data>,
): FetchResult<Data, Data | undefined> {
  const controllerRef = useRef<AbortController | null>(null);
  const query = useQuery(handler, options);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const fetch = useCallback(() => {
    abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return query.trigger(controller.signal);
  }, [abort, query.trigger]);

  useEffect(() => {
    void fetch().catch(() => undefined);
    return abort;
  }, [abort, fetch]);

  return {
    data: query.data,
    error: query.error,
    loading: query.loading,
    fetch,
    abort,
  };
}
