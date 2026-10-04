import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    exclude: [
      ...configDefaults.exclude,
      "e2e/**",
      ".artifacts/**",
      ".worktrees/**",
      "scripts/tests/**",
      "scripts/**/*.test.mjs",
      ...(process.env.DENTY_TORTURE === "1" ? [] : ["**/*-torture.test.ts"]),
    ],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/domain/**/*.ts"],
      exclude: ["src/domain/**/__tests__/**", "src/domain/index.ts"],
      reporter: ["text", "json-summary"],
      // Stage 13 ratchet: measured baseline after Stages 7–12 (lines 78.4, functions 75.5,
      // statements 76.2, branches 70.5). Target stays 90 % (DNT-S13-COV-001); raise these
      // numbers as domain tests are added, never lower them.
      thresholds: {
        lines: 78,
        functions: 75,
        statements: 76,
        branches: 70,
      },
    },
  },
});
