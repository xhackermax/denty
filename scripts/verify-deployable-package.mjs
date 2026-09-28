import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

function fail(message) {
  throw new Error(`Deployable package gate: ${message}`);
}

async function collectSourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(absolute)));
    } else if (sourceExtensions.includes(path.extname(entry.name))) {
      files.push(absolute);
    }
  }
  return files;
}

async function resolvesRelativeImport(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    ...sourceExtensions.map((extension) => `${base}${extension}`),
    ...sourceExtensions.map((extension) => path.join(base, `index${extension}`)),
  ];
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return true;
    } catch {
      // Try the next normal TypeScript/JavaScript resolution candidate.
    }
  }
  return false;
}

for (const required of [
  "package.json",
  ".node-version",
  ".nvmrc",
  "tsconfig.json",
  "next.config.ts",
  "vercel.json",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "public",
  "scripts/pipeline/run.mjs",
  "scripts/pipeline/catalog.mjs",
  "scripts/pipeline/self-check.mjs",
]) {
  if (!(await exists(required))) fail(`falta ${required} en la raíz desplegable`);
}

for (const forbidden of [
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "turbo.json",
  "apps",
  "packages",
  "prisma",
  "server.py",
  ".next",
]) {
  if (await exists(forbidden)) fail(`se detectó residuo incompatible: ${forbidden}`);
}

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (packageJson.workspaces) fail("package.json no puede declarar workspaces en el ZIP plano");
if (!packageJson.dependencies?.next) fail("Next.js debe estar declarado en dependencies");
if (packageJson.engines?.node !== "24.x") fail("engines.node debe mantenerse en 24.x");
if (!String(packageJson.devDependencies?.["@types/node"] ?? "").startsWith("24.")) {
  fail("@types/node debe seguir la línea 24.x para coincidir con el runtime");
}
const nodeVersionFile = (await readFile(path.join(root, ".node-version"), "utf8")).trim();
const nvmrc = (await readFile(path.join(root, ".nvmrc"), "utf8")).trim();
if (nodeVersionFile !== "24") fail(".node-version debe fijar Node 24");
if (nvmrc !== "24") fail(".nvmrc debe fijar Node 24");
const tsconfigJson = JSON.parse(await readFile(path.join(root, "tsconfig.json"), "utf8"));
if (tsconfigJson.compilerOptions?.jsx !== "react-jsx") {
  fail("tsconfig debe fijar jsx=react-jsx para evitar mutaciones de Next durante el build");
}
if (await exists("tsconfig.tsbuildinfo")) {
  fail("tsconfig.tsbuildinfo es caché local y no debe incluirse en el ZIP de Vercel");
}
if (!packageJson.scripts?.build?.includes("next build")) fail("build debe ejecutar next build");
if (!packageJson.scripts?.lint?.includes("--max-warnings=0")) {
  fail("ESLint debe tratar los warnings como fallos de entrega");
}
if (!packageJson.scripts?.test?.includes("scripts/pipeline/run.mjs test")) {
  fail("test debe delegar en el stage unit del pipeline");
}
if (!packageJson.scripts?.["test:e2e"]?.includes("scripts/pipeline/run.mjs e2e")) {
  fail("test:e2e debe delegar en el stage e2e del pipeline");
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version));
  if (!match) fail(`versión no semántica exacta: ${String(version)}`);
  return match.slice(1).map(Number);
}

function isAtLeast(version, minimum) {
  const current = parseVersion(version);
  const required = parseVersion(minimum);
  for (let index = 0; index < 3; index += 1) {
    if (current[index] > required[index]) return true;
    if (current[index] < required[index]) return false;
  }
  return true;
}

const nextVersion = packageJson.dependencies?.next;
const eslintConfigNextVersion = packageJson.devDependencies?.["eslint-config-next"];
const reactVersion = packageJson.dependencies?.react;
const reactDomVersion = packageJson.dependencies?.["react-dom"];
const mantineCoreVersion = packageJson.dependencies?.["@mantine/core"];
const mantineHooksVersion = packageJson.dependencies?.["@mantine/hooks"];

if (nextVersion !== eslintConfigNextVersion) {
  fail("next y eslint-config-next deben fijar exactamente la misma versión");
}
if (reactVersion !== reactDomVersion) {
  fail("react y react-dom deben fijar exactamente la misma versión");
}
if (mantineCoreVersion !== mantineHooksVersion) {
  fail("@mantine/core y @mantine/hooks deben fijar exactamente la misma versión");
}
if (mantineCoreVersion && parseVersion(mantineCoreVersion)[0] >= 9) {
  if (!reactVersion || !isAtLeast(reactVersion, "19.2.0")) {
    fail("Mantine 9 requiere React >=19.2.0; no uses --force ni legacy-peer-deps");
  }
  if (!nextVersion || parseVersion(nextVersion)[0] < 16) {
    fail(
      "Denty con Mantine 9 requiere Next 16+ para Activity/useEffectEvent en App Router; " +
        "Next 15 falló en next build",
    );
  }
}

const viteVersion = packageJson.devDependencies?.vite;
const viteReactVersion = packageJson.devDependencies?.["@vitejs/plugin-react"];
if (!viteVersion || !viteReactVersion) {
  fail("Vitest con TSX debe fijar vite y @vitejs/plugin-react explícitamente");
}
if (parseVersion(viteReactVersion)[0] >= 6 && parseVersion(viteVersion)[0] < 8) {
  fail("@vitejs/plugin-react 6 requiere Vite 8; no dejes el peer implícito");
}

for (const [name, version] of Object.entries({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
})) {
  if (typeof version !== "string" || /^[~^*]|\s-\s|\|\||[<>]=?/.test(version)) {
    fail(`la dependencia ${name} debe fijar una versión exacta, no ${String(version)}`);
  }
}

const declaredDependencies = new Set([
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.devDependencies ?? {}),
]);

const tsconfig = await readFile(path.join(root, "tsconfig.json"), "utf8");
for (const inheritedToken of ["tsconfig.base", "../../", "workspace:", "vitest/globals"]) {
  if (tsconfig.includes(inheritedToken)) {
    fail(`tsconfig contiene una referencia heredada incompatible: ${inheritedToken}`);
  }
}
for (const requiredOption of [
  '"strict": true',
  '"noUncheckedIndexedAccess": true',
  '"exactOptionalPropertyTypes": true',
  '"allowJs": false',
]) {
  if (!tsconfig.includes(requiredOption)) fail(`tsconfig debe conservar ${requiredOption}`);
}

const vercel = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
if (vercel.framework !== "nextjs") fail("vercel.json debe declarar framework=nextjs");
if (vercel.outputDirectory) {
  fail("no fijes Output Directory; Next.js debe usar la salida gestionada por Vercel");
}
if (vercel.rootDirectory && vercel.rootDirectory !== ".") {
  fail("Root Directory debe apuntar a la raíz real del ZIP");
}
const buildCommand = String(vercel.buildCommand ?? "");
if (buildCommand.trim() !== "node scripts/pipeline/run.mjs vercel-build") {
  fail("Vercel buildCommand debe delegar en el target vercel-build del pipeline");
}
const installCommand = String(vercel.installCommand ?? "");
if (/pnpm|yarn|bun/.test(installCommand)) fail("el ZIP plano debe usar npm de forma coherente");
const validInstall =
  installCommand.trim() === "node scripts/pipeline/run.mjs vercel-install" ||
  installCommand.trim() === "npm ci";
if (!validInstall) fail("installCommand debe usar el pipeline bootstrap o npm ci final");

const vitestConfig = await readFile(path.join(root, "vitest.config.ts"), "utf8");
if (!vitestConfig.includes('"e2e/**"')) {
  fail("Vitest debe excluir e2e/** para no ejecutar tests de Playwright");
}
if (!vitestConfig.includes('import react from "@vitejs/plugin-react"')) {
  fail("Vitest debe usar el plugin React oficial para transformar TSX");
}
if (!vitestConfig.includes("plugins: [react()]")) {
  fail("Vitest debe registrar @vitejs/plugin-react en la configuración raíz");
}
if (/esbuild\s*:\s*\{[\s\S]*?jsx\s*:/.test(vitestConfig)) {
  fail("Vite 8 no acepta esbuild.jsx; usa @vitejs/plugin-react");
}

const nextConfig = await readFile(path.join(root, "next.config.ts"), "utf8");
if (/localhost(?::\d+)?|127\.0\.0\.1/.test(nextConfig)) {
  fail("next.config no puede apuntar por defecto a un backend localhost");
}
if (/ignoreDuringBuilds\s*:\s*true/.test(nextConfig)) {
  fail("Next no puede ocultar errores de ESLint durante el build");
}

const prettierIgnore = await readFile(path.join(root, ".prettierignore"), "utf8");
if (!prettierIgnore.includes(".artifacts/")) {
  fail("los artefactos temporales del pipeline deben quedar fuera de Prettier");
}
if (await exists("public/f1-package-lock.json")) {
  fail("el lock temporal no puede publicarse como asset estático");
}

const topLevel = await readdir(root);
const lockfiles = topLevel.filter((name) => /(?:lock|shrinkwrap)/i.test(name));
const incompatibleLocks = lockfiles.filter((name) => name !== "package-lock.json");
if (incompatibleLocks.length) {
  fail(`lockfiles incompatibles: ${incompatibleLocks.join(", ")}`);
}

const hasPackageLock = await exists("package-lock.json");
if (!hasPackageLock) {
  const bootstrap = installCommand.trim() === "node scripts/pipeline/run.mjs vercel-install";
  if (!bootstrap) {
    fail("falta package-lock.json y no existe el bootstrap temporal documentado");
  }
  console.warn(
    "Deployable package gate: package-lock.json aún se genera temporalmente en Vercel; " +
      "pendiente fijarlo en raíz.",
  );
}

if (process.env.DENTY_REQUIRE_FINAL_LOCK === "1") {
  if (!hasPackageLock) fail("el artefacto final debe incluir package-lock.json en raíz");
  if (installCommand.trim() !== "npm ci") {
    fail("el artefacto final con lock debe usar installCommand=npm ci");
  }
}

const sourceFiles = await collectSourceFiles(path.join(root, "src"));
const importPattern = /(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g;
for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (!specifier) continue;
    if (specifier.startsWith(".")) {
      if (!(await resolvesRelativeImport(file, specifier))) {
        fail(`${path.relative(root, file)} importa un archivo inexistente: ${specifier}`);
      }
      continue;
    }
    if (specifier.startsWith("node:") || specifier.startsWith("@/")) continue;
    const dependency = specifier.startsWith("@")
      ? specifier.split("/").slice(0, 2).join("/")
      : specifier.split("/")[0];
    if (dependency && !declaredDependencies.has(dependency) && dependency !== "react/jsx-runtime") {
      fail(`${path.relative(root, file)} usa dependencia no declarada: ${dependency}`);
    }
  }
}

console.log(
  `Deployable package gate OK: ${sourceFiles.length} archivos fuente, ` +
    "raíz plana y dependencias coherentes.",
);
