import assert from 'node:assert/strict';
import { resolveSyncConflict } from '../../src/domain/sync/conflict-resolution.ts';
import { makeIdempotencyKey, shouldProcessEvent } from '../../src/domain/integrations/idempotency.ts';
import { toFhirDocumentReference, toFhirAuditEvent } from '../../src/domain/interoperability/fhir-r5.ts';
import { buildRecallCampaign } from '../../src/domain/communications/recall-campaign.ts';

assert.equal(resolveSyncConflict({local:{version:2,updatedAt:'2026-09-27T10:00:00Z'},remote:{version:3,updatedAt:'2026-09-27T09:00:00Z'}}).winner,'remote');
const key=makeIdempotencyKey('payment.webhook','evt_1'); assert.equal(key,makeIdempotencyKey('payment.webhook','evt_1'));
assert.equal(shouldProcessEvent(key,new Set()),true); assert.equal(shouldProcessEvent(key,new Set([key])),false);
const doc=toFhirDocumentReference({id:'d1',patientId:'p1',url:'urn:denty:d1',contentType:'application/pdf',createdAt:'2026-09-27T10:00:00Z',title:'Consentimiento'});
assert.equal(doc.resourceType,'DocumentReference'); assert.equal(doc.subject.reference,'Patient/p1');
const audit=toFhirAuditEvent({id:'a1',action:'R',recorded:'2026-09-27T10:00:00Z',patientId:'p1',agentId:'u1'}); assert.equal(audit.resourceType,'AuditEvent');
const campaign=buildRecallCampaign([{patientId:'p1',dueAt:'2026-09-28T10:00:00Z',channel:'email'}], '2026-09-27T10:00:00Z'); assert.equal(campaign.jobs.length,1);
console.log('P4 contract: OK');
