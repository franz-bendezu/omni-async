# `@omni-async/svelte`

Typed Svelte stores for asynchronous queries, fetches, and actions.

## Install

```bash
pnpm add @omni-async/svelte
```

Svelte 5 is supported.

## Query

```svelte
<script lang="ts">
  import { useQuery } from "@omni-async/svelte";

  const { data, loading, trigger } = useQuery(
    (term: string) => fetch(`/api/search?q=${term}`).then((response) => response.json()),
    { initial: () => [] as string[] },
  );
</script>

<button disabled={$loading} onclick={() => trigger("async")}>
  {$data.length} results
</button>
```

## APIs

- `useAsync` returns readable data, error, and loading stores.
- `useQuery` uses latest-request concurrency.
- `useAction` aliases the manually triggered async primitive.
- `useFetch` runs on mount and exposes `fetch()` and `abort()`.

See the [Svelte guide](https://franz-bendezu.github.io/omni-async/frameworks/svelte).
