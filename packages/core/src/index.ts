export type AsyncStatus = "idle" | "loading" | "success" | "error";

export type AsyncContext = {
  signal: AbortSignal | null;
  requestId: number;
};

export type AsyncState<Data, Empty extends null | undefined = null> = {
  status: AsyncStatus;
  data: Data | Empty;
  error: unknown | null;
  isLoading: boolean;
};

export type AsyncHandler<Data, Params extends unknown[] = []> = (
  context: AsyncContext,
  ...params: Params
) => Promise<Data>;

export type AsyncOptions<
  Data,
  Empty extends null | undefined = null,
> = {
  initialData?: Data | Empty;
  getErrorData?: (error: unknown) => Data | Empty;
  concurrency?: "all" | "latest";
  abortable?: boolean;
  isEqual?: (
    previous: Readonly<AsyncState<Data, null | undefined>>,
    next: Readonly<AsyncState<Data, null | undefined>>,
  ) => boolean;
  onSuccess?: (data: Data) => void;
  onError?: (error: unknown) => void;
};

export type AsyncOperation<
  Data,
  Params extends unknown[] = [],
  Empty extends null | undefined = null,
> = {
  getSnapshot(): Readonly<AsyncState<Data, Empty>>;
  subscribe(listener: () => void): () => void;
  execute(...params: Params): Promise<Data>;
  abort(): void;
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

export function createAsync<Data, Params extends unknown[] = []>(
  handler: AsyncHandler<Data, Params>,
  options: AsyncOptions<Data, null | undefined> = {},
): AsyncOperation<Data, Params, null | undefined> {
  const {
    abortable = false,
    concurrency = "all",
    getErrorData,
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
  };

  const execute = async (...params: Params): Promise<Data> => {
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
    const isStillLoading = () =>
      concurrency === "all" ? activeRequestCount > 0 : false;

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
          data: getErrorData ? getErrorData(error) : state.data,
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
