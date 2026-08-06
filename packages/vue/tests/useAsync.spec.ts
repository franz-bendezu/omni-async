import { describe, expect, it, vi } from "vitest";
import { useAsync, useQuery } from "../src";

describe("useAsync", () => {
  it("tracks every active request with all concurrency", async () => {
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
    const { loading, trigger } = useAsync(handler);

    const first = trigger();
    const second = trigger();
    resolveFirst("first");
    await first;
    expect(loading.value).toBe(true);

    resolveSecond("second");
    await second;
    expect(loading.value).toBe(false);
  });
});

describe("useQuery", () => {
  it("keeps the latest result when an older request finishes later", async () => {
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
    const { data, loading, trigger } = useQuery(handler);

    const first = trigger();
    const second = trigger();
    resolveSecond("newest");
    await second;
    resolveFirst("older");
    await first;

    expect(data.value).toBe("newest");
    expect(loading.value).toBe(false);
  });

  it("clears an old error after a successful retry", async () => {
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new Error("failed"))
      .mockResolvedValueOnce("success");
    const { error, trigger } = useQuery(handler);

    await expect(trigger()).rejects.toThrow("failed");
    await trigger();

    expect(error.value).toBeNull();
  });
});
