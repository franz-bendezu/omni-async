<p align="center">
  <img src="./app/docs/.docs/omni-async-logo.svg" alt="Omni Async" width="160" height="160">
</p>

<h1 align="center">Omni Async</h1>

<p align="center">One typed async state engine for TypeScript, React, Vue, and Svelte.</p>

Omni Async centralizes request lifecycle, concurrency, cancellation, and notifications in a dependency-free core. Framework adapters translate the same immutable snapshots into native hooks, refs, computed values, and readable stores.

## Why Omni Async?

- One consistent state model across supported frameworks
- Independent data, error, loading, and status fields
- Typed handler parameters and results
- All-request and latest-request concurrency
- Cancellation and stale-update protection
- Custom equality for avoiding unnecessary notifications
- Small, tree-shakable ESM packages

## Packages

| Package                                   | Description                                     |
| ----------------------------------------- | ----------------------------------------------- |
| [`omni-async`](./packages/omni-async)     | Unified package with framework subpath exports  |
| [`@omni-async/core`](./packages/core)     | Dependency-free async operations for TypeScript |
| [`@omni-async/react`](./packages/react)   | React hooks using `useSyncExternalStore`        |
| [`@omni-async/vue`](./packages/vue)       | Vue composables using refs and computed state   |
| [`@omni-async/svelte`](./packages/svelte) | Svelte readable stores and lifecycle helpers    |

All packages use one shared version.

## Quick start

Choose the unified package for one dependency and consistent subpath imports:

```bash
pnpm add omni-async
```

Or install only the standalone package for your runtime:

```bash
pnpm add @omni-async/core
# or: @omni-async/react, @omni-async/vue, @omni-async/svelte
```

Create a framework-independent operation:

```ts
import { createAsync } from "omni-async";
// Explicit equivalent: import { createAsync } from "omni-async/core";
// Standalone equivalent: import { createAsync } from "@omni-async/core";

const user = createAsync(
  async ({ signal }, id: string) => {
    const response = await fetch(`/api/users/${id}`, { signal: signal ?? undefined });
    if (!response.ok) throw new Error("Unable to load user");
    return response.json() as Promise<{ id: string; name: string }>;
  },
  {
    abortable: true,
    concurrency: "latest",
  },
);

user.subscribe(() => console.log(user.getSnapshot()));
await user.execute("42");
```

Or use a framework adapter:

```tsx
import { useQuery } from "omni-async/react";
// Standalone equivalent: import { useQuery } from "@omni-async/react";

const user = useQuery((id: string) =>
  fetch(`/api/users/${id}`).then((response) => response.json()),
);

await user.trigger("42");
```

## State model

```ts
type AsyncState<Data, Empty = null> = {
  status: "idle" | "loading" | "success" | "error";
  data: Data | Empty;
  error: unknown | null;
  isLoading: boolean;
};
```

Data is preserved after an error by default. Use `dataOnError` to provide replacement data, or `isEqual` to customize which state transitions notify consumers.

## Documentation

The documentation app lives in [`apps/docs`](./apps/docs). Run it locally with:

```bash
pnpm docs:dev
```

Build the static site with:

```bash
pnpm docs:build
```

## Development

```bash
pnpm install
pnpm release:verify
```

Individual commands are also available:

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check
pnpm bench
```
