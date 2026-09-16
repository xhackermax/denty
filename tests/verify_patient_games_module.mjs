import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const legacyApp = readFileSync('apps/legacy-preview/app.js', 'utf8');
const legacyCss = readFileSync('apps/legacy-preview/styles/styles.css', 'utf8');
const syncScript = readFileSync('apps/web/scripts/sync-legacy-assets.mjs', 'utf8');

for (const file of [
  'apps/legacy-preview/games/index.html',
  'apps/legacy-preview/games/styles.css',
  'apps/legacy-preview/games/denty-games.tokens.css',
  'apps/legacy-preview/games/js/app.js',
  'apps/legacy-preview/games/js/core/shared.js',
  'apps/legacy-preview/games/js/games/denty-run.js',
  'apps/legacy-preview/games/js/games/air-hockey.js',
]) {
  assert.equal(existsSync(file), true, `falta asset de juegos: ${file}`);
}

assert.match(legacyApp, /function renderPatientGamesModule\(/, 'debe existir un modulo embebido de juegos para paciente');
assert.match(legacyApp, /\['juegos','Juegos'\]/, 'Denty Paciente debe exponer la pestana Juegos');
assert.match(legacyApp, /tab==='juegos'\)\s*body=renderPatientGamesModule\(\{portal:true\}\)/, 'Denty Paciente debe renderizar los juegos');
assert.match(legacyApp, /patientTab.*'juegos'|juegos.*patientTab/s, 'la ficha clinica del paciente debe poder abrir Juegos');
assert.match(legacyApp, /iframe[^`]+src="\/games\/index\.html"/s, 'los juegos deben abrirse dentro de Denty desde /games/index.html');
assert.match(legacyApp, /sandbox="allow-scripts allow-same-origin"/, 'el iframe debe estar aislado pero permitir records locales');
assert.match(legacyCss, /\.patient-games-frame/, 'debe existir estilo propio para el marco de juegos');
assert.match(syncScript, /'games'/, 'la sincronizacion web debe copiar la carpeta games al public');

const gamesIndex = readFileSync('apps/legacy-preview/games/index.html', 'utf8');
assert.match(gamesIndex, /<title>Denty Games/, 'la app de juegos debe conservar su identidad');
assert.match(gamesIndex, /js\/games\/snake\.js/, 'la app de juegos debe cargar sus motores modulares');

console.log('verify_patient_games_module: OK');
