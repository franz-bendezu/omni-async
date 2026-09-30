import type { AsyncContext } from "./index";

export type RequestLifecycle = {
  execute<Data, Params extends unknown[]>(
    handler: (context: AsyncContext, ...params: Params) => Promise<Data>,
    params: Params,
    callbacks: {
      start(): void;
      success(data: Data, isLoading: boolean): void;
      error(error: unknown, isLoading: boolean): void;
    },
  ): Promise<Data>;
  abort(): boolean;
  reset(): void;
};

/** Tracks request validity and cancellation without owning application state. */
export function createRequestLifecycle(
  options: {
    concurrency?: "all" | "latest";
    abortable?: boolean;
  } = {},
): RequestLifecycle {
  const { concurrency = "all", abortable = false } = options;
  type Request = {
    generationId: number;
    requestId: number;
    controller: AbortController | null;
    cancelled: boolean;
  };
  const active = new Set<Request>();
  let generationId = 0;
  let latestRequestId = 0;
  let activeCount = 0;

  const invalidate = () => {
    for (const request of active) {
      request.cancelled = true;
      request.controller?.abort();
    }
    activeCount = 0;
  };

  return {
    async execute(handler, params, callbacks) {
      const request: Request = {
        generationId,
        requestId: ++latestRequestId,
        controller: abortable ? new AbortController() : null,
        cancelled: false,
      };
      active.add(request);
      activeCount += 1;
      callbacks.start();

      const finish = () => {
        active.delete(request);
        if (request.generationId === generationId && !request.cancelled) {
          activeCount -= 1;
        }
      };
      const canCommit = () =>
        request.generationId === generationId &&
        !request.cancelled &&
        (concurrency === "all" || request.requestId === latestRequestId);
      const isLoading = () => concurrency === "all" && activeCount > 0;

      try {
        const data = await handler(
          { signal: request.controller?.signal ?? null, requestId: request.requestId },
          ...params,
        );
        finish();
        if (canCommit()) callbacks.success(data, isLoading());
        return data;
      } catch (error) {
        if (active.has(request)) finish();
        if (canCommit()) callbacks.error(error, isLoading());
        throw error;
      }
    },
    abort() {
      if (active.size === 0) return false;
      invalidate();
      return true;
    },
    reset() {
      invalidate();
      generationId += 1;
      latestRequestId += 1;
    },
  };
}
