import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  clean: true,
  dts: true,
  format: ["esm"],
  deps: {
    neverBundle: ["@vue/runtime-core"],
  },
  exports: {
    legacy: true,
    packageJson: true,
  },
});
