import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "../src";

describe("useQuery", () => {
  it("stores query data and restores its initializer after an error", async () => {
    const handler = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("loaded")
      .mockRejectedValueOnce(new Error("failed"));
    const { result } = renderHook(() =>
      useQuery(handler, { initial: () => "initial" }),
    );

    expect(result.current.data).toBe("initial");
    await act(async () => {
      await result.current.trigger();
    });
    expect(result.current.data).toBe("loaded");

    await act(async () => {
      await expect(result.current.trigger()).rejects.toThrow("failed");
    });
    expect(result.current.data).toBe("initial");
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
