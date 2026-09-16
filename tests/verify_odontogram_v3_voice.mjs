import assert from 'node:assert/strict';
import { defaultDb, odontogramEntitiesForPatient } from '../apps/legacy-preview/logic.js';
import { parseVoiceCommand, validateStructuredCommand, executeVoiceCommand } from '../apps/legacy-preview/voice-router.js';

const db = defaultDb();
db.patients.push({ id: 1, first_name: 'Ana', last_name: 'Voz', archived: false });

const bridgeCommand = parseVoiceCommand('puente de 13 a 16 con pilares 13 y 16 y ponticos 14 15');
assert.equal(bridgeCommand.intent, 'odontogram.entity.create');
assert.equal(bridgeCommand.slots.type, 'bridge');
assert.deepEqual(bridgeCommand.slots.teeth, ['13','14','15','16']);
assert.equal(validateStructuredCommand(bridgeCommand).ok, true);
const bridgeResult = executeVoiceCommand(db, bridgeCommand, { patientId: 1 });
assert.equal(bridgeResult.handled, true);
assert.equal(odontogramEntitiesForPatient(db, 1, { type: 'bridge' }).length, 1);

const implantCommand = parseVoiceCommand('implante 36 colocado falta pilar y corona');
assert.equal(implantCommand.intent, 'odontogram.entity.create');
assert.equal(implantCommand.slots.type, 'implant_restoration');
const implantResult = executeVoiceCommand(db, implantCommand, { patientId: 1 });
assert.equal(implantResult.entity.type, 'implant_restoration');
assert.ok(implantResult.createdClinicalItems.length >= 3);

const removableCommand = parseVoiceCommand('protesis removible superior parcial');
assert.equal(removableCommand.intent, 'odontogram.entity.create');
assert.equal(removableCommand.slots.type, 'removable_prosthesis');
assert.equal(removableCommand.slots.arch, 'upper');

const orthoCommand = parseVoiceCommand('ortodoncia con alineadores superior e inferior');
assert.equal(orthoCommand.slots.type, 'orthodontics');
assert.equal(orthoCommand.slots.arch, 'both');

const pediatricCommand = parseVoiceCommand('pulpotomia 75');
assert.equal(pediatricCommand.slots.type, 'pediatric');
assert.deepEqual(pediatricCommand.slots.teeth, ['75']);

console.log('verify_odontogram_v3_voice: OK');
