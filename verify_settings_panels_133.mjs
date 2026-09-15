import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const app = readFileSync('./app.js','utf8');
const logic = readFileSync('./logic.js','utf8');
const html = readFileSync('./index.html','utf8');
let passed=0,total=0;
function test(name, fn){ total++; try{ fn(); console.log('✓', name); passed++; } catch(e){ console.error('✗', name, '\n  '+e.message); process.exitCode=1; }}

test('sidebar menu panels have matching settings cards', ()=>{
  for (const panel of ['mcp','docs','labs']) {
    assert.ok(html.includes(`data-panel="${panel}"`), `menu links ${panel}`);
    assert.match(app, new RegExp(`\\['${panel}'[,\\]]`), `settingsCards includes ${panel}`);
  }
});

test('labelForPanel names mcp docs and labs', ()=>{
  assert.ok(app.includes("mcp:'MCP / IA externa'"));
  assert.ok(app.includes("docs:'Documentación para pacientes'"));
  assert.ok(app.includes("labs:'Laboratorios'"));
});

test('settingsCatalogList renders labs mcp and docs bodies', ()=>{
  assert.ok(app.includes("if(kind==='labs')"));
  assert.ok(app.includes("if(kind==='mcp')"));
  assert.ok(app.includes("if(kind==='docs')"));
  assert.ok(app.includes('Trabajos protésicos activos'));
  assert.ok(app.includes('Documentos para entregar al paciente'));
  assert.ok(app.includes('IA externa opcional'));
});

test('version is 1.3.3 panel fix and migrates from 1.3', ()=>{
  assert.ok(logic.includes("denty_web_vercel_preview_1_3_3_settings_panels"));
  assert.ok(logic.includes("denty_web_vercel_preview_1_3_clinical_nlu"));
  assert.ok(logic.includes("version:'1.3.3'"));
});
console.log(`${passed}/${total} tests passed`);
