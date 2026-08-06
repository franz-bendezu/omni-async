import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useFetch } from "../src";

describe("useFetch", () => {
  it("aborts the active request and sends its error to Vue", async () => {
    const handler = vi.fn(
      (signal: AbortSignal) =>
        new Promise<never>((_, reject) => {
          signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const Component = defineComponent({
      setup() {
        return useFetch(handler);
      },
      render: () => h("div"),
    });
    const errorHandler = vi.fn();
    const wrapper = mount(Component, {
      global: { config: { errorHandler } },
    });

    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce());
    wrapper.vm.abort();

    await vi.waitFor(() => {
      expect(handler.mock.calls[0]?.[0].aborted).toBe(true);
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ name: "AbortError" }),
        expect.anything(),
        expect.any(String),
      );
    });
  });
});
