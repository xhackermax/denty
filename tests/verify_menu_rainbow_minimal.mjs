import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const css = readFileSync(new URL('../apps/legacy-preview/styles/styles.css', import.meta.url), 'utf8');

assert.match(css, /Menu rainbow minimal system/, 'debe existir la capa de menú minimalista arcoíris');
assert.match(css, /\.drawer-nav button\{[^}]*font-size:15px[^}]*font-weight:650/s, 'el menú lateral debe usar tipografía compacta de 15px');
assert.match(css, /\.drawer h2\{[^}]*font-size:30px/s, 'el título Menú debe reducirse a 30px');
assert.match(css, /\.drawer-section\{[^}]*font-size:11px/s, 'los separadores de sección deben ser discretos');
for (const color of ['#9a6700','#4d7c0f','#047857','#0e7490','#175cd3','#4338ca','#6d28d9']) {
  assert.ok(css.toLowerCase().includes(color), `falta color accesible ${color} en la secuencia`);
}
assert.match(css, /\.bottom-nav button\.active\{background:#f4f4f5;color:#111827/, 'el activo inferior debe ser neutro, no un bloque negro');
assert.match(css, /\.patient-portal-nav button\.active\{background:#f4f4f5;color:#111827/, 'el activo del portal paciente debe ser neutro y minimalista');
assert.match(css, /@media\(max-width:440px\)[\s\S]*\.drawer-nav button\{font-size:14px/s, 'en móvil el menú debe compactarse a 14px');
console.log('verify_menu_rainbow_minimal: ok');
