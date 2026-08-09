# `omni-async`

Async state primitives and framework adapters from a single package.

```bash
pnpm add omni-async
```

Import the framework-independent API from the package root or the explicit core subpath:

```ts
import { createAsync } from "omni-async";
// Equivalent: import { createAsync } from "omni-async/core";
```

Framework adapters are optional. Install the adapter and framework you use:

```bash
pnpm add omni-async @omni-async/vue @vue/runtime-core vue
# or: @omni-async/react react
# or: @omni-async/svelte svelte
```

The installed adapter is then exposed through its unified-package subpath:

```ts
import { useQuery as useReactQuery } from "omni-async/react";
import { useQuery as useVueQuery } from "omni-async/vue";
import { useQuery as useSvelteQuery } from "omni-async/svelte";
```

The adapters are optional peer dependencies, so installing `omni-async` alone does
not install every supported UI framework. Importing an adapter subpath without its
corresponding `@omni-async/*` package installed will fail module resolution.

## Standalone packages

For stricter dependency separation, install and import only the package for your runtime:

```bash
pnpm add @omni-async/core
# or: @omni-async/react, @omni-async/vue, @omni-async/svelte
```

```ts
import { createAsync } from "@omni-async/core";
import { useQuery as useReactQuery } from "@omni-async/react";
import { useQuery as useVueQuery } from "@omni-async/vue";
import { useQuery as useSvelteQuery } from "@omni-async/svelte";
```
