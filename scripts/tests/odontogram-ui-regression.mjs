import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspace = readFileSync("src/features/odontogram/odontogram-workspace.tsx", "utf8");
const tabs = readFileSync("src/features/odontogram/clinical-tabs.tsx", "utf8");
const css = readFileSync("src/features/odontogram/odontogram.module.css", "utf8");
const sharedCss = readFileSync("src/shared/ui/parity.module.css", "utf8");
const agenda = readFileSync("src/features/agenda/agenda-page.tsx", "utf8");
const tasks = readFileSync("src/features/parity/tasks-page.tsx", "utf8");
const laboratory = readFileSync("src/features/parity/modules/laboratory-module.tsx", "utf8");
const geometry = readFileSync("src/shared/odontogram/tooth-geometry.ts", "utf8");

// Surfaces are edited on the classic five-area map (outer square, inner square
// and diagonals), outside any crown clip, so every area keeps its full size.
assert.equal(
  workspace.includes("clipPath"),
  false,
  "Las superficies no deben recortarse con la silueta de la corona.",
);
assert.match(
  workspace,
  /className=\{styles\.surfaceMap\}/,
  "Cada diente debe tener su mapa de cinco caras.",
);
assert.match(
  workspace,
  /\["top", "left", "center", "right", "bottom"\]/,
  "El mapa debe tener cinco áreas delimitadas.",
);
assert.match(
  workspace,
  /aria-label=\{`Diente \$\{tooth\} superficie/,
  "Cada cara debe tener nombre accesible.",
);
assert.match(
  geometry,
  /mesialOnRight = \[1, 4, 5, 8\]\.includes\(quadrant\)/,
  "Mesial debe mirar a la línea media en cada cuadrante (también en temporales).",
);
assert.match(
  css,
  /\.surfaceMapArea\s*\{[^}]*pointer-events:\s*all/s,
  "Las áreas del mapa deben capturar el toque de forma explícita.",
);

assert.match(
  tabs,
  /INFINITE_TAB_COPIES/,
  "El selector clínico debe duplicar ciclos para desplazamiento infinito.",
);
assert.match(
  tabs,
  /Odontograma anterior/,
  "La rueda debe permitir avanzar hacia atrás sin límite.",
);
assert.match(
  tabs,
  /Odontograma siguiente/,
  "La rueda debe permitir avanzar hacia delante sin límite.",
);
assert.match(
  tabs,
  /onScroll=\{handleInfiniteScroll\}/,
  "La rueda debe recentrarse al desplazarse.",
);
assert.match(css, /\.clinicalWheel\s*\{/, "Debe existir el contenedor visual de rueda horizontal.");
assert.match(
  css,
  /scroll-snap-type:\s*x mandatory/,
  "La rueda debe usar ajuste horizontal por elementos.",
);
assert.match(
  css,
  /white-space:\s*nowrap/,
  "Los nombres de odontograma deben mostrarse completos en una línea.",
);

assert.match(
  sharedCss,
  /\.bluePerimeterRunner::after\s*\{/,
  "El recorrido azul debe existir como patrón visual compartido.",
);
assert.match(
  sharedCss,
  /animation:\s*dentyPerimeterRunner\s+5\.2s\s+linear\s+infinite/,
  "La línea azul compartida debe recorrer el perímetro de forma cíclica y estable.",
);
assert.match(
  sharedCss,
  /prefers-reduced-motion:\s*reduce/,
  "La animación compartida debe respetar reducción de movimiento.",
);
for (const [source, label] of [
  [workspace, "odontograma"],
  [agenda, "agenda"],
  [tasks, "tareas"],
  [laboratory, "laboratorio"],
]) {
  assert.match(
    source,
    /bluePerimeterRunner/,
    `El módulo de ${label} debe usar el recorrido azul compartido.`,
  );
}

console.log("odontogram-ui-regression: ok");
