import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

function fail(message) {
  throw new Error(`Historical regression gate: ${message}`);
}

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

const packageJson = JSON.parse(await read("package.json"));
const vercel = JSON.parse(await read("vercel.json"));
const tsconfig = await read("tsconfig.json");
const nextConfig = await read("next.config.ts");
const vitestConfig = await read("vitest.config.ts");
const playwrightConfig = await read("playwright.config.ts");
const eslintConfig = await read("eslint.config.mjs");
const stylelintConfig = await read("stylelint.config.mjs");
const prettierIgnore = await read(".prettierignore");
const testSetup = await read("src/test/setup.ts");
const sharedUiTest = await read("src/shared/ui/shared-ui.test.tsx");
const densityProvider = await read("src/shared/ui/density-provider.tsx");
const pipelineCatalog = await read("scripts/pipeline/catalog.mjs");

const permissionsSource = await read("src/domain/permissions.ts");
const proxyPolicy = await read("src/shared/api/proxy-policy.ts");
const apiParityScript = await read("scripts/verify-api-parity.mjs");
const authProxy = await read("src/proxy.ts");
const loginPage = await read("src/app/(public)/login/page.tsx");
const loginForm = await read("src/features/auth/login-form.tsx");

for (const recoveredAsset of [
  "public/assets/denty-logo.png",
  "public/games/index.html",
  "../../docs/PARITY-237-IMPLEMENTATION.md",
]) {
  if (!(await exists(recoveredAsset))) {
    fail(`la paridad 2.3.7 perdió el asset/documento recuperado: ${recoveredAsset}`);
  }
}

// 2026-09 historical Vercel failures: never mix the deployable flat frontend
// with the old monorepo/backend layout.
for (const forbidden of [
  "apps",
  "packages",
  "prisma",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "turbo.json",
]) {
  if (await exists(forbidden)) fail(`el ZIP plano no puede contener ${forbidden}`);
}

// Do not reject `.vercel` here. Vercel may create that directory inside the
// build workspace before installCommand runs, even when the uploaded archive
// did not contain it. Portability of the source ZIP is verified when packaging,
// not from the mutated runtime workspace. Never read project identity from it.

for (const required of [
  "package.json",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "public",
  "next.config.ts",
  "tsconfig.json",
  "vercel.json",
]) {
  if (!(await exists(required))) fail(`falta ${required} en la raíz real del ZIP`);
}

if (packageJson.workspaces) fail("package.json no puede declarar workspaces");
if (!packageJson.dependencies?.next) fail("Next.js debe estar declarado en dependencies");
if (!String(packageJson.scripts?.build ?? "").includes("next build")) {
  fail("build debe ejecutar next build directamente");
}
if (!String(packageJson.scripts?.verify ?? "").includes("scripts/pipeline/run.mjs verify")) {
  fail("verify debe delegar en el orquestador único");
}
if (!String(packageJson.scripts?.test ?? "").includes("scripts/pipeline/run.mjs test")) {
  fail("test debe delegar en el stage unit para fijar NODE_ENV=test");
}

for (const [name, script] of Object.entries(packageJson.scripts ?? {})) {
  const value = String(script);
  if (/pnpm|yarn|bun|prisma|turbo\s/.test(value)) {
    fail(`script ${name} reintroduce tooling de monorepo/backend: ${value}`);
  }
  if (/--legacy-peer-deps|--force/.test(value)) {
    fail(`script ${name} no puede ocultar conflictos de dependencias`);
  }
}

if (vercel.framework !== "nextjs") fail("vercel.json debe declarar framework=nextjs");
if (vercel.outputDirectory) {
  fail("Output Directory debe quedar vacío; nunca publicar .next, public u out manualmente");
}
if (vercel.rootDirectory && vercel.rootDirectory !== ".") {
  fail("Root Directory debe ser la raíz real del ZIP plano");
}

const installCommand = String(vercel.installCommand ?? "");
const buildCommand = String(vercel.buildCommand ?? "");
if (/pnpm|yarn|bun/.test(installCommand)) fail("Vercel debe usar npm de forma coherente");
if (/--legacy-peer-deps|--force/.test(installCommand)) {
  fail("installCommand no puede ocultar ERESOLVE con legacy-peer-deps/force");
}
if (/\.next|\bpublic\b|\bout\b/.test(String(vercel.outputDirectory ?? ""))) {
  fail("no publiques una carpeta interna de Next como sitio estático");
}
if (buildCommand.trim() !== "node scripts/pipeline/run.mjs vercel-build") {
  fail("Vercel debe delegar el build en el target vercel-build del pipeline");
}
const validInstallCommand =
  installCommand.trim() === "node scripts/pipeline/run.mjs vercel-install" ||
  installCommand.trim() === "npm ci";
if (!validInstallCommand) {
  fail("Vercel debe usar vercel-install durante bootstrap o npm ci en el artefacto final");
}
if (/next\s+export|npm\s+run\s+export/.test(buildCommand)) {
  fail("Denty V3 no usa export estático");
}

for (const inherited of [
  "../../tsconfig.base.json",
  "tsconfig.base.json",
  "workspace:",
  '"types": ["vitest/globals"]',
]) {
  if (tsconfig.includes(inherited)) {
    fail(`tsconfig reintroduce una referencia heredada: ${inherited}`);
  }
}
if (!tsconfig.includes('"jsx": "preserve"')) {
  fail("Next debe conservar jsx=preserve en tsconfig");
}
if (!tsconfig.includes('"allowImportingTsExtensions": true')) {
  fail("el smoke TypeScript necesita allowImportingTsExtensions con noEmit");
}
if (!tsconfig.includes('"noEmit": true')) {
  fail("allowImportingTsExtensions solo se admite aquí con noEmit=true");
}

if (/output\s*:\s*["']export["']/.test(nextConfig)) {
  fail("next.config no puede volver al modo output=export");
}
if (/ignoreDuringBuilds\s*:\s*true/.test(nextConfig)) {
  fail("Next no puede esconder errores de calidad durante el build");
}
const globalHeadersSource = 'source: "/:path*"';
const gamesHeadersSource = 'source: "/games/:path*"';
if (!nextConfig.includes(gamesHeadersSource)) {
  fail("Denty Games necesita cabeceras específicas para poder renderizarse en iframe");
}
if (!nextConfig.includes("frame-ancestors 'self'") || !nextConfig.includes('value: "SAMEORIGIN"')) {
  fail("Denty Games debe permitir framing same-origin sin abrir framing externo");
}
if (!nextConfig.includes(globalHeadersSource)) {
  fail("Denty necesita una política de cabeceras global para todas las rutas");
}
if (nextConfig.includes('/:path((?!')) {
  fail("next.config no debe usar negative lookahead dentro de un parámetro nombrado");
}
if (nextConfig.indexOf(globalHeadersSource) > nextConfig.indexOf(gamesHeadersSource)) {
  fail("la regla /games debe ir después de la global para sobrescribir DENY same-origin");
}

// We previously let Vitest collect Playwright tests, and then tried to fix TSX
// parsing with esbuild.jsx, which Vite 8 no longer accepts in ESBuildOptions.
// React TSX tests must use the official React plugin while Next keeps jsx=preserve.
for (const expected of [
  '"e2e/**"',
  'import react from "@vitejs/plugin-react"',
  'plugins: [react()]',
  '"@": fileURLToPath',
]) {
  if (!vitestConfig.includes(expected)) {
    fail(`vitest.config perdió la protección histórica: ${expected}`);
  }
}
if (/esbuild\s*:\s*\{[\s\S]*?jsx\s*:/.test(vitestConfig)) {
  fail("Vitest no puede reintroducir esbuild.jsx con Vite 8; usa @vitejs/plugin-react");
}
if (!playwrightConfig.includes('testDir: "../../tests/e2e"')) {
  fail("Playwright debe quedar aislado en ../../tests/e2e");
}
if (!vitestConfig.includes('setupFiles: ["./src/test/setup.ts"]')) {
  fail("Vitest debe cargar el setup compartido de entorno de tests");
}
if (!testSetup.includes("window.matchMedia")) {
  fail("el setup de jsdom debe definir matchMedia para Mantine");
}
if (sharedUiTest.includes("getByText(formatEUR(")) {
  fail("el test monetario no puede depender del normalizador Unicode de Testing Library");
}
if (!sharedUiTest.includes("container.textContent")) {
  fail(
    "el test monetario debe comparar formatEUR sin normalizar espacios Unicode",
  );
}
if (!densityProvider.includes("useSyncExternalStore")) {
  fail(
    "la densidad debe modelarse como store externo, no hidratarse con setState en effect",
  );
}
if (/useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?setDensity\(/.test(densityProvider)) {
  fail("density-provider no puede reintroducir setDensity síncrono dentro de useEffect");
}

// ESLint --max-warnings=0 previously failed on anonymous default exports in
// config files. Keep named config objects so those warnings cannot return.
if (/export\s+default\s*[\[{]/.test(eslintConfig)) {
  fail("eslint.config debe exportar una variable con nombre");
}
if (/export\s+default\s*\{/.test(stylelintConfig)) {
  fail("stylelint.config debe exportar una variable con nombre");
}

if (!prettierIgnore.includes(".artifacts/")) {
  fail("los artefactos temporales del pipeline deben quedar fuera de Prettier");
}
if (await exists(path.join(root, "public", "f1-package-lock.json"))) {
  fail("el lock bootstrap no debe publicarse bajo public/");
}
if (!prettierIgnore.includes(".vercel/")) {
  fail("Prettier no debe mutar metadatos .vercel creados por la plataforma");
}
if (!prettierIgnore.includes(".artifacts/")) {
  fail("Prettier no debe recorrer reportes ni artefactos del pipeline");
}
if (!prettierIgnore.includes("public/games/**")) {
  fail("Prettier no debe reescribir Denty Games; su integridad se verifica por hash");
}
if (!(await exists("scripts/verify-games-assets.mjs"))) {
  fail("falta el gate de integridad de Denty Games");
}
if (!(await exists("scripts/games/legacy-hashes.json"))) {
  fail("falta el manifiesto SHA-256 de Denty Games");
}
if (/prettier\s+--write/.test(buildCommand) || /npm\s+run\s+format/.test(buildCommand)) {
  fail("el build de entrega no puede autoformatear ni mutar el source");
}
if (pipelineCatalog.includes('description: "Normalize source formatting only for manual Vercel ZIP bootstrap"')) {
  fail("el pipeline de Vercel no puede conservar un stage de autoformateo del source");
}


// Mantine 9 compiled under Next 15 failed because the App Router React bundle did not
// expose React 19.2 APIs used by Mantine (Activity/useEffectEvent). Keep Next 16+ and
// eslint-config-next aligned exactly so that this build-only regression cannot return.
const nextVersion = String(packageJson.dependencies?.next ?? "");
const eslintConfigNextVersion = String(packageJson.devDependencies?.["eslint-config-next"] ?? "");
if (!nextVersion.startsWith("16.")) {
  fail("Mantine 9 en Denty debe mantenerse sobre Next 16.x");
}
if (nextVersion !== eslintConfigNextVersion) {
  fail("next y eslint-config-next deben permanecer alineados exactamente");
}
if (eslintConfig.includes("FlatCompat")) {
  fail("Next 16 debe usar el flat config nativo de eslint-config-next, no FlatCompat");
}
if (!eslintConfig.includes('eslint-config-next/core-web-vitals')) {
  fail("ESLint debe consumir el flat config oficial core-web-vitals de Next 16");
}

// React/Mantine peer mismatch caused ERESOLVE. The deployable gate performs
// the semantic-version comparison; this gate prevents the two escape hatches
// that would make npm accept a broken tree.
const allDependencyVersions = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};
for (const [dependency, version] of Object.entries(allDependencyVersions)) {
  if (typeof version !== "string" || /^[~^*]/.test(version)) {
    fail(`${dependency} debe fijar versión exacta para builds reproducibles`);
  }
}
for (const installScriptDependency of [
  "@parcel/watcher@2.6.0",
  "@swc/core@1.16.2",
  "unrs-resolver@1.12.2",
]) {
  if (packageJson.allowScripts?.[installScriptDependency] !== true) {
    fail(`npm debe aprobar explícitamente el install script de ${installScriptDependency}`);
  }
}

if (!permissionsSource.includes('"ASSISTANT"')) {
  fail("el rol ASSISTANT de Denty 2.3.7 no puede desaparecer");
}
if (!permissionsSource.includes('"users.manage"')) {
  fail("el dominio de permisos debe conservar users.manage para Administración");
}
if (!apiParityScript.includes("legacy-api-routes.json")) {
  fail("el preflight debe conservar el manifiesto verificable de rutas legacy");
}
if (!proxyPolicy.includes('kind !== "server_only"')) {
  fail("el BFF debe excluir las rutas clasificadas como server_only");
}
if (packageJson.dependencies?.["@tanstack/react-query"] !== "5.103.1") {
  fail("TanStack Query debe permanecer fijado en 5.103.1 durante F4");
}

if (!authProxy.includes('"/app/:path*"')) {
  fail("Next Proxy debe proteger explícitamente todas las rutas /app");
}
if (!authProxy.includes('"/patient/:path*"') || !authProxy.includes("canAccessPatient")) {
  fail("Next Proxy debe proteger el portal /patient con autorización por paciente");
}
if (!authProxy.includes('NEXT_PUBLIC_DEMO_MODE === "true"')) {
  fail("el bypass de autenticación solo puede existir bajo demo mode explícito");
}
if (!authProxy.includes('"/api/auth/session"')) {
  fail("el Proxy debe validar la cookie contra la sesión real del backend");
}
if (!authProxy.includes("decideStaffRouteAccess")) {
  fail("el Proxy debe reutilizar la política de permisos del dominio");
}
if (loginPage.includes("Entrar en modo demo")) {
  fail("la página de login no puede exponer un bypass demo incondicional");
}
if (!loginForm.includes("demoMode ?")) {
  fail("el acceso demo del formulario debe depender del flag demoMode explícito");
}
if (!loginForm.includes("getBrowserApi().auth") && !loginForm.includes("api.auth.login")) {
  fail("el formulario de acceso debe autenticar contra Denty API real");
}

if (await exists("src/features/voice/voice-router.ts")) {
  const voiceRouter = await read("src/features/voice/voice-router.ts");
  if (voiceRouter.includes("juan-perez")) {
    fail("el Voice Router no puede volver a un paciente demo hardcodeado");
  }
}

console.log("Historical regression gate OK: fallos conocidos de Vercel bloqueados.");
