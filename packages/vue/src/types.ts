import type { AsyncConcurrency } from "@omni-async/core";
import type { ComputedRef, Ref } from "vue";

export interface QueryHandler<Data, P extends unknown[]> {
  (...args: P): Promise<Data>;
}

export type MaybeData<Initializer, Data> = Initializer extends undefined ? Data | undefined : Data;

export type DataInitializer<Data> = () => Data;

export type TriggerHandler<Data, P extends unknown[]> = QueryHandler<Data, P>;

export interface IQueryResult<
  Data,
  P extends unknown[],
  Initializer,
  DataRef extends Readonly<Ref<MaybeData<Initializer, Data>>> = ComputedRef<
    MaybeData<Initializer, Data>
  >,
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
  data?: Ref<T | undefined>;
};

export type ActionOptions<T> = {
  concurrency?: AsyncConcurrency;
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
