import { describe, expect, it, vi } from "vitest";
import { useAction } from "../src";

describe("useAction", () => {
  it("forwards arguments and returns the action result", async () => {
    const handler = vi.fn(async (id: number) => ({ id }));
    const { trigger } = useAction(handler);

    await expect(trigger(42)).resolves.toEqual({ id: 42 });
    expect(handler).toHaveBeenCalledWith(42);
  });

  it("exposes action failures and rethrows them", async () => {
    const expectedError = new Error("Action failed");
    const onError = vi.fn();
    const handler = vi.fn().mockRejectedValue(expectedError);
    const { error, trigger } = useAction(handler, { onError });

    await expect(trigger()).rejects.toThrow("Action failed");
    expect(error.value).toBe(expectedError);
    expect(onError).toHaveBeenCalledWith(expectedError);
  });
});
