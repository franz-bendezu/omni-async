# `@omni-async/vue`

Typed Vue composables for asynchronous queries, fetches, and actions.

## Install

```bash
pnpm add @omni-async/vue
```

Vue 3.2 and newer are supported.

## Query

```vue
<script setup lang="ts">
import { useQuery } from "@omni-async/vue";

const results = useQuery(
  (term: string) => fetch(`/api/search?q=${term}`).then((response) => response.json()),
  { initial: () => [] as string[] },
);
</script>

<template>
  <button :disabled="results.loading.value" @click="results.trigger('async')">
    {{ results.data.value.length }} results
  </button>
</template>
```

## APIs

- `useAsync` returns computed data, error, and loading refs.
- `useQuery` uses latest-request concurrency and returns a provided data ref as writable shared
  storage. Successful requests replace the ref value; rejected requests preserve it.
- `useAction` provides a manually triggered action.
- `useFetch` runs on mount and exposes `fetch()` and `abort()`.

See the [Vue guide](https://franz-bendezu.github.io/omni-async/frameworks/vue).
