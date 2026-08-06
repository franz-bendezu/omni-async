import { describe, expect, it, vi } from "vitest";
import { createAsync } from "../src";

describe("createAsync", () => {
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
    expect(listener).toHaveBeenCalled();
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
