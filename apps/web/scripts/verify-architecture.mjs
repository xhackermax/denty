import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);
const LOCAL_STORAGE_ALLOWLIST = new Set([
  path.normalize("src/shared/ui/density-provider.tsx"),
  path.normalize("src/shared/ui/shared-ui.test.tsx"),
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

function fail(file, message) {
  throw new Error(`${relative(file)}: ${message}`);
}

const files = await listFiles(SRC);

for (const file of files) {
  const source = await readFile(file, "utf8");
  const rel = relative(file);

  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (line.length > 100) {
      fail(file, `La línea ${index + 1} supera 100 caracteres (${line.length})`);
    }
  }

  for (const rule of forbiddenPatterns) {
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
  const isDatesModule = rel === path.normalize("src/domain/dates.ts");
  if (isDomainFile && !isDatesModule && /new\s+Date\s*\(/.test(source)) {
    fail(file, "Las fechas de negocio deben pasar por domain/dates.ts (Europe/Madrid)");
  }
}

console.log("Architecture gate OK");
