import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAction } from "../src";

describe("useAction", () => {
  it("uses the latest handler and callbacks without recreating the trigger", async () => {
    const firstSuccess = vi.fn();
    const secondSuccess = vi.fn();
    const { result, rerender } = renderHook(
      ({ value, onSuccess }: { value: string; onSuccess: (data: string) => void }) =>
        useAction(async () => value, { onSuccess }),
      { initialProps: { value: "first", onSuccess: firstSuccess } },
    );
    const firstTrigger = result.current.trigger;

    rerender({ value: "second", onSuccess: secondSuccess });
    expect(result.current.trigger).toBe(firstTrigger);

    await act(async () => {
      await expect(result.current.trigger()).resolves.toBe("second");
    });
    expect(firstSuccess).not.toHaveBeenCalled();
    expect(secondSuccess).toHaveBeenCalledWith("second");
  });
});
