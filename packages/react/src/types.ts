export interface QueryHandler<Data, Params extends unknown[]> {
  (...args: Params): Promise<Data>;
}

export type DataInitializer<Data> = () => Data;

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
  onSuccess?: (data: Data) => void;
  onError?: (error: unknown) => void;
};

export type QueryResult<Data, Params extends unknown[], Value = Data | undefined> = {
  data: Value;
  error: unknown | null;
  loading: boolean;
  trigger: TriggerHandler<Data, Params>;
};

export type FetchHandler<Data> = (signal: AbortSignal) => Promise<Data>;

export type FetchResult<Data, Value = Data | undefined> = Omit<
  QueryResult<Data, [AbortSignal], Value>,
  "trigger"
> & {
  fetch(): Promise<Data>;
  abort(): void;
};
