import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const css = readFileSync(new URL('../apps/legacy-preview/styles/styles.css', import.meta.url), 'utf8');

assert.match(css, /Cool navigation system/, 'debe existir la capa de menu minimalista sin amarillos');
assert.match(css, /\.drawer-nav button\{[^}]*font-size:15px[^}]*font-weight:650/s, 'el menu lateral debe usar tipografia compacta de 15px');
assert.match(css, /\.drawer h2\{[^}]*font-size:30px/s, 'el titulo Menu debe reducirse a 30px');
assert.match(css, /\.drawer-section\{[^}]*font-size:11px/s, 'los separadores de seccion deben ser discretos');

for (const color of ['#334155', '#047857', '#0e7490', '#175cd3', '#4338ca', '#6d28d9', '#475569']) {
  assert.ok(css.toLowerCase().includes(color), `falta color frio o neutral ${color} en la secuencia`);
}

for (const forbidden of ['#9a6700', '#4d7c0f', '#f4c95d', '#a3e635']) {
  assert.ok(!css.toLowerCase().includes(forbidden), `el menu no debe conservar amarillo o similar ${forbidden}`);
}

assert.match(css, /\.bottom-nav button\.active\{background:#f4f4f5;color:#111827/, 'el activo inferior debe ser neutro, no un bloque negro');
assert.match(css, /\.patient-portal-nav button\.active\{background:#f4f4f5;color:#111827/, 'el activo del portal paciente debe ser neutro y minimalista');
assert.match(css, /@media\(max-width:440px\)[\s\S]*\.drawer-nav button\{font-size:14px/s, 'en movil el menu debe compactarse a 14px');

console.log('verify_menu_rainbow_minimal: ok');
