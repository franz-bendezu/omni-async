import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useFetch } from "../src";

describe("useFetch", () => {
  it("fetches on mount and aborts the active signal", async () => {
    let signal: AbortSignal | undefined;
    const handler = vi.fn(
      (nextSignal: AbortSignal) =>
        new Promise<string>(() => {
          signal = nextSignal;
        }),
    );
    const { result, unmount } = renderHook(() => useFetch(handler));

    await waitFor(() => expect(handler).toHaveBeenCalledOnce());
    expect(signal?.aborted).toBe(false);

    act(() => result.current.abort());
    expect(signal?.aborted).toBe(true);
    unmount();
  });
});
