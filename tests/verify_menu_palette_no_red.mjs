import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const css = readFileSync(new URL('../apps/legacy-preview/styles/styles.css', import.meta.url), 'utf8');
const start = css.indexOf('/* Menu rainbow minimal system */');
assert.ok(start >= 0, 'Debe existir el bloque del sistema cromático de menús');
const block = css.slice(start);
for (const forbidden of ['#b42318','#b54708','#ff8a80','#ffb36b']) {
  assert.ok(!block.toLowerCase().includes(forbidden), `La paleta de menús no debe contener el tono cálido/rojizo ${forbidden}`);
}
for (const expected of ['#9a6700','#4d7c0f','#047857','#0e7490','#175cd3','#4338ca','#6d28d9']) {
  assert.ok(block.toLowerCase().includes(expected), `Falta el tono frío/neutral ${expected} en la paleta de menús`);
}
console.log('verify_menu_palette_no_red: ok');
