import { describe, expect, it, vi } from "vitest";
import { useAsync } from "../src";

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
