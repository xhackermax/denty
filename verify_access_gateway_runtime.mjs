import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html','utf8');
const app = fs.readFileSync('app.js','utf8');
const launcher = fs.readFileSync('ABRIR-DENTY.bat','utf8');

const checks = [
  ['gateway has inline fallback binding independent of app module', () => assert.match(html, /data-denty-gateway-bootstrap/)],
  ['fallback binds account buttons', () => assert.ok(html.includes("document.querySelectorAll('[data-account-type]')"))],
  ['fallback can open selected access stage', () => assert.match(html, /accountAccessStage[\s\S]{0,2500}hidden\s*=\s*false/)],
  ['app does not directly depend on sessionStorage for gateway clicks', () => {
    const block = app.slice(app.indexOf('function showAccountChooser'), app.indexOf('function bindTop'));
    assert.ok(!/sessionStorage\.(?:setItem|removeItem)/.test(block), 'gateway still calls sessionStorage directly');
  }],
  ['gateway storage helper is guarded', () => assert.match(app, /function safePortalStorage[\s\S]{0,500}try\s*\{/)],
  ['gateway explains when the main module did not initialize', () => assert.ok(html.includes('Denty necesita iniciar el servidor local'))],
  ['Windows launcher starts local server', () => { assert.ok(launcher.includes('python server.py')); assert.ok(launcher.includes('http://127.0.0.1:8765')); }]
];

let passed=0;
for (const [name, fn] of checks) {
  try { fn(); passed++; console.log('✓', name); }
  catch (err) { console.error('✗', name); console.error(err.message); process.exitCode=1; }
}
console.log(`${passed}/${checks.length} runtime gateway checks passed`);
if (process.exitCode) process.exit(process.exitCode);
