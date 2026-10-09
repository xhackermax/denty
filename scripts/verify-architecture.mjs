import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);
const LOCAL_STORAGE_ALLOWLIST = new Set([
  path.normalize("src/features/agenda/agenda-page.tsx"),
  path.normalize("src/features/parity/modules/documents-module.tsx"),
  path.normalize("src/features/parity/modules/laboratory-module.tsx"),
  path.normalize("src/features/parity/modules/settings-module.tsx"),
  path.normalize("src/app/_components/shell/time-color-scheme-provider.tsx"),
  path.normalize("src/app/_components/shell/time-color-scheme-provider.test.tsx"),
  path.normalize("src/app/layout.tsx"),
  path.normalize("src/shared/ui/density-provider.tsx"),
  path.normalize("src/shared/browser/browser-storage.ts"),
  path.normalize("src/shared/browser/browser-storage.test.ts"),
  // Remembers the site the reception desk works at (per-browser preference).
  path.normalize("src/shared/tenancy/active-context.tsx"),
  path.normalize("src/shared/ui/shared-ui.test.tsx"),
]);
const INLINE_STYLE_ALLOWLIST = new Set([
  path.normalize("src/features/parity/modules/documents-module.tsx"),
  path.normalize("src/features/parity/modules/finance-charts.tsx"),
  path.normalize("src/features/parity/modules/finance-module.tsx"),
]);
const INLINE_SCRIPT_ALLOWLIST = new Set([
  // Runs before hydration to prevent a wrong-theme flash for the Madrid schedule.
  path.normalize("src/app/layout.tsx"),
]);
const BUSINESS_DATE_MODULES = new Set([
  path.normalize("src/domain/dates.ts"),
  path.normalize("src/domain/appearance-schedule.ts"),
]);

const forbiddenPatterns = [
  { pattern: /!important/g, message: "No se permite !important" },
  { pattern: /style=\{\{/g, message: "No se permiten estilos inline estáticos" },
  {
    pattern: /window\.(?:prompt|confirm|alert)\s*\(/g,
    message: "No se permiten diálogos window.*",
  },
  { pattern: /location\.href\s*=/g, message: "La navegación interna debe usar Next Router/Link" },
  {
    pattern: /dangerouslySetInnerHTML/g,
    message: "dangerouslySetInnerHTML requiere una excepción documentada",
  },
];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolute)));
      continue;
    }
    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }

  return files;
}

function relative(file) {
  return path.normalize(path.relative(ROOT, file));
}

const violations = [];

function fail(file, message) {
  violations.push(`${relative(file)}: ${message}`);
}

const files = await listFiles(SRC);

for (const file of files) {
  const source = await readFile(file, "utf8");
  const rel = relative(file);

  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (line.length > 600) {
      fail(file, `La línea ${index + 1} supera 600 caracteres (${line.length})`);
    }
  }

  for (const rule of forbiddenPatterns) {
    if (rule.message.includes("inline") && INLINE_STYLE_ALLOWLIST.has(rel)) {
      continue;
    }
    if (rule.message.includes("dangerouslySetInnerHTML") && INLINE_SCRIPT_ALLOWLIST.has(rel)) {
      continue;
    }
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(source)) {
      fail(file, rule.message);
    }
  }

  if (
    !LOCAL_STORAGE_ALLOWLIST.has(rel) &&
    /(?:localStorage|sessionStorage|indexedDB)/.test(source)
  ) {
    fail(file, "Almacenamiento persistente del navegador no permitido fuera de la allowlist de UI");
  }

  const isDomainFile = rel.startsWith(path.normalize("src/domain/"));
  if (isDomainFile && !BUSINESS_DATE_MODULES.has(rel) && /new\s+Date\s*\(/.test(source)) {
    fail(file, "Las fechas de negocio deben pasar por domain/dates.ts (Europe/Madrid)");
  }
}

if (violations.length > 0) {
  console.error(`Architecture gate FAILED: ${violations.length} infracción(es) detectada(s):`);
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log("Architecture gate OK");
}
