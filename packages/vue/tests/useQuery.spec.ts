import { describe, expect, it, vi } from "vitest";
import { useQuery } from "../src";

describe("useQuery", () => {
  it("uses the initial value until the query succeeds", async () => {
    const handler = vi.fn().mockResolvedValue(["latest"]);
    const { data, trigger } = useQuery(handler, {
      initial: () => ["initial"],
    });

    expect(data.value).toEqual(["initial"]);
    await trigger();
    expect(data.value).toEqual(["latest"]);
  });

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
