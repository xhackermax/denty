import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@denty/contracts": resolve(repoRoot, "packages/contracts/src/index.ts"),
      "@denty/db": resolve(repoRoot, "packages/db/src/index.ts"),
      "@denty/domain": resolve(repoRoot, "packages/domain/src/index.ts"),
      "@denty/fixtures": resolve(repoRoot, "packages/fixtures/src/index.ts"),
      "@denty/voice": resolve(repoRoot, "packages/voice/src/index.ts"),
    },
  },
});
