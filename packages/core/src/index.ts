export type AsyncStatus = "idle" | "loading" | "success" | "error";

export type AsyncContext = {
  signal: AbortSignal;
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
  onSuccess?: (data: Data) => void;
  onError?: (error: unknown) => void;
};

export type AsyncOperation<Data, Params extends unknown[] = []> = {
  getSnapshot(): AsyncState<Data>;
  subscribe(listener: () => void): () => void;
  execute(...params: Params): Promise<Data>;
  abort(): void;
  reset(): void;
};

export function createAsync<Data, Params extends unknown[] = []>(
  handler: AsyncHandler<Data, Params>,
  options: AsyncOptions<Data> = {},
): AsyncOperation<Data, Params> {
  const { concurrency = "all", initialData = null, onError, onSuccess } = options;
  const listeners = new Set<() => void>();
  const controllers = new Set<AbortController>();
  let activeRequestCount = 0;
  let latestRequestId = 0;
  let state: AsyncState<Data> = {
    status: "idle",
    data: initialData,
    error: null,
    isLoading: false,
  };

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const updateState = (nextState: AsyncState<Data>) => {
    state = nextState;
    notify();
  };

  const isCurrentRequest = (requestId: number) =>
    concurrency === "all" || requestId === latestRequestId;

  const execute = async (...params: Params): Promise<Data> => {
    const requestId = ++latestRequestId;
    const controller = new AbortController();
    controllers.add(controller);
    activeRequestCount += 1;
    updateState({
      ...state,
      status: "loading",
      error: null,
      isLoading: true,
    });

    try {
      const data = await handler({ signal: controller.signal, requestId }, ...params);
      if (isCurrentRequest(requestId)) {
        updateState({ status: "success", data, error: null, isLoading: true });
        onSuccess?.(data);
      }
      return data;
    } catch (error) {
      if (isCurrentRequest(requestId)) {
        updateState({ ...state, status: "error", error, isLoading: true });
        onError?.(error);
      }
      throw error;
    } finally {
      controllers.delete(controller);
      activeRequestCount -= 1;
      if (concurrency === "all") {
        updateState({ ...state, isLoading: activeRequestCount > 0 });
      } else if (requestId === latestRequestId) {
        updateState({ ...state, isLoading: false });
      }
    }
  };

  const abort = () => {
    for (const controller of controllers) {
      controller.abort();
    }
  };

  const reset = () => {
    abort();
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
