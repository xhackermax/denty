import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('apps/legacy-preview/app.js', 'utf8');

assert.match(app, /function renderPatientPortal/, 'debe existir un portal paciente separado');
assert.match(app, /Denty Paciente/, 'el portal debe identificarse como cuenta paciente');
assert.match(app, /Buenos dias|Buenos d.as|Hola/, 'debe saludar al paciente en lenguaje natural');
assert.match(app, /Tu tratamiento ahora/, 'debe mostrar la tarjeta principal de tratamiento');
assert.match(app, /Mi economia del tratamiento/, 'debe separar dinero y tratamiento futuro');
assert.match(app, /Necesito cambiarla/, 'debe permitir iniciar cambio de cita');
assert.match(app, /Impacto estimado|Impacto temporal/, 'debe explicar impacto temporal de mover citas');
assert.match(app, /Por que me recomiendan esto|Por qu. me recomiendan esto/, 'debe explicar el presupuesto en lenguaje humano');
assert.match(app, /Que tengo que hacer yo|Qu. tengo que hacer yo/, 'debe mostrar responsabilidades del paciente');
assert.match(app, /Mi sonrisa/, 'debe incluir evolucion visual/simulacion');
assert.match(app, /Smilecloud|ArchForm/, 'debe preparar enlaces a herramientas externas');
assert.doesNotMatch(app, /btn\.disabled=selectedPortal==='patient'/, 'la cuenta paciente no debe estar bloqueada');
assert.match(app, /state\.view='patientPortal'/, 'Cuenta Paciente debe entrar en el portal separado');
assert.match(app, /else if\(state\.view==='patientPortal'\) main\.innerHTML=renderPatientPortal\(\)/, 'render principal debe servir el portal');
assert.match(app, /patient-portal/, 'debe existir URL local directa para comprobar el portal paciente');

console.log('verify_patient_portal: OK');
