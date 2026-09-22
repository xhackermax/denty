const MINUTE = 60_000;

const transientNpmErrors = [
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENETUNREACH",
  "ERR_SOCKET_TIMEOUT",
  "503 Service Unavailable",
  "502 Bad Gateway",
];

function nodeScript(file, args = []) {
  return { kind: "node", file, args };
}

function npm(args) {
  return { kind: "npm", args };
}

function bin(name, args = []) {
  return { kind: "bin", name, args };
}

export const stages = {
  history: {
    description: "Block known historical deployment regressions",
    command: nodeScript("scripts/verify-history-regressions.mjs"),
    timeoutMs: 30_000,
  },
  "pipeline-self-check": {
    description: "Validate pipeline graph and execution contracts",
    command: nodeScript("scripts/pipeline/self-check.mjs"),
    timeoutMs: 30_000,
  },
  "games-integrity": {
    description: "Verify byte-for-byte integrity of recovered Denty Games assets",
    needs: ["history", "pipeline-self-check"],
    command: nodeScript("scripts/verify-games-assets.mjs"),
    timeoutMs: 30_000,
  },
  deployable: {
    description: "Validate flat Vercel package structure",
    needs: ["games-integrity"],
    command: nodeScript("scripts/verify-deployable-package.mjs"),
    timeoutMs: 30_000,
  },
  "api-parity": {
    description: "Verify browser API parity against Denty 2.3.7",
    needs: ["deployable"],
    command: nodeScript("scripts/verify-api-parity.mjs"),
    timeoutMs: 30_000,
  },
  "bff-policy": {
    description: "Verify the same-origin BFF route allowlist",
    needs: ["api-parity"],
    command: {
      kind: "node",
      file: "scripts/verify-bff-policy.ts",
      args: [],
      nodeArgs: ["--experimental-strip-types"],
    },
    timeoutMs: 30_000,
  },
  "supabase-link": {
    description: "Verify server-side Supabase environment wiring",
    needs: ["bff-policy"],
    command: nodeScript("scripts/verify-supabase-link.mjs"),
    timeoutMs: 30_000,
  },
  "vercel-regression-matrix": {
    description: "Check the historical Vercel failure matrix without dependencies",
    needs: ["supabase-link"],
    command: nodeScript("scripts/verify-vercel-regression-matrix.mjs"),
    timeoutMs: 30_000,
  },
  "domain-smoke": {
    description: "Run dependency-free domain smoke checks",
    needs: ["vercel-regression-matrix"],
    command: {
      kind: "node",
      file: "scripts/verify-domain-smoke.ts",
      args: [],
      nodeArgs: ["--experimental-strip-types"],
    },
    timeoutMs: 30_000,
  },
  "lock-bootstrap": {
    description: "Generate the temporary npm lock while lock debt remains open",
    needs: ["domain-smoke"],
    command: npm(["install", "--package-lock-only", "--ignore-scripts"]),
    timeoutMs: 2 * MINUTE,
    retry: { attempts: 2, delayMs: 2_000, outputIncludes: transientNpmErrors },
  },
  install: {
    description: "Install the exact dependency graph",
    needs: ["lock-bootstrap"],
    command: npm(["ci"]),
    timeoutMs: 3 * MINUTE,
    retry: { attempts: 2, delayMs: 2_000, outputIncludes: transientNpmErrors },
  },
  "capture-lock": {
    description: "Capture the generated lock for bootstrap evidence",
    needs: ["install"],
    command: nodeScript("scripts/capture-generated-lock.mjs"),
    timeoutMs: 30_000,
  },
  architecture: {
    description: "Enforce Denty architectural boundaries",
    needs: ["install"],
    command: nodeScript("scripts/verify-architecture.mjs"),
    timeoutMs: 30_000,
  },
  format: {
    description: "Check formatting without mutating the source",
    needs: ["install"],
    command: bin("prettier", ["--check", "."]),
    timeoutMs: MINUTE,
  },
  lint: {
    description: "Run ESLint with zero warning tolerance",
    needs: ["install"],
    command: bin("eslint", [".", "--max-warnings=0"]),
    timeoutMs: 2 * MINUTE,
  },
  styles: {
    description: "Run Stylelint",
    needs: ["install"],
    command: bin("stylelint", ["src/**/*.css"]),
    timeoutMs: MINUTE,
  },
  typecheck: {
    description: "Run strict TypeScript checks",
    needs: ["install"],
    command: bin("tsc", ["--noEmit"]),
    timeoutMs: 2 * MINUTE,
  },
  unit: {
    description: "Run unit and component tests in a test React environment",
    needs: ["install"],
    command: bin("vitest", ["run"]),
    env: { NODE_ENV: "test" },
    timeoutMs: 3 * MINUTE,
  },
  coverage: {
    description: "Enforce domain coverage thresholds",
    needs: ["unit"],
    command: bin("vitest", ["run", "--coverage"]),
    env: { NODE_ENV: "test" },
    timeoutMs: 4 * MINUTE,
  },
  build: {
    description: "Create the production Next.js build",
    needs: ["architecture", "format", "lint", "styles", "typecheck", "unit"],
    command: bin("next", ["build"]),
    env: { NODE_ENV: "production" },
    timeoutMs: 5 * MINUTE,
  },
  "vercel-build-final": {
    description: "Create the production Next.js build from the immutable uploaded source",
    // Vercel deployment is intentionally separated from the full CI quality suite.
    // CI still runs format, ESLint, Stylelint, TypeScript, Vitest and coverage.
    // Deployment keeps dependency-free regression gates + architecture + Next build,
    // so a style-only lint rule cannot prevent an otherwise valid production build.
    needs: ["architecture"],
    command: bin("next", ["build"]),
    env: { NODE_ENV: "production" },
    timeoutMs: 5 * MINUTE,
  },
  "playwright-browsers": {
    description: "Install browsers required by Playwright in CI",
    needs: ["install"],
    command: bin("playwright", ["install", "--with-deps", "chromium", "webkit"]),
    timeoutMs: 6 * MINUTE,
  },
  e2e: {
    description: "Run browser acceptance tests against the production build",
    needs: ["build", "playwright-browsers"],
    command: bin("playwright", ["test"]),
    env: { NODE_ENV: "production" },
    timeoutMs: 8 * MINUTE,
  },
  "prepare-package": {
    description: "Prepare an immutable flat Vercel artifact with npm ci",
    needs: ["capture-lock", "e2e"],
    command: nodeScript("scripts/pipeline/prepare-package.mjs"),
    timeoutMs: MINUTE,
  },
  "verify-package-history": {
    description: "Re-run historical regression gate against the packaged root",
    needs: ["prepare-package"],
    command: nodeScript("scripts/verify-history-regressions.mjs"),
    cwd: ".artifacts/vercel-package/root",
    timeoutMs: 30_000,
  },
  "verify-package": {
    description: "Re-run deployable gate against the packaged root",
    needs: ["verify-package-history"],
    command: nodeScript("scripts/verify-deployable-package.mjs"),
    cwd: ".artifacts/vercel-package/root",
    env: { DENTY_REQUIRE_FINAL_LOCK: "1" },
    timeoutMs: 30_000,
  },
  package: {
    description: "Create the verified flat-root Vercel ZIP",
    needs: ["verify-package"],
    command: nodeScript("scripts/pipeline/zip-package.mjs"),
    timeoutMs: MINUTE,
  },
};

export const targets = {
  preflight: {
    roots: ["domain-smoke"],
  },
  "vercel-install": {
    roots: ["capture-lock"],
  },
  verify: {
    roots: ["domain-smoke", "architecture", "format", "lint", "styles", "typecheck", "unit"],
    assume: ["install", "lock-bootstrap"],
  },
  test: {
    roots: ["unit"],
    assume: [
      "install",
      "lock-bootstrap",
      "domain-smoke",
      "deployable",
      "history",
      "pipeline-self-check",
    ],
  },
  build: {
    roots: ["build"],
    assume: [
      "install",
      "lock-bootstrap",
      "domain-smoke",
      "deployable",
      "history",
      "pipeline-self-check",
    ],
  },
  "vercel-build": {
    roots: ["domain-smoke", "vercel-build-final"],
    assume: ["install", "lock-bootstrap"],
  },
  coverage: {
    roots: ["coverage"],
    assume: [
      "install",
      "lock-bootstrap",
      "domain-smoke",
      "deployable",
      "history",
      "pipeline-self-check",
    ],
  },
  e2e: {
    roots: ["e2e"],
    assume: [
      "install",
      "lock-bootstrap",
      "domain-smoke",
      "deployable",
      "history",
      "pipeline-self-check",
    ],
  },
  ci: {
    roots: ["architecture", "format", "lint", "styles", "typecheck", "coverage", "package"],
  },
};
