export type AsyncStatus = "idle" | "loading" | "success" | "error";

export type AsyncContext = {
  signal: AbortSignal | null;
  requestId: number;
};

export type AsyncState<Data> = {
  status: AsyncStatus;
  data: Data | null;
  error: unknown | null;
  isLoading: boolean;
};

export type AsyncHandler<Data, Params extends unknown[] = []> = (
  context: AsyncContext,
  ...params: Params
) => Promise<Data>;

export type AsyncOptions<Data> = {
  initialData?: Data | null;
  concurrency?: "all" | "latest";
  abortable?: boolean;
  onSuccess?: (data: Data) => void;
  onError?: (error: unknown) => void;
};

export type AsyncOperation<Data, Params extends unknown[] = []> = {
  getSnapshot(): Readonly<AsyncState<Data>>;
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

export function createAsync<Data, Params extends unknown[] = []>(
  handler: AsyncHandler<Data, Params>,
  options: AsyncOptions<Data> = {},
): AsyncOperation<Data, Params> {
  const {
    abortable = false,
    concurrency = "all",
    initialData = null,
    onError,
    onSuccess,
  } = options;
  const listeners = new Set<() => void>();
  const activeRequests = new Set<ActiveRequest>();
  let activeRequestCount = 0;
  let generationId = 0;
  let latestRequestId = 0;
  let state: Readonly<AsyncState<Data>> = Object.freeze({
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

  const updateState = (nextState: AsyncState<Data>) => {
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

    try {
      const data = await handler(
        { signal: request.controller?.signal ?? null, requestId: request.requestId },
        ...params,
      );
      if (canUpdateState(request)) {
        updateState({ status: "success", data, error: null, isLoading: true });
        onSuccess?.(data);
      }
      return data;
    } catch (error) {
      if (canUpdateState(request)) {
        updateState({ ...state, status: "error", error, isLoading: true });
        onError?.(error);
      }
      throw error;
    } finally {
      activeRequests.delete(request);
      if (request.generationId === generationId && !request.cancelled) {
        activeRequestCount -= 1;
      }
      if (canUpdateState(request)) {
        if (concurrency === "all") {
          updateState({ ...state, isLoading: activeRequestCount > 0 });
        } else if (request.requestId === latestRequestId) {
          updateState({ ...state, isLoading: false });
        }
      }
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
