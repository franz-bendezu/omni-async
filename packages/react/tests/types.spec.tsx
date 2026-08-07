import { expectTypeOf, it } from "vitest";
import type { QueryResult } from "../src";
import { useFetch, useQuery } from "../src";

it("strongly types query and fetch results", () => {
  const optionalQuery = useQuery(async () => "result");
  const initializedQuery = useQuery(async (id: number) => ({ id }), {
    initial: () => ({ id: 0 }),
  });
  const optionalFetch = useFetch(async () => "result");
  const initializedFetch = useFetch(async () => "result", {
    initial: () => "initial",
  });

  expectTypeOf(optionalQuery.data).toEqualTypeOf<string | undefined>();
  expectTypeOf(initializedQuery.data).toEqualTypeOf<{ id: number }>();
  expectTypeOf(initializedQuery.trigger).parameter(0).toEqualTypeOf<number>();
  expectTypeOf(initializedQuery.trigger).returns.toEqualTypeOf<Promise<{ id: number }>>();
  expectTypeOf(optionalFetch.data).toEqualTypeOf<string | undefined>();
  expectTypeOf(initializedFetch.data).toEqualTypeOf<string>();

  // @ts-expect-error Initial data must match the handler's resolved value.
  useQuery(async () => "result", { initial: () => 1 });
});

it("defaults exported result data to optional", () => {
  expectTypeOf<QueryResult<string, []>["data"]>().toEqualTypeOf<string | undefined>();
});
