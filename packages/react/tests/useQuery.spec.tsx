import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "../src";

describe("useQuery", () => {
  it("stores query data and preserves it after an error", async () => {
    const handler = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("loaded")
      .mockRejectedValueOnce(new Error("failed"));
    const { result } = renderHook(() => useQuery(handler, { initial: () => "initial" }));

    expect(result.current.data).toBe("initial");
    await act(async () => {
      await result.current.trigger();
    });
    expect(result.current.data).toBe("loaded");

    await act(async () => {
      await expect(result.current.trigger()).rejects.toThrow("failed");
    });
    expect(result.current.data).toBe("loaded");
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("ignores an older result after a newer query succeeds", async () => {
    const resolvers: Array<(value: string) => void> = [];
    const { result } = renderHook(() =>
      useQuery(
        () =>
          new Promise<string>((resolve) => {
            resolvers.push(resolve);
          }),
      ),
    );
    let first!: Promise<string>;
    let second!: Promise<string>;
    act(() => {
      first = result.current.trigger();
      second = result.current.trigger();
    });

    await act(async () => {
      resolvers[1]?.("newer");
      await second;
    });
    await act(async () => {
      resolvers[0]?.("older");
      await first;
    });
    expect(result.current.data).toBe("newer");
    expect(result.current.loading).toBe(false);
  });
});
