import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const css = readFileSync(new URL('../apps/legacy-preview/styles/styles.css', import.meta.url), 'utf8');
const start = css.indexOf('/* Cool navigation system');
assert.ok(start >= 0, 'Debe existir el bloque del sistema cromatico frio de menus');

const block = css.slice(start, css.indexOf('.bottom-nav{', start));
for (const forbidden of ['#b42318', '#b54708', '#ff8a80', '#ffb36b', '#9a6700', '#4d7c0f', '#f4c95d', '#a3e635']) {
  assert.ok(!block.toLowerCase().includes(forbidden), `La paleta de menus no debe contener tono calido/amarillo ${forbidden}`);
}

for (const expected of ['#334155', '#047857', '#0e7490', '#175cd3', '#4338ca', '#6d28d9', '#475569']) {
  assert.ok(block.toLowerCase().includes(expected), `Falta el tono frio/neutral ${expected} en la paleta de menus`);
}

console.log('verify_menu_palette_no_red: ok');
