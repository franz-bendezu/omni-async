import { bench, describe } from "vitest";
import { createAsync } from "../src";

describe("createAsync", () => {
  bench("create operation", () => {
    createAsync(async () => "result");
  });

  const operation = createAsync(async () => "result");

  bench("execute resolved handler", async () => {
    await operation.execute();
  });

  const observedOperation = createAsync(async () => "result");
  observedOperation.subscribe(() => undefined);

  bench("execute with one observer", async () => {
    await observedOperation.execute();
  });
});
