import type { AsyncConcurrency } from "@omni-async/core";
export interface QueryHandler<Data, Params extends unknown[]> {
  (...args: Params): Promise<Data>;
}

export type DataInitializer<Data> = () => Data;

export type MaybeData<Initializer, Data> = Initializer extends undefined ? Data | undefined : Data;

export type TriggerHandler<Data, Params extends unknown[]> = QueryHandler<Data, Params>;

export type QueryOptions<Data> = {
  initial?: DataInitializer<Data>;
  onSuccess?: (data: Data) => void;
  onError?: (error: unknown) => void;
};

export type QueryOptionsWithInitial<Data> = QueryOptions<Data> & {
  initial: DataInitializer<Data>;
};

export type ActionOptions<Data> = {
  concurrency?: AsyncConcurrency;
  onSuccess?: (data: Data) => void;
  onError?: (error: unknown) => void;
};

export type QueryResult<Data, Params extends unknown[], Initializer> = {
  data: MaybeData<Initializer, Data>;
  error: unknown | null;
  loading: boolean;
  trigger: TriggerHandler<Data, Params>;
};

export type FetchHandler<Data> = (signal: AbortSignal) => Promise<Data>;

export type FetchResult<Data, Initializer> = Omit<
  QueryResult<Data, [AbortSignal], Initializer>,
  "trigger"
> & {
  fetch(): Promise<Data>;
  abort(): void;
};
