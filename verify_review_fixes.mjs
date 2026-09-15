import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

assert.match(app, /function toast\(text\)\{\s*const el=\$\('#toast'\);\s*if\(!el\) return;/, 'toast debe tolerar que #toast no exista');
assert.match(app, /function bindClick\(selector, handler\)/, 'debe existir helper null-safe para clicks estáticos');
assert.match(app, /function bindTop\(\)[\s\S]*bindClick\('#drawerOpen',openDrawer\)/, 'bindTop debe usar bindings null-safe');
assert.match(app, /function openDrawer\(\)\{[\s\S]*if\(drawer\)/, 'openDrawer debe tolerar DOM parcial');
assert.match(app, /function closeDrawer\(\)\{[\s\S]*if\(drawer\)/, 'closeDrawer debe tolerar DOM parcial');
assert.doesNotMatch(html, /data-denty-gateway-bootstrap/, 'index.html no debe duplicar la lógica del gateway');
assert.doesNotMatch(html, /const choose=\(type\)=>/, 'index.html no debe mantener un segundo estado selected del gateway');
assert.match(css, /\.signature-pad\{[^}]*width:100%[^}]*max-width:100%[^}]*height:clamp\(/, 'firma debe adaptarse al ancho disponible');
assert.match(app, /function prepareSignatureCanvas\(canvas\)/, 'firma debe ajustar resolución al tamaño CSS/DPR');
assert.match(app, /devicePixelRatio/, 'firma debe contemplar pantallas de alta densidad');
assert.match(app, /async function requestExternalVoiceInterpret\(text, source='typed'\)/, 'el fallback de voz externo no puede desaparecer al editar funciones vecinas');

console.log('verify_review_fixes: OK');
