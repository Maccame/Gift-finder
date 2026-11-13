import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    reporters: ["default", ["json", { outputFile: "test-results/vitest.json" }]],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/pages/api/**"],
      reporter: ["text", "json-summary", "json"],
    },
  },
});
