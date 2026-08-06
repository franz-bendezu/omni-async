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

Framework adapters are exposed as subpath imports:

```ts
import { useQuery as useReactQuery } from "omni-async/react";
import { useQuery as useVueQuery } from "omni-async/vue";
import { useQuery as useSvelteQuery } from "omni-async/svelte";
```

Each framework adapter owns its corresponding framework peer dependency.

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
