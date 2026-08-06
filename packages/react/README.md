# `@omni-async/react`

Typed React hooks for asynchronous queries, fetches, and actions.

## Install

```bash
pnpm add @omni-async/react
```

React 18.3 and React 19 are supported.

## Query

```tsx
import { useQuery } from "@omni-async/react";

function Search() {
  const results = useQuery(
    (term: string) => fetch(`/api/search?q=${term}`).then((response) => response.json()),
    { initial: () => [] as string[] },
  );

  return (
    <button disabled={results.loading} onClick={() => void results.trigger("async")}>
      {results.data.length} results
    </button>
  );
}
```

## APIs

- `useAsync` exposes configurable concurrency, fallback data, callbacks, and equality.
- `useQuery` uses latest-request concurrency.
- `useAction` provides a manually triggered action without a data field.
- `useFetch` runs on mount and exposes `fetch()` and `abort()`.

See the [React guide](https://franz-bendezu.github.io/omni-async/frameworks/react).
