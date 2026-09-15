import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('apps/legacy-preview/index.html', 'utf8');
const shell = fs.readFileSync('apps/web/src/lib/legacy-shell.ts', 'utf8');

for (const [name, source] of [['legacy index', html], ['next shell', shell]]) {
  const flow = source.indexOf('FLUJO CL');
  const settings = source.indexOf('AJUSTES');
  assert.ok(flow > 0, `${name}: el menu debe tener seccion de flujo clinico`);
  assert.ok(settings > 0, `${name}: el menu debe tener seccion de ajustes`);
  assert.ok(flow < settings, `${name}: el flujo clinico debe aparecer antes que ajustes`);
  assert.match(source, /data-go=\\?"patients\\?"/, `${name}: el menu principal debe incluir pacientes`);
  assert.match(source, /data-go=\\?"agenda\\?"/, `${name}: el menu principal debe incluir agenda`);
  assert.match(source, /data-go=\\?"settings\\?" data-panel=\\?"clinic\\?"/, `${name}: ajustes debe conservar acceso a clinica`);
  assert.match(source, /data-go=\\?"settings\\?" data-panel=\\?"users\\?"/, `${name}: ajustes debe conservar usuarios y acceso`);
}

assert.match(shell, /Men\u00fa/, 'next shell: el menu debe mostrar acentos correctamente');
assert.match(shell, /Cl\u00ednica y ajustes/, 'next shell: ajustes debe mostrar textos legibles');
assert.match(shell, /Pr\u00f3ximas mejoras/, 'next shell: flujo clinico debe mostrar textos legibles');
assert.doesNotMatch(shell, /MenÃ|ClÃ|PrÃ|Ã¢|Ã°|\?/u, 'next shell: no debe contener texto mojibake ni signos de reemplazo');
assert.doesNotMatch(shell, /\uFFFD/, 'next shell: no debe contener caracteres de reemplazo');

console.log('verify_settings_menu_order: OK');
