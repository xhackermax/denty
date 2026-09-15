import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import {
  DB_KEY, PREVIOUS_KEYS, defaultDb, migrateDb, createPatient, ensureOdontogram, markArcadeMissing,
  setToothLegendState, legendVariant, legendLabel, legendStateText, legendNextIndex,
  statusTone, normalizeSurfaceForTooth, ODONTO_LEGEND_CYCLES, ODONTO_LEGEND_MAIN, ODONTO_LEGEND_META
} from './logic.js';

const root = new URL('.', import.meta.url);
const html = readFileSync(new URL('./index.html', root), 'utf8');
const app = readFileSync(new URL('./app.js', root), 'utf8');
const css = readFileSync(new URL('./styles.css', root), 'utf8');
const manifest = readFileSync(new URL('./manifest.webmanifest', root), 'utf8');
const tests = [];
function test(name, fn){ tests.push([name, fn]); }

function names(xs){ return xs.map(x=>x.name||x.title).filter(Boolean); }
function byName(xs, name){ return xs.find(x=>String(x.name||x.title).toLowerCase()===name.toLowerCase()); }

test('version 0.5 uses isolated storage and migrates from 0.4', () => {
  assert.equal(DB_KEY, 'denty_web_vercel_preview_0_5_denty_apk_catalog');
  assert.ok(PREVIOUS_KEYS.includes('denty_web_vercel_preview_0_4_odonto_apk_like'));
});

test('real APK logo is packaged and referenced by html and manifest', () => {
  const logoUrl = new URL('./denty-logo.png', root);
  assert.ok(statSync(logoUrl).size > 100000, 'expected extracted APK logo, not tiny recreated logo');
  const sha = createHash('sha256').update(readFileSync(logoUrl)).digest('hex');
  assert.equal(sha, 'e4efa2a6e26e19b70c9d0418a429dba8bc9b8c1bda964843e861ac26aec6be83');
  assert.ok(html.includes('src="/denty-logo.png"') || html.includes("src='denty-logo.png'"));
  assert.ok(manifest.includes('denty-logo.png'));
});

test('default database imports Denty APK doctors, sites and consent templates', () => {
  const db = defaultDb();
  assert.deepEqual(names(db.employees).slice(0,3), ['Dr. Máximo','Dr. Isaac','Dra. Seneida']);
  assert.deepEqual(names(db.sites), ['Avenida Navarra 17, Zaragoza','Paseo Damas','Cariñena']);
  for (const consent of ['Consentimiento protésico','Consentimiento ortodóncico','Consentimiento odontopediátrico','Consentimiento cirugía de implantes','Consentimiento quirúrgico','Consentimiento estético']) {
    assert.ok(names(db.consents).includes(consent), `missing ${consent}`);
  }
});

test('default database imports Denty treatment catalog with prices', () => {
  const db = defaultDb();
  assert.ok(db.procedures.length >= 40, 'expected base procedures plus implant/prosthetic tariff procedures');
  assert.equal(byName(db.procedures, 'Guía quirúrgica').price, 150);
  assert.equal(byName(db.procedures, 'Multi-Unit recto / angulado').price, 100);
  assert.equal(byName(db.procedures, 'Ti-base').price, 100);
  assert.equal(byName(db.procedures, 'Pilar personalizado mecanizado').price, 150);
  assert.equal(byName(db.procedures, 'Tornillo protésico').price, 25);
  assert.equal(byName(db.procedures, 'Corona provisional sobre implante').price, 100);
  assert.equal(byName(db.procedures, 'Essix provisional implantológico').price, 150);
  assert.equal(byName(db.procedures, 'Corona definitiva sobre implante').price, 400);
  assert.equal(byName(db.procedures, 'Sobredentadura Locator').price, 600);
});

test('migration seeds missing Denty catalogs without destroying user edits', () => {
  const migrated = migrateDb({
    version:'0.4',
    patients:[{id:1,first_name:'Juan'}],
    employees:[{id:99,name:'Dra. Personal',role:'odontóloga',active:true,color:'#123456'}],
    procedures:[{id:50,name:'Guía quirúrgica',category:'Cirugía',price:999,color:'#000000',icon:'G'}],
    consents:[{id:60,title:'Consentimiento propio',version:2,text:'Texto propio'}],
    sites:[{id:70,name:'Sede propia',active:true}]
  });
  assert.ok(names(migrated.employees).includes('Dra. Personal'));
  assert.ok(names(migrated.employees).includes('Dr. Isaac'));
  assert.ok(names(migrated.sites).includes('Sede propia'));
  assert.ok(names(migrated.sites).includes('Cariñena'));
  assert.equal(byName(migrated.procedures, 'Guía quirúrgica').price, 999, 'manual tariff must not be overwritten');
  assert.ok(byName(migrated.procedures, 'Corona definitiva sobre implante'));
  assert.ok(names(migrated.consents).includes('Consentimiento propio'));
  assert.ok(names(migrated.consents).includes('Consentimiento estético'));
});

test('legend metadata makes each clinical icon and application target explicit', () => {
  assert.equal(ODONTO_LEGEND_META.filling.applies, 'surface');
  assert.equal(ODONTO_LEGEND_META.caries.applies, 'surface');
  assert.equal(ODONTO_LEGEND_META.implant.applies, 'tooth');
  assert.equal(ODONTO_LEGEND_META.implant.icon, 'implant-thread');
  assert.equal(ODONTO_LEGEND_META.endo.icon, 'root-canal');
  assert.deepEqual(ODONTO_LEGEND_META.crown.steps, ['Correcto','Insatisfactorio','Pendiente']);
  assert.match(ODONTO_LEGEND_META.missing.help, /diente completo/i);
});

test('legend cycles mirror Denty APK correct-bad-pending states', () => {
  assert.deepEqual(ODONTO_LEGEND_CYCLES.filling, ['filling','filling_bad','filling_pending']);
  assert.deepEqual(ODONTO_LEGEND_CYCLES.crown, ['crown','crown_bad','crown_pending']);
  assert.deepEqual(ODONTO_LEGEND_CYCLES.endo, ['endo','endo_bad','endo_indicated']);
  assert.deepEqual(ODONTO_LEGEND_CYCLES.implant, ['implant','implant_review','implant_indicated']);
  assert.equal(legendVariant('implant',1), 'implant_review');
  assert.equal(legendStateText('implant',1), 'A revisar');
  assert.match(legendLabel('endo',2), /indicada/i);
  assert.equal(legendNextIndex('crown',2), 0);
});

test('legend main includes APK-visible clinical tools', () => {
  for (const base of ['caries','filling','crown','endo','post','implant','prosthesis','removable','healthy','missing','extraction']) {
    assert.ok(ODONTO_LEGEND_MAIN.includes(base), `missing ${base}`);
  }
});

test('surface codes apply only to target surface and preserve primary tooth', () => {
  const db = defaultDb();
  const p = createPatient(db, {first_name:'Ana'});
  setToothLegendState(db, p.id, '16', 'filling_bad', 'O');
  const od = ensureOdontogram(db,p.id);
  assert.equal(od['16'].status, 'healthy');
  assert.equal(od['16'].surfaces.O, 'filling_bad');
  assert.equal(Object.keys(od['16'].surfaces).length, 1);
});

test('anterior teeth normalize O to I for incisal surface', () => {
  assert.equal(normalizeSurfaceForTooth('11','O'), 'I');
  const db = defaultDb(); const p = createPatient(db, {first_name:'Luis'});
  setToothLegendState(db, p.id, '11', 'caries', 'O');
  assert.equal(ensureOdontogram(db,p.id)['11'].surfaces.I, 'caries');
});

test('whole tooth states use stable color grammar', () => {
  assert.equal(statusTone('crown'), 'blue');
  assert.equal(statusTone('crown_bad'), 'blue-red');
  assert.equal(statusTone('crown_pending'), 'red');
  assert.equal(statusTone('healthy'), 'green');
  assert.equal(statusTone('missing'), 'missing');
});

test('arcade missing clears surfaces to avoid contradictory chart data', () => {
  const db = defaultDb(); const p = createPatient(db, {first_name:'Rosa'});
  setToothLegendState(db,p.id,'18','filling','O');
  markArcadeMissing(db,p.id,'superior');
  const od = ensureOdontogram(db,p.id);
  assert.equal(od['18'].status, 'missing');
  assert.deepEqual(od['18'].surfaces, {});
  assert.equal(od['28'].status, 'missing');
});

test('web app has clearer APK-style odontogram legend and catalog settings views', () => {
  assert.ok(app.includes('clinical-legend-card'));
  assert.ok(app.includes('legend-clinical-icon'));
  assert.ok(app.includes('next-state-dots'));
  assert.ok(app.includes('settingsCatalogList'));
  assert.ok(app.includes('db.sites'));
  assert.ok(app.includes('price'));
  assert.ok(css.includes('DENTY 0.5 LEGEND CATALOG APK LOGO'));
  assert.ok(css.includes('.legend-clinical-icon'));
});

test('html keeps vercel static entry points', () => {
  assert.ok(html.includes('app.js'));
  assert.ok(statSync(new URL('./vercel.json', root)).isFile());
});

let passed = 0;
for (const [name, fn] of tests) {
  try { await fn(); console.log(`✓ ${name}`); passed++; }
  catch (err) { console.error(`✗ ${name}\n  ${err.stack || err}`); process.exitCode = 1; }
}
console.log(`${passed}/${tests.length} tests passed`);
