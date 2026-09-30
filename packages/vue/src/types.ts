import type { ComputedRef, Ref } from "@vue/runtime-core";

export interface QueryHandler<Data, P extends unknown[]> {
  (...args: P): Promise<Data>;
}

export type DataInitializer<Data> = () => Data;

export type TriggerHandler<Data, P extends unknown[]> = QueryHandler<Data, P>;

export interface IQueryResult<
  Data,
  P extends unknown[],
  DataRef extends Readonly<Ref<unknown>> = ComputedRef<Data | undefined>,
> {
  data: DataRef;
  error: ComputedRef<unknown | null>;
  loading: ComputedRef<boolean>;
  trigger: TriggerHandler<Data, P>;
}

export type QueryOptions<T> = {
  initial?: DataInitializer<T>;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  /**
   * Caller-owned writable storage for query data.
   *
   * When provided, this exact ref is returned as `result.data` and is the query's data storage.
   * Accepted successful results replace its value, rejected requests preserve it, and manual changes
   * remain visible until a later accepted result replaces them.
   */
  data?: Ref<T | undefined>;
};

export type ActionOptions<T> = {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
};

export type QueryOptionsWithInitial<T> = QueryOptions<T> & {
  initial: DataInitializer<T>;
};

export type QueryOptionsWithData<T, DataRef extends Ref<T | undefined>> = Omit<
  QueryOptions<T>,
  "data"
> & {
  data: DataRef;
};

export type FetchHandler<Data> = (signal: AbortSignal) => Promise<Data>;

export type FetchTriggerHandler<Data> = () => Promise<Data>;
