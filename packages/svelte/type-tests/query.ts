import { expectTypeOf } from "vitest";
import type { QueryResult } from "../src";
import { useFetch, useQuery } from "../src";
import type { Readable } from "svelte/store";

const optionalQuery = useQuery(async () => "result");
const initializedQuery = useQuery(async (id: number) => ({ id }), {
  initial: () => ({ id: 0 }),
});
const optionalFetch = useFetch(async () => "result");
const initializedFetch = useFetch(async () => "result", {
  initial: () => "initial",
});

expectTypeOf(optionalQuery.data).toEqualTypeOf<Readable<string | undefined>>();
expectTypeOf(initializedQuery.data).toEqualTypeOf<Readable<{ id: number }>>();
expectTypeOf(initializedQuery.trigger).parameter(0).toEqualTypeOf<number>();
expectTypeOf(initializedQuery.trigger).returns.toEqualTypeOf<Promise<{ id: number }>>();
expectTypeOf(optionalFetch.data).toEqualTypeOf<Readable<string | undefined>>();
expectTypeOf(initializedFetch.data).toEqualTypeOf<Readable<string>>();
expectTypeOf<QueryResult<string, []>["data"]>().toEqualTypeOf<Readable<string | undefined>>();

// @ts-expect-error Initial data must match the handler's resolved value.
useQuery(async () => "result", { initial: () => 1 });
