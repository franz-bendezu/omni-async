import { defineConfig, defineProject } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      defineProject({
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/**/*.spec.ts"],
        },
      }),
      defineProject({
        test: {
          name: "bench",
          environment: "node",
          include: ["bench/**/*.bench.ts"],
        },
      }),
    ],
  },
});
