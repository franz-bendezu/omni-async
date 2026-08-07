/** Lifecycle status of an asynchronous operation. */
export type AsyncStatus = "idle" | "loading" | "success" | "error";

/** Determines how overlapping executions are handled. */
export type AsyncConcurrency = "all" | "latest" | "exhaust";

/** Context supplied to an {@link AsyncHandler} for the current request. */
export type AsyncContext = {
  /** Abort signal when `abortable` is enabled, otherwise `null`. */
  signal: AbortSignal | null;
  /** Monotonically increasing identifier local to the operation. */
  requestId: number;
};

/** Immutable data exposed by an {@link AsyncOperation}. */
export type AsyncState<Data, Empty extends null | undefined = null> = {
  /** Current lifecycle status. */
  status: AsyncStatus;
  /** Most recently accepted data, or the configured empty value. */
  data: Data | Empty;
  /** Most recently accepted error. */
  error: unknown | null;
  /** Whether an accepted request is still active. */
  isLoading: boolean;
};

/** Function executed by an {@link AsyncOperation}. */
export type AsyncHandler<Data, Params extends unknown[] = []> = (
  context: AsyncContext,
  ...params: Params
) => Promise<Data>;

/** Configuration for {@link createAsync}. */
export type AsyncOptions<Data, Empty extends null | undefined = null> = {
  /** Data used for the initial state and after reset. */
  initialData?: Data | Empty;
  /** Produces replacement data when a request rejects. Existing data is preserved by default. */
  dataOnError?: (error: unknown) => Data | Empty;
  /** Controls how overlapping requests execute and update state. @defaultValue `"all"` */
  concurrency?: AsyncConcurrency;
  /** Creates an `AbortController` for each request. @defaultValue `false` */
  abortable?: boolean;
  /** Determines whether a proposed state update should notify subscribers. */
  isEqual?: (
    previous: Readonly<AsyncState<Data, null | undefined>>,
    next: Readonly<AsyncState<Data, null | undefined>>,
  ) => boolean;
  /** Called after an accepted successful state update. */
  onSuccess?: (data: Data) => void;
  /** Called after an accepted error state update. */
  onError?: (error: unknown) => void;
};

/** Observable and controllable asynchronous operation returned by {@link createAsync}. */
export type AsyncOperation<
  Data,
  Params extends unknown[] = [],
  Empty extends null | undefined = null,
> = {
  /** Returns the current frozen state snapshot. */
  getSnapshot(): Readonly<AsyncState<Data, Empty>>;
  /** Subscribes to accepted state changes and returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Executes the handler with the supplied parameters. */
  execute(...params: Params): Promise<Data>;
  /** Aborts supported work, invalidates active requests, and returns to idle. */
  abort(): void;
  /** Invalidates active requests and restores the initial state. */
  reset(): void;
};

type ActiveRequest = {
  generationId: number;
  requestId: number;
  controller: AbortController | null;
  cancelled: boolean;
};

function isAsyncStateEqual<Data, Empty extends null | undefined>(
  previous: Readonly<AsyncState<Data, Empty>>,
  next: Readonly<AsyncState<Data, Empty>>,
) {
  return (
    previous.status === next.status &&
    Object.is(previous.data, next.data) &&
    Object.is(previous.error, next.error) &&
    previous.isLoading === next.isLoading
  );
}

/**
 * Creates an observable asynchronous operation.
 *
 * @typeParam Data - Value resolved by the handler.
 * @typeParam Params - Tuple of arguments accepted by `execute`.
 * @param handler - Async function executed for every request.
 * @param options - Initial state, concurrency, cancellation, and lifecycle options.
 * @returns A stateful operation that can be executed, observed, aborted, and reset.
 *
 * @example
 * ```ts
 * const user = createAsync(
 *   ({ signal }, id: string) => fetch(`/users/${id}`, { signal }).then(r => r.json()),
 *   { concurrency: "latest", abortable: true },
 * )
 *
 * await user.execute("42")
 * console.log(user.getSnapshot().data)
 * ```
 */
export function createAsync<Data, Params extends unknown[] = []>(
  handler: AsyncHandler<Data, Params>,
  options?: AsyncOptions<Data, null>,
): AsyncOperation<Data, Params, null>;

export function createAsync<
  Data,
  Params extends unknown[] = [],
  Empty extends null | undefined = null,
>(
  handler: AsyncHandler<Data, Params>,
  options: AsyncOptions<Data, Empty> & { initialData: Data | Empty },
): AsyncOperation<Data, Params, Empty>;

/**
 * Creates an observable async operation with explicit concurrency, cancellation, and lifecycle state.
 *
 * @param handler - Async function executed for every request.
 * @param options - Initial state, concurrency, cancellation, and lifecycle options.
 * @returns A stateful operation that can be executed, observed, aborted, and reset.
 * @example
 * const operation = createAsync((_context, id: string) => loadUser(id))
 * await operation.execute("42")
 */
export function createAsync<Data, Params extends unknown[] = []>(
  handler: AsyncHandler<Data, Params>,
  options: AsyncOptions<Data, null | undefined> = {},
): AsyncOperation<Data, Params, null | undefined> {
  const {
    abortable = false,
    concurrency = "all",
    dataOnError,
    isEqual = isAsyncStateEqual,
    onError,
    onSuccess,
  } = options;
  const initialData = "initialData" in options ? options.initialData : null;
  const listeners = new Set<() => void>();
  const activeRequests = new Set<ActiveRequest>();
  let activeRequestCount = 0;
  let generationId = 0;
  let latestRequestId = 0;
  let activePromise: Promise<Data> | null = null;
  let state: Readonly<AsyncState<Data, null | undefined>> = Object.freeze({
    status: "idle",
    data: initialData,
    error: null,
    isLoading: false,
  });

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const updateState = (nextState: AsyncState<Data, null | undefined>) => {
    if (isEqual(state, nextState)) return;
    state = Object.freeze(nextState);
    notify();
  };

  const canUpdateState = (request: ActiveRequest) =>
    request.generationId === generationId &&
    !request.cancelled &&
    (concurrency === "all" || request.requestId === latestRequestId);

  const invalidateActiveRequests = () => {
    for (const request of activeRequests) {
      request.cancelled = true;
      request.controller?.abort();
    }
    activeRequestCount = 0;
    activePromise = null;
  };

  const run = async (...params: Params): Promise<Data> => {
    const request: ActiveRequest = {
      generationId,
      requestId: ++latestRequestId,
      controller: abortable ? new AbortController() : null,
      cancelled: false,
    };
    activeRequests.add(request);
    activeRequestCount += 1;
    updateState({
      ...state,
      status: "loading",
      error: null,
      isLoading: true,
    });

    let finished = false;
    const finishRequest = () => {
      if (finished) return;
      finished = true;
      activeRequests.delete(request);
      if (request.generationId === generationId && !request.cancelled) {
        activeRequestCount -= 1;
      }
    };
    const isStillLoading = () => (concurrency === "all" ? activeRequestCount > 0 : false);

    try {
      const data = await handler(
        { signal: request.controller?.signal ?? null, requestId: request.requestId },
        ...params,
      );
      finishRequest();
      if (canUpdateState(request)) {
        updateState({
          status: "success",
          data,
          error: null,
          isLoading: isStillLoading(),
        });
        onSuccess?.(data);
      }
      return data;
    } catch (error) {
      finishRequest();
      if (canUpdateState(request)) {
        updateState({
          ...state,
          status: "error",
          data: dataOnError ? dataOnError(error) : state.data,
          error,
          isLoading: isStillLoading(),
        });
        onError?.(error);
      }
      throw error;
    } finally {
      finishRequest();
    }
  };

  const execute = (...params: Params): Promise<Data> => {
    if (concurrency === "exhaust" && activePromise) return activePromise;

    const promise = run(...params);
    if (concurrency === "exhaust") {
      activePromise = promise;
      void promise.then(
        () => {
          if (activePromise === promise) activePromise = null;
        },
        () => {
          if (activePromise === promise) activePromise = null;
        },
      );
    }
    return promise;
  };

  const abort = () => {
    if (activeRequests.size === 0) return;

    invalidateActiveRequests();
    updateState({ ...state, status: "idle", error: null, isLoading: false });
  };

  const reset = () => {
    invalidateActiveRequests();
    generationId += 1;
    latestRequestId += 1;
    updateState({
      status: "idle",
      data: initialData,
      error: null,
      isLoading: false,
    });
  };

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    execute,
    abort,
    reset,
  };
}
