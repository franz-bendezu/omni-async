import { describe, expect, it, vi } from "vitest";
import { createAsync } from "../src";

describe("createAsync", () => {
  it("returns the same snapshot until state changes", async () => {
    const operation = createAsync(async () => "done");
    const initial = operation.getSnapshot();

    expect(operation.getSnapshot()).toBe(initial);
    const execution = operation.execute();
    expect(operation.getSnapshot()).not.toBe(initial);
    await execution;
  });

  it("publishes state changes and returns handler data", async () => {
    const handler = vi.fn(async () => "done");
    const operation = createAsync(handler, { initialData: "initial" });
    const listener = vi.fn();
    operation.subscribe(listener);

    await expect(operation.execute()).resolves.toBe("done");
    expect(operation.getSnapshot()).toEqual({
      status: "success",
      data: "done",
      error: null,
      isLoading: false,
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("does not republish an identical loading state", async () => {
    const resolvers: Array<(value: string) => void> = [];
    const operation = createAsync(
      () =>
        new Promise<string>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const listener = vi.fn();
    operation.subscribe(listener);

    const first = operation.execute();
    const second = operation.execute();
    expect(listener).toHaveBeenCalledTimes(1);

    resolvers[0]?.("first");
    await first;
    resolvers[1]?.("second");
    await second;

    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("supports custom snapshot equality", async () => {
    const operation = createAsync(async () => "done", {
      isEqual: (_previous, next) => next.status === "success",
    });
    const listener = vi.fn();
    operation.subscribe(listener);

    await operation.execute();

    expect(listener).toHaveBeenCalledOnce();
    expect(operation.getSnapshot().status).toBe("loading");
  });

  it("stops publishing after a listener unsubscribes", async () => {
    const operation = createAsync(async () => "done");
    const listener = vi.fn();
    const unsubscribe = operation.subscribe(listener);

    unsubscribe();
    await operation.execute();

    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps the latest result with latest concurrency", async () => {
    let resolveFirst: (value: string) => void = () => {
      throw new Error("First request was not initialized");
    };
    let resolveSecond: (value: string) => void = () => {
      throw new Error("Second request was not initialized");
    };
    const handler = vi
      .fn()
      .mockReturnValueOnce(
        new Promise<string>((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise<string>((resolve) => {
          resolveSecond = resolve;
        }),
      );
    const operation = createAsync(handler, { concurrency: "latest" });

    const first = operation.execute();
    const second = operation.execute();
    resolveSecond("newest");
    await second;
    resolveFirst("older");
    await first;

    expect(operation.getSnapshot().data).toBe("newest");
  });

  it("stays loading until every concurrent all request settles", async () => {
    const resolvers: Array<(value: string) => void> = [];
    const operation = createAsync(
      () =>
        new Promise<string>((resolve) => {
          resolvers.push(resolve);
        }),
      { concurrency: "all" },
    );
    const first = operation.execute();
    const second = operation.execute();

    resolvers[0]?.("first");
    await first;
    expect(operation.getSnapshot().isLoading).toBe(true);

    resolvers[1]?.("second");
    await second;
    expect(operation.getSnapshot().isLoading).toBe(false);
  });

  it("reuses the active execution with exhaust concurrency", async () => {
    let resolveRequest: (value: string) => void = () => {
      throw new Error("Request was not initialized");
    };
    const onSuccess = vi.fn();
    const handler = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveRequest = resolve;
          }),
      )
      .mockResolvedValueOnce("next");
    const operation = createAsync(handler, { concurrency: "exhaust", onSuccess });

    const first = operation.execute();
    const second = operation.execute();

    expect(second).toBe(first);
    expect(handler).toHaveBeenCalledOnce();
    expect(operation.getSnapshot().isLoading).toBe(true);

    resolveRequest("done");
    await expect(Promise.all([first, second])).resolves.toEqual(["done", "done"]);
    expect(operation.getSnapshot().isLoading).toBe(false);
    expect(onSuccess).toHaveBeenCalledOnce();

    await operation.execute();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("accepts a new exhaust execution after rejection", async () => {
    const expectedError = new Error("failed");
    const onError = vi.fn();
    const handler = vi.fn().mockRejectedValueOnce(expectedError).mockResolvedValueOnce("recovered");
    const operation = createAsync(handler, { concurrency: "exhaust", onError });

    const first = operation.execute();
    expect(operation.execute()).toBe(first);
    await expect(first).rejects.toBe(expectedError);
    await expect(operation.execute()).resolves.toBe("recovered");

    expect(handler).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledOnce();
  });

  it("aborts every active handler", async () => {
    const handler = vi.fn(
      ({ signal }) =>
        new Promise<never>((_resolve, reject) => {
          if (!signal) {
            reject(new Error("Expected an abort signal"));
            return;
          }
          signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const operation = createAsync(handler, { abortable: true });
    const execution = operation.execute();

    operation.abort();

    await expect(execution).rejects.toMatchObject({ name: "AbortError" });
    expect(handler.mock.calls[0]?.[0].signal?.aborted).toBe(true);
  });

  it("prevents a pre-reset execution from updating state", async () => {
    let resolveRequest: (value: string) => void = () => {
      throw new Error("Request was not initialized");
    };
    const handler = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const operation = createAsync(handler, { concurrency: "all" });
    const execution = operation.execute();

    operation.reset();
    resolveRequest("stale");
    await execution;

    expect(operation.getSnapshot()).toEqual({
      status: "idle",
      data: null,
      error: null,
      isLoading: false,
    });
  });

  it("prevents an aborted handler that ignores its signal from updating state", async () => {
    let resolveRequest: (value: string) => void = () => {
      throw new Error("Request was not initialized");
    };
    const handler = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const operation = createAsync(handler, { abortable: true });
    const execution = operation.execute();

    operation.abort();
    resolveRequest("stale");
    await execution;

    expect(operation.getSnapshot()).toEqual({
      status: "idle",
      data: null,
      error: null,
      isLoading: false,
    });
  });
});
