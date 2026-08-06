import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAsync } from "../src";

describe("useAsync", () => {
  it("exposes loading and errors while preserving promise rejection", async () => {
    const failure = new Error("failed");
    const { result } = renderHook(() =>
      useAsync(async () => {
        throw failure;
      }),
    );

    let execution!: Promise<never>;
    act(() => {
      execution = result.current.trigger();
    });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await expect(execution).rejects.toBe(failure);
    });
    expect(result.current.error).toBe(failure);
    expect(result.current.loading).toBe(false);
  });
});
