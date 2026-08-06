import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/react.ts", "src/vue.ts", "src/svelte.ts"],
  clean: true,
  dts: true,
  format: ["esm"],
  exports: {
    legacy: true,
    packageJson: true,
    customExports: {
      "./core": "./dist/index.mjs",
    },
  },
});
