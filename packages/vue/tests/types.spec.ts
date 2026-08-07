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

it("infers defined data and handler parameters from an initializer", () => {
  const query = useQuery(async (id: number) => ({ id }), {
    initial: () => ({ id: 0 }),
  });
  const fetchResult = useFetch(async () => ({ id: 1 }), {
    initial: () => ({ id: 0 }),
  });

  expectTypeOf(query.data).toEqualTypeOf<ComputedRef<{ id: number }>>();
  expectTypeOf(query.trigger).parameter(0).toEqualTypeOf<number>();
  expectTypeOf(query.trigger).returns.toEqualTypeOf<Promise<{ id: number }>>();
  expectTypeOf(fetchResult.data).toEqualTypeOf<ComputedRef<{ id: number }>>();
});

it("preserves defined and optional external ref types", () => {
  const definedData = ref<string[]>([]);
  const optionalData = ref<string[]>();

  const definedQuery = useQuery(async () => ["result"], { data: definedData });
  const optionalQuery = useQuery(async () => ["result"], {
    data: optionalData,
    initial: () => [],
  });

  expectTypeOf(definedQuery.data).toEqualTypeOf(definedData);
  expectTypeOf(definedQuery.data.value).toEqualTypeOf<string[]>();
  expectTypeOf(optionalQuery.data).toEqualTypeOf(optionalData);
  expectTypeOf(optionalQuery.data.value).toEqualTypeOf<string[] | undefined>();
});

it("rejects option data that does not match the handler result", () => {
  // @ts-expect-error Initial data must match the handler's resolved value.
  useQuery(async () => "result", { initial: () => 1 });

  // @ts-expect-error External data must match the handler's resolved value.
  useQuery(async () => "result", { data: ref(1) });
});
