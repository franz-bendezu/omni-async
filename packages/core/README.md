# `@omni-async/core`

Dependency-free asynchronous state operations for JavaScript and TypeScript.

## Install

```bash
pnpm add @omni-async/core
```

## Usage

```ts
import { createAsync } from "@omni-async/core";

const search = createAsync(
  async ({ signal }, term: string) => {
    const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
      signal: signal ?? undefined,
    });
    return response.json() as Promise<string[]>;
  },
  {
    abortable: true,
    concurrency: "latest",
    initialData: [],
    dataOnError: () => [],
  },
);

const unsubscribe = search.subscribe(() => {
  const { status, data, error, isLoading } = search.getSnapshot();
  console.log({ status, data, error, isLoading });
});

await search.execute("async");
unsubscribe();
```

## Operation methods

- `getSnapshot()` returns the current immutable state.
- `subscribe(listener)` returns an unsubscribe function.
- `execute(...params)` runs the typed handler.
- `abort()` invalidates active work and aborts supported handlers.
- `reset()` restores the initial state.

For vanilla JavaScript, use the same `createAsync` API without type annotations. Subscribe to
snapshots to update the DOM, and call the returned unsubscribe function when removing the view.

`createRequestLifecycle` is available for adapters that own their own state. It tracks which
requests may commit and supports cancellation; it does not store data, errors, or loading state.

See the [full documentation](https://franz-bendezu.github.io/omni-async/api).
