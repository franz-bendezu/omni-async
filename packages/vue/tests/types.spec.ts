import { expectTypeOf, it } from "vitest";
import { ref } from "vue";
import type { ComputedRef } from "vue";
import { useAsync, useFetch, useQuery } from "../src";

it("exposes internally owned state as computed refs", () => {
  const asyncResult = useAsync(async () => "result");
  const query = useQuery(async () => "result");
  const fetchResult = useFetch(async () => "result");

  expectTypeOf(asyncResult.data).toEqualTypeOf<ComputedRef<string | null>>();
  expectTypeOf(query.data).toEqualTypeOf<ComputedRef<string | undefined>>();
  expectTypeOf(fetchResult.data).toEqualTypeOf<ComputedRef<string | undefined>>();

  // @ts-expect-error Internally owned async state cannot be assigned by consumers.
  asyncResult.data.value = "changed";
  // @ts-expect-error Internally owned query state cannot be assigned by consumers.
  query.data.value = "changed";
  // @ts-expect-error Loading is controlled by the async operation.
  query.loading.value = false;
});

it("preserves a writable data ref supplied by the consumer", () => {
  const data = ref<string>();
  const query = useQuery(async () => "result", { data });
  const fetchResult = useFetch(async () => "result", { data });

  expectTypeOf(query.data).toEqualTypeOf(data);
  expectTypeOf(fetchResult.data).toEqualTypeOf(data);

  query.data.value = "changed";
  fetchResult.data.value = "changed again";
});
