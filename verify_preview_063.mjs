import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { DB_KEY, PREVIOUS_KEYS, defaultDb, ensureOdontogram } from './logic.js';
const root = new URL('.', import.meta.url);
const app = readFileSync(new URL('./app.js', root), 'utf8');
const css = readFileSync(new URL('./styles.css', root), 'utf8');
const html = readFileSync(new URL('./index.html', root), 'utf8');
let passed=0, total=0;
function t(name, fn){ total++; try{ fn(); console.log('✓', name); passed++; } catch(e){ console.error('✗', name, '\n ', e.message); process.exitCode=1; }}

t('0.6.3 has isolated db key and migration chain', ()=>{
  assert.equal(DB_KEY, 'denty_web_vercel_preview_0_6_3_split_perio');
  assert.ok(PREVIOUS_KEYS.includes('denty_web_vercel_preview_0_6_2_perio_position'));
  assert.equal(defaultDb().version, '0.6.3');
});

t('render includes split modes', ()=>{
  assert.ok(app.includes('data-odonto-mode="restorative"'));
  assert.ok(app.includes('data-odonto-mode="periodontal"'));
  assert.ok(app.includes('function renderPeriodontalMode'));
  assert.ok(app.includes('function renderRestorativeMode'));
});

t('restorative mode removed surface letters beneath teeth', ()=>{
  assert.ok(!app.includes('<small class="surface-label-mini">M V O/I D L/P</small>'));
});

t('periodontal mode includes 6 probing sites around selected tooth', ()=>{
  for(const k of ['probe-mv','probe-v','probe-dv','probe-ml','probe-lp','probe-dl']) assert.ok(app.includes(k));
  assert.ok(app.includes('Sondaje · 6 puntos'));
  assert.ok(app.includes('Retracción gingival'));
});

t('odontogram records still include periodontal blocks', ()=>{
  const od = ensureOdontogram(defaultDb(), 1);
  for(const key of ['mv','v','dv','ml','lp','dl']) assert.ok(key in od['11'].periodontal.depths);
});

t('styles include split periodontal layout', ()=>{
  for(const cls of ['.odonto-switch','.probe-ring','.probe-site','.perio-arch-grid']) assert.ok(css.includes(cls));
  assert.ok(html.includes('Denty Web Preview 0.6.3'));
});
console.log(`${passed}/${total} tests passed`);
