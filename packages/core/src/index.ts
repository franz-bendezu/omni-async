export type AsyncStatus = "idle" | "loading" | "success" | "error";

export type AsyncState<Data> = {
  status: AsyncStatus;
  data: Data | null;
  error: unknown | null;
};

export type AsyncHandler<Data, Params extends unknown[]> = (
  ...params: Params
) => Promise<Data>;

export type AsyncOperation<Data, Params extends unknown[]> = {
  readonly state: AsyncState<Data>;
  execute(...params: Params): Promise<Data>;
};

export function createAsync<Data, Params extends unknown[]>(
  handler: AsyncHandler<Data, Params>,
): AsyncOperation<Data, Params> {
  let state: AsyncState<Data> = {
    status: "idle",
    data: null,
    error: null,
  };

  return {
    get state() {
      return state;
    },
    async execute(...params) {
      state = {
        ...state,
        status: "loading",
        error: null,
      };

      try {
        const data = await handler(...params);
        state = { status: "success", data, error: null };
        return data;
      } catch (error) {
        state = { ...state, status: "error", error };
        throw error;
      }
    },
  };
}
