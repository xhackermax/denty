import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('apps/legacy-preview/app.js', 'utf8');

assert.match(app, /tratamiento/, 'la ficha debe incluir la pestaña tratamiento');
assert.match(app, /function renderTreatmentControlPanel/, 'debe existir el panel de control del tratamiento');
assert.match(app, /Tu tratamiento ahora/, 'el panel debe priorizar una tarjeta de estado actual');
assert.match(app, /treatment-progress-bar/, 'debe mostrar progreso visual');
assert.match(app, /impacto de retrasar/i, 'debe explicar impacto de retrasar citas');
assert.match(app, /Ya realizado/, 'debe separar tratamiento realizado');
assert.match(app, /Tratamiento futuro/, 'debe separar tratamiento futuro');
assert.match(app, /Próxima decisión|Proxima decision/, 'debe mostrar decision pendiente');
assert.match(app, /timeline-phase/, 'debe mostrar fases del tratamiento');
assert.match(app, /data-ptab="agenda"/, 'debe enlazar con agenda');
assert.match(app, /data-ptab="presupuestos"/, 'debe enlazar con presupuestos');
assert.match(app, /data-ptab="archivos"/, 'debe enlazar con archivos clinicos');
assert.match(app, /applyPreviewRouteFromQuery/, 'debe permitir abrir el panel directamente desde una URL local');
assert.match(app, /treatment-panel/, 'la URL local de prueba debe abrir la pestaña tratamiento');

console.log('verify_patient_treatment_panel: OK');
