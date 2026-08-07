import type { ComputedRef, Ref } from "vue";

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
   * When provided, this exact ref is returned as `result.data`. Its current value initializes the
   * query, accepted successful results replace its value, and rejected requests preserve it. Manual
   * changes are immediately visible through `result.data` but may be replaced by a later success.
   *
   * @remarks
   * Synchronization is one-way from accepted request results into this ref. Manual changes to the
   * ref are not copied into the composable's internal async snapshot.
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
