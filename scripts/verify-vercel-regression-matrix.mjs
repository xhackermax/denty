import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];
const ok = (name) => console.log(`OK  ${name}`);
const fail = (name, detail) => failures.push(`${name}: ${detail}`);
const warn = (name, detail) => warnings.push(`${name}: ${detail}`);
async function exists(file) {
  try {
    await access(path.join(root, file));
    return true;
  } catch {
    return false;
  }
}
async function text(file) {
  return readFile(path.join(root, file), "utf8");
}

const pkg = JSON.parse(await text("package.json"));
const vercel = JSON.parse(await text("vercel.json"));
const tsconfig = await text("tsconfig.json");
const vitest = await text("vitest.config.ts");
const nextConfig = await text("next.config.ts");
const prettierIgnore = await text(".prettierignore");
const pipeline = await text("scripts/pipeline/catalog.mjs");
const top = await readdir(root);

const forbiddenRoots = [
  "apps",
  "packages",
  "prisma",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "turbo.json",
  "yarn.lock",
];
const foundForbidden = [];
for (const item of forbiddenRoots) if (await exists(item)) foundForbidden.push(item);
foundForbidden.length
  ? fail("flat-root", foundForbidden.join(", "))
  : ok("flat-root / no monorepo contamination");

if (pkg.workspaces) fail("workspaces", "package.json declares workspaces");
else ok("no workspaces");
if (vercel.rootDirectory && vercel.rootDirectory !== ".")
  fail("root-directory", String(vercel.rootDirectory));
else ok("Root Directory compatible with flat ZIP");
if (vercel.outputDirectory) fail("output-directory", String(vercel.outputDirectory));
else ok("Output Directory left to Next/Vercel default");

const locks = top.filter((name) => /(?:lock|shrinkwrap)/i.test(name));
const badLocks = locks.filter((name) => name !== "package-lock.json");
badLocks.length ? fail("lockfiles", badLocks.join(", ")) : ok("no incompatible lockfiles");
if (await exists("package-lock.json")) ok("root package-lock.json present");
else warn("root package-lock.json", "still bootstrapped on Vercel; reproducibility debt remains");

if (/pnpm|yarn|bun|prisma|turbo\s/.test(JSON.stringify(pkg.scripts ?? {})))
  fail("tooling", "scripts reintroduce non-npm/backend tooling");
else ok("npm-only frontend scripts");
if (/\.next|\bpublic\b|\bout\b/.test(String(vercel.outputDirectory ?? "")))
  fail("output-directory-family", "manual Next output configured");
else ok("no out/public/.next publication override");
if (/tsconfig\.base|\.\.\/\.\.\/|workspace:|vitest\/globals/.test(tsconfig))
  fail("tsconfig", "inherited monorepo/test reference found");
else ok("standalone tsconfig");
if (!vitest.includes('"e2e/**"')) fail("vitest-e2e", "e2e/** is not excluded");
else ok("Vitest excludes Playwright e2e");
if (/esbuild\s*:\s*\{[\s\S]*?jsx\s*:/.test(vitest))
  fail("vitest-esbuild", "legacy esbuild.jsx found");
else ok("no legacy Vite esbuild.jsx");
if (/ignoreDuringBuilds\s*:\s*true/.test(nextConfig))
  fail("next-quality", "ignoreDuringBuilds=true");
else ok("Next does not hide build quality errors");
if (nextConfig.includes("/:path((?!"))
  fail("next-route-regex", "invalid named-param negative lookahead");
else ok("Next route/header patterns avoid historical regex");
if (!prettierIgnore.includes("public/games/**")) fail("games-prettier", "legacy games not ignored");
else ok("Games excluded from Prettier");
if (await exists("public/f1-package-lock.json"))
  fail("public-lock", "f1-package-lock.json published");
else ok("no public generated lock");
if (
  pipeline.includes(
    'description: "Normalize source formatting only for manual Vercel ZIP bootstrap"',
  )
)
  fail("vercel-format-mutation", "autoformat stage still exists");
else ok("Vercel build has no source-mutating Prettier bootstrap");
const vercelFinalStage = pipeline.match(/"vercel-build-final"\s*:\s*\{[\s\S]*?\n  \},/u)?.[0] ?? "";
if (/needs:\s*\[[^\]]*(?:lint|styles|typecheck|unit|format)/u.test(vercelFinalStage)) {
  fail("vercel-quality-coupling", "Vercel final build is coupled to quality-only gates");
} else {
  ok("Vercel deploy path separated from quality-only gates");
}
if (!nextConfig.includes('source: "/games/:path*"'))
  fail("games-headers", "missing same-origin iframe override");
else ok("Games header override present");

for (const dependency of ["next", "react", "react-dom", "@mantine/core", "@mantine/hooks"]) {
  const version = pkg.dependencies?.[dependency];
  if (!version || /^[~^*]/.test(String(version)))
    fail("dependency-pinning", `${dependency}=${version ?? "missing"}`);
}
if (!failures.some((x) => x.startsWith("dependency-pinning")))
  ok("critical dependency versions pinned exactly");

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Regression matrix OK (${warnings.length} warning${warnings.length === 1 ? "" : "s"})`,
  );
}
