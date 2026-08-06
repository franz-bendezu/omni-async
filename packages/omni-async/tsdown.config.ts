import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/core.ts", "src/react.ts", "src/vue.ts", "src/svelte.ts"],
  clean: true,
  dts: true,
  format: ["esm"],
});
