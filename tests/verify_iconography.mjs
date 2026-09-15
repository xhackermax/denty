import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../apps/legacy-preview/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../apps/legacy-preview/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../apps/legacy-preview/styles/styles.css', import.meta.url), 'utf8');

assert.match(app, /const ICON_MARKUP = \{/, 'Debe existir un mapa de iconos SVG en app.js');
assert.match(app, /function hydrateIcons\(root=document\)/, 'Debe hidratarse la iconografía declarativa');
assert.match(app, /function iconLabel\(/, 'Debe existir un helper para icono \+ etiqueta');
assert.match(html, /data-icon-name="today"/, 'La navegación inferior debe usar iconos SVG declarativos');
assert.match(html, /data-icon-name="admin"/, 'El selector de cuentas debe usar iconos SVG declarativos');
assert.match(html, /data-icon-name="doctors"/, 'El menú lateral debe usar iconos SVG declarativos');
assert.match(app, /renderPatientPortalNav\(\)[\s\S]*iconLabel\(id,label,\{stacked:true\}\)/, 'Las pestañas de Denty Paciente deben usar iconos consistentes');
assert.match(css, /Icon system refresh/, 'El CSS debe incluir la capa visual de la nueva iconografía');
console.log('verify_iconography: ok');
