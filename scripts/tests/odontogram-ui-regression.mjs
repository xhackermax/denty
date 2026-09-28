import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workspace = readFileSync('src/features/odontogram/odontogram-workspace.tsx', 'utf8');
const tabs = readFileSync('src/features/odontogram/clinical-tabs.tsx', 'utf8');
const css = readFileSync('src/features/odontogram/odontogram.module.css', 'utf8');

const clippedGroupStart = workspace.indexOf('<g clipPath={`url(#${clipId})`}>');
assert.notEqual(clippedGroupStart, -1, 'Debe existir el grupo SVG recortado de superficies visibles.');
const clippedGroupEnd = workspace.indexOf('</g>', clippedGroupStart);
assert.notEqual(clippedGroupEnd, -1, 'El grupo SVG recortado debe cerrarse.');
const clippedGroup = workspace.slice(clippedGroupStart, clippedGroupEnd);
assert.equal(
  clippedGroup.includes('surfaceHitbox'),
  false,
  'Las zonas táctiles M/D no deben estar dentro del clip de corona, porque el clip recorta su área útil.',
);

const afterClip = workspace.slice(clippedGroupEnd, clippedGroupEnd + 2200);
assert.match(afterClip, /className=\{styles\.surfaceHitbox\}/, 'Deben existir hitboxes M/D fuera del clip.');
assert.match(afterClip, /aria-label=\{`Diente \$\{tooth\} superficie/, 'Los hitboxes M/D deben tener nombre accesible.');
assert.match(workspace, /position\s*<=\s*5/, 'Las piezas 1–5 deben recibir hitboxes proximales ampliados.');
assert.match(workspace, /SURFACE_HITBOX_PATHS\.expanded/, 'Debe existir una geometría táctil ampliada para piezas 1–5.');

assert.match(tabs, /INFINITE_TAB_COPIES/, 'El selector clínico debe duplicar ciclos para desplazamiento infinito.');
assert.match(tabs, /Odontograma anterior/, 'La rueda debe permitir avanzar hacia atrás sin límite.');
assert.match(tabs, /Odontograma siguiente/, 'La rueda debe permitir avanzar hacia delante sin límite.');
assert.match(tabs, /onScroll=\{handleInfiniteScroll\}/, 'La rueda debe recentrarse al desplazarse.');
assert.match(css, /\.surfaceHitbox\s*\{[^}]*pointer-events:\s*all/s, 'Los hitboxes M/D deben capturar el toque de forma explícita.');
assert.match(css, /\.clinicalWheel\s*\{/, 'Debe existir el contenedor visual de rueda horizontal.');
assert.match(css, /scroll-snap-type:\s*x mandatory/, 'La rueda debe usar ajuste horizontal por elementos.');
assert.match(css, /white-space:\s*nowrap/, 'Los nombres de odontograma deben mostrarse completos en una línea.');

console.log('odontogram-ui-regression: ok');
